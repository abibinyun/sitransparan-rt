package http

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"
	"github.com/google/uuid"
)

type RTStructureHandler struct {
	usecase    domain.RTStructureUsecase
	tenantRepo domain.TenantRepository
	baseDomain string
}

func NewRTStructureHandler(usecase domain.RTStructureUsecase, tenantRepo domain.TenantRepository, baseDomain string) *RTStructureHandler {
	return &RTStructureHandler{
		usecase:    usecase,
		tenantRepo: tenantRepo,
		baseDomain: baseDomain,
	}
}

func (h *RTStructureHandler) RegisterRoutes(mux *http.ServeMux, tenantMw func(http.Handler) http.Handler, authMw func(http.Handler) http.Handler) {
	// Public endpoint portal transparansi
	mux.HandleFunc("GET /api/v1/t/{slug}/rt-structure", h.handlePublicStructure)

	// Protected endpoints (/api/v1/rt-structure/*)
	protected := authMw(tenantMw(http.HandlerFunc(h.handleProtected)))
	mux.Handle("/api/v1/rt-structure", protected)
	mux.Handle("/api/v1/rt-structure/", protected)
}

func (h *RTStructureHandler) handlePublicStructure(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	if hostSlug, matched := middleware.HostnameSlug(r.Host, h.baseDomain); matched && hostSlug != slug {
		http.Error(w, `{"error":"tenant not found"}`, http.StatusNotFound)
		return
	}
	tenant, err := h.tenantRepo.GetBySlug(r.Context(), slug)
	if err != nil || tenant == nil || !tenant.IsActive() {
		http.Error(w, `{"error":"tenant not found"}`, http.StatusNotFound)
		return
	}
	ctx := context.WithValue(r.Context(), domain.TenantContextKey, tenant)

	activePeriod, err := h.usecase.GetActivePeriod(ctx, tenant.ID)
	if err != nil || activePeriod == nil {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"data": nil, "message": "Belum ada periode kepengurusan aktif"})
		return
	}

	members, err := h.usecase.ListMembers(ctx, tenant.ID, activePeriod.ID, "", "", "aktif")
	if err != nil {
		members = []*domain.RTMember{}
	}

	type publicMemberView struct {
		Name        string  `json:"name"`
		Role        string  `json:"role"`
		Section     *string `json:"section,omitempty"`
		CustomTitle *string `json:"custom_title,omitempty"`
		PhotoURL    *string `json:"photo_url,omitempty"`
		Phone       *string `json:"phone,omitempty"`
	}
	publicMembers := make([]publicMemberView, len(members))
	for i, m := range members {
		phone := m.PhoneOverride
		if phone == nil || *phone == "" {
			phone = m.Phone
		}
		publicMembers[i] = publicMemberView{
			Name:        m.ResidentName,
			Role:        m.Role,
			Section:     m.Section,
			CustomTitle: m.CustomTitle,
			PhotoURL:    m.PhotoURL,
			Phone:       phone,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"period":  activePeriod,
		"members": publicMembers,
	})
}

func (h *RTStructureHandler) handleProtected(w http.ResponseWriter, r *http.Request) {
	tenant := middleware.GetTenantFromContext(r.Context())
	if tenant == nil {
		http.Error(w, `{"error":"tenant context missing"}`, http.StatusBadRequest)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/rt-structure")
	path = strings.TrimPrefix(path, "/")
	parts := strings.Split(path, "/")

	switch {
	case path == "periods" || path == "periods/":
		if r.Method == http.MethodGet {
			h.listPeriods(w, r, tenant.ID)
		} else if r.Method == http.MethodPost {
			h.createPeriod(w, r, tenant.ID)
		} else {
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
	case len(parts) == 2 && parts[0] == "periods":
		periodID, err := uuid.Parse(parts[1])
		if err != nil {
			http.Error(w, `{"error":"invalid period id"}`, http.StatusBadRequest)
			return
		}
		if r.Method == http.MethodGet {
			h.getPeriod(w, r, tenant.ID, periodID)
		} else if r.Method == http.MethodPut {
			h.updatePeriod(w, r, tenant.ID, periodID)
		} else {
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
	case path == "members" || path == "members/":
		if r.Method == http.MethodGet {
			h.listMembers(w, r, tenant.ID)
		} else if r.Method == http.MethodPost {
			h.addMember(w, r, tenant.ID)
		} else {
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
	case len(parts) == 2 && parts[0] == "members":
		memberID, err := uuid.Parse(parts[1])
		if err != nil {
			http.Error(w, `{"error":"invalid member id"}`, http.StatusBadRequest)
			return
		}
		if r.Method == http.MethodPut {
			h.updateMember(w, r, tenant.ID, memberID)
		} else if r.Method == http.MethodDelete {
			h.deleteMember(w, r, tenant.ID, memberID)
		} else {
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
	default:
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
	}
}

func (h *RTStructureHandler) listPeriods(w http.ResponseWriter, r *http.Request, tenantID uuid.UUID) {
	status := r.URL.Query().Get("status")
	periods, err := h.usecase.ListPeriods(r.Context(), tenantID, status)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}
	if periods == nil {
		periods = []*domain.RTPeriod{}
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{"data": periods})
}

func (h *RTStructureHandler) createPeriod(w http.ResponseWriter, r *http.Request, tenantID uuid.UUID) {
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
		return
	}
	var req struct {
		Name      string `json:"name"`
		StartDate string `json:"start_date"`
		EndDate   string `json:"end_date"`
		Status    string `json:"status"`
		SKNumber  *string `json:"sk_number,omitempty"`
		SKFileURL *string `json:"sk_file_url,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}

	start, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		http.Error(w, `{"error":"invalid start_date format, use YYYY-MM-DD"}`, http.StatusBadRequest)
		return
	}
	end, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		http.Error(w, `{"error":"invalid end_date format, use YYYY-MM-DD"}`, http.StatusBadRequest)
		return
	}

	userID := middleware.GetUserIDFromContext(r.Context())
	p := &domain.RTPeriod{
		Name:      req.Name,
		StartDate: start,
		EndDate:   end,
		Status:    req.Status,
		SKNumber:  req.SKNumber,
		SKFileURL: req.SKFileURL,
		CreatedBy: &userID,
	}

	if err := h.usecase.CreatePeriod(r.Context(), tenantID, p); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(p)
}

func (h *RTStructureHandler) getPeriod(w http.ResponseWriter, r *http.Request, tenantID, periodID uuid.UUID) {
	p, err := h.usecase.GetPeriod(r.Context(), tenantID, periodID)
	if err != nil {
		http.Error(w, `{"error":"period not found"}`, http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(p)
}

func (h *RTStructureHandler) updatePeriod(w http.ResponseWriter, r *http.Request, tenantID, periodID uuid.UUID) {
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
		return
	}
	var req struct {
		Name      string `json:"name"`
		StartDate string `json:"start_date"`
		EndDate   string `json:"end_date"`
		Status    string `json:"status"`
		SKNumber  *string `json:"sk_number,omitempty"`
		SKFileURL *string `json:"sk_file_url,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}
	start, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		http.Error(w, `{"error":"invalid start_date format, use YYYY-MM-DD"}`, http.StatusBadRequest)
		return
	}
	end, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		http.Error(w, `{"error":"invalid end_date format, use YYYY-MM-DD"}`, http.StatusBadRequest)
		return
	}

	p := &domain.RTPeriod{
		ID:        periodID,
		Name:      req.Name,
		StartDate: start,
		EndDate:   end,
		Status:    req.Status,
		SKNumber:  req.SKNumber,
		SKFileURL: req.SKFileURL,
	}

	if err := h.usecase.UpdatePeriod(r.Context(), tenantID, p); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(p)
}

func (h *RTStructureHandler) listMembers(w http.ResponseWriter, r *http.Request, tenantID uuid.UUID) {
	periodIDStr := r.URL.Query().Get("period_id")
	if periodIDStr == "" {
		http.Error(w, `{"error":"period_id query parameter is required"}`, http.StatusBadRequest)
		return
	}
	periodID, err := uuid.Parse(periodIDStr)
	if err != nil {
		http.Error(w, `{"error":"invalid period_id"}`, http.StatusBadRequest)
		return
	}

	section := r.URL.Query().Get("section")
	role := r.URL.Query().Get("role")
	status := r.URL.Query().Get("status")

	members, err := h.usecase.ListMembers(r.Context(), tenantID, periodID, section, role, status)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}
	if members == nil {
		members = []*domain.RTMember{}
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{"data": members})
}

func (h *RTStructureHandler) addMember(w http.ResponseWriter, r *http.Request, tenantID uuid.UUID) {
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
		return
	}
	var req struct {
		PeriodID      uuid.UUID `json:"period_id"`
		ResidentID    uuid.UUID `json:"resident_id"`
		Role          string    `json:"role"`
		Section       *string   `json:"section,omitempty"`
		CustomTitle   *string   `json:"custom_title,omitempty"`
		PhoneOverride *string   `json:"phone_override,omitempty"`
		PhotoURL      *string   `json:"photo_url,omitempty"`
		Status        string    `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}

	m := &domain.RTMember{
		PeriodID:      req.PeriodID,
		ResidentID:    req.ResidentID,
		Role:          req.Role,
		Section:       req.Section,
		CustomTitle:   req.CustomTitle,
		PhoneOverride: req.PhoneOverride,
		PhotoURL:      req.PhotoURL,
		Status:        req.Status,
	}

	if err := h.usecase.AddMember(r.Context(), tenantID, m); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(m)
}

func (h *RTStructureHandler) updateMember(w http.ResponseWriter, r *http.Request, tenantID, memberID uuid.UUID) {
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
		return
	}
	var req struct {
		Role          string  `json:"role"`
		Section       *string `json:"section,omitempty"`
		CustomTitle   *string `json:"custom_title,omitempty"`
		PhoneOverride *string `json:"phone_override,omitempty"`
		PhotoURL      *string `json:"photo_url,omitempty"`
		Status        string  `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}

	m := &domain.RTMember{
		ID:            memberID,
		Role:          req.Role,
		Section:       req.Section,
		CustomTitle:   req.CustomTitle,
		PhoneOverride: req.PhoneOverride,
		PhotoURL:      req.PhotoURL,
		Status:        req.Status,
	}

	if err := h.usecase.UpdateMember(r.Context(), tenantID, m); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(m)
}

func (h *RTStructureHandler) deleteMember(w http.ResponseWriter, r *http.Request, tenantID, memberID uuid.UUID) {
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
		return
	}
	if err := h.usecase.DeleteMember(r.Context(), tenantID, memberID); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
