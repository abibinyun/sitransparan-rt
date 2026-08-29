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

type KarangTarunaHandler struct {
	usecase    domain.KarangTarunaUsecase
	tenantRepo domain.TenantRepository
	baseDomain string
}

func NewKarangTarunaHandler(usecase domain.KarangTarunaUsecase, tenantRepo domain.TenantRepository, baseDomain string) *KarangTarunaHandler {
	return &KarangTarunaHandler{
		usecase:    usecase,
		tenantRepo: tenantRepo,
		baseDomain: baseDomain,
	}
}

func (h *KarangTarunaHandler) RegisterRoutes(mux *http.ServeMux, tenantMw func(http.Handler) http.Handler, authMw func(http.Handler) http.Handler) {
	// Public endpoint portal transparansi
	mux.HandleFunc("GET /api/v1/t/{slug}/karang-taruna", h.handlePublicStructure)

	// Protected endpoints (/api/v1/karang-taruna/*)
	protected := authMw(tenantMw(http.HandlerFunc(h.handleProtected)))
	mux.Handle("/api/v1/karang-taruna", protected)
	mux.Handle("/api/v1/karang-taruna/", protected)
}

func (h *KarangTarunaHandler) handlePublicStructure(w http.ResponseWriter, r *http.Request) {
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
		members = []*domain.KarangTarunaMember{}
	}

	// Proyeksi aman tanpa NIK & nomor pribadi jika tidak publik
	type publicMemberView struct {
		Name        string  `json:"name"`
		Role        string  `json:"role"`
		Section     *string `json:"section,omitempty"`
		CustomTitle *string `json:"custom_title,omitempty"`
		PhotoURL    *string `json:"photo_url,omitempty"`
	}
	var pubList []publicMemberView
	for _, m := range members {
		pubList = append(pubList, publicMemberView{
			Name:        m.ResidentName,
			Role:        m.Role,
			Section:     m.Section,
			CustomTitle: m.CustomTitle,
			PhotoURL:    m.PhotoURL,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"period": map[string]interface{}{
			"name":       activePeriod.Name,
			"start_date": activePeriod.StartDate,
			"end_date":   activePeriod.EndDate,
			"sk_number":  activePeriod.SKNumber,
		},
		"members": pubList,
	})
}

func (h *KarangTarunaHandler) handleProtected(w http.ResponseWriter, r *http.Request) {
	tenant := middleware.GetTenantFromContext(r.Context())
	if tenant == nil {
		http.Error(w, `{"error":"tenant context missing"}`, http.StatusBadRequest)
		return
	}
	userID := middleware.GetUserIDFromContext(r.Context())
	role := middleware.GetRoleFromContext(r.Context())

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/karang-taruna")
	path = strings.TrimPrefix(path, "/")
	parts := strings.Split(path, "/")

	// 1. /periods
	if parts[0] == "periods" {
		if len(parts) == 1 {
			switch r.Method {
			case http.MethodGet:
				status := r.URL.Query().Get("status")
				list, err := h.usecase.ListPeriods(r.Context(), tenant.ID, status)
				if err != nil {
					http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
					return
				}
				w.Header().Set("Content-Type", "application/json")
				_ = json.NewEncoder(w).Encode(map[string]interface{}{"data": list})
			case http.MethodPost:
				if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
					http.Error(w, `{"error":"forbidden: admin only"}`, http.StatusForbidden)
					return
				}
				var req struct {
					Name      string `json:"name"`
					StartDate string `json:"start_date"`
					EndDate   string `json:"end_date"`
					Status    string `json:"status"`
					SKNumber  string `json:"sk_number"`
				}
				if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
					http.Error(w, `{"error":"invalid payload"}`, http.StatusBadRequest)
					return
				}
				sDate, _ := time.Parse("2006-01-02", req.StartDate)
				eDate, _ := time.Parse("2006-01-02", req.EndDate)
				period := &domain.KarangTarunaPeriod{
					Name:      req.Name,
					StartDate: sDate,
					EndDate:   eDate,
					Status:    req.Status,
					SKNumber:  &req.SKNumber,
					CreatedBy: &userID,
				}
				if err := h.usecase.CreatePeriod(r.Context(), tenant.ID, period); err != nil {
					http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
					return
				}
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusCreated)
				_ = json.NewEncoder(w).Encode(period)
			default:
				http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			}
			return
		}

		if len(parts) >= 2 && parts[1] == "active" && r.Method == http.MethodGet {
			period, err := h.usecase.GetActivePeriod(r.Context(), tenant.ID)
			if err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusNotFound)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(period)
			return
		}

		periodID, err := uuid.Parse(parts[1])
		if err != nil {
			http.Error(w, `{"error":"invalid period id"}`, http.StatusBadRequest)
			return
		}

		if len(parts) == 3 && parts[2] == "config" && r.Method == http.MethodPut {
			if !h.usecase.CanManage(r.Context(), tenant.ID, userID, role) {
				http.Error(w, `{"error":"forbidden: ketua or admin only"}`, http.StatusForbidden)
				return
			}
			var cfgReq struct {
				AllowedRoles    []string `json:"allowed_roles"`
				AllowedSections []string `json:"allowed_sections"`
			}
			if err := json.NewDecoder(r.Body).Decode(&cfgReq); err != nil {
				http.Error(w, `{"error":"invalid payload"}`, http.StatusBadRequest)
				return
			}
			if err := h.usecase.UpdateConfig(r.Context(), tenant.ID, periodID, cfgReq.AllowedRoles, cfgReq.AllowedSections); err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]string{"message": "config updated"})
			return
		}

		if len(parts) == 2 {
			switch r.Method {
			case http.MethodGet:
				p, err := h.usecase.GetPeriod(r.Context(), tenant.ID, periodID)
				if err != nil {
					http.Error(w, `{"error":"period not found"}`, http.StatusNotFound)
					return
				}
				w.Header().Set("Content-Type", "application/json")
				_ = json.NewEncoder(w).Encode(p)
			case http.MethodPut:
				if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
					http.Error(w, `{"error":"forbidden: admin only"}`, http.StatusForbidden)
					return
				}
				var req struct {
					Name      string `json:"name"`
					StartDate string `json:"start_date"`
					EndDate   string `json:"end_date"`
					Status    string `json:"status"`
					SKNumber  string `json:"sk_number"`
				}
				if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
					http.Error(w, `{"error":"invalid payload"}`, http.StatusBadRequest)
					return
				}
				sDate, _ := time.Parse("2006-01-02", req.StartDate)
				eDate, _ := time.Parse("2006-01-02", req.EndDate)
				period := &domain.KarangTarunaPeriod{
					ID:        periodID,
					Name:      req.Name,
					StartDate: sDate,
					EndDate:   eDate,
					Status:    req.Status,
					SKNumber:  &req.SKNumber,
				}
				if err := h.usecase.UpdatePeriod(r.Context(), tenant.ID, period); err != nil {
					http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
					return
				}
				w.Header().Set("Content-Type", "application/json")
				_ = json.NewEncoder(w).Encode(period)
			default:
				http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			}
			return
		}
	}

	// 2. /members
	if parts[0] == "members" {
		if len(parts) == 1 {
			switch r.Method {
			case http.MethodGet:
				pIDStr := r.URL.Query().Get("period_id")
				var pID uuid.UUID
				if pIDStr != "" {
					pID, _ = uuid.Parse(pIDStr)
				}
				if pID == uuid.Nil {
					// Fallback ke active period
					active, _ := h.usecase.GetActivePeriod(r.Context(), tenant.ID)
					if active != nil {
						pID = active.ID
					}
				}
				if pID == uuid.Nil {
					w.Header().Set("Content-Type", "application/json")
					_ = json.NewEncoder(w).Encode(map[string]interface{}{"data": []*domain.KarangTarunaMember{}})
					return
				}
				section := r.URL.Query().Get("section")
				mRole := r.URL.Query().Get("role")
				status := r.URL.Query().Get("status")
				list, err := h.usecase.ListMembers(r.Context(), tenant.ID, pID, section, mRole, status)
				if err != nil {
					http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
					return
				}
				w.Header().Set("Content-Type", "application/json")
				_ = json.NewEncoder(w).Encode(map[string]interface{}{"data": list})
			case http.MethodPost:
				if !h.usecase.CanManage(r.Context(), tenant.ID, userID, role) {
					http.Error(w, `{"error":"forbidden: ketua or admin only"}`, http.StatusForbidden)
					return
				}
				var req struct {
					PeriodID      string `json:"period_id"`
					ResidentID    string `json:"resident_id"`
					Role          string `json:"role"`
					Section       string `json:"section"`
					CustomTitle   string `json:"custom_title"`
					PhoneOverride string `json:"phone_override"`
					PhotoURL      string `json:"photo_url"`
					Status        string `json:"status"`
				}
				if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
					http.Error(w, `{"error":"invalid payload"}`, http.StatusBadRequest)
					return
				}
				pID, errP := uuid.Parse(req.PeriodID)
				rID, errR := uuid.Parse(req.ResidentID)
				if errP != nil || errR != nil {
					http.Error(w, `{"error":"invalid period_id or resident_id"}`, http.StatusBadRequest)
					return
				}
				member := &domain.KarangTarunaMember{
					PeriodID:      pID,
					ResidentID:    rID,
					Role:          req.Role,
					Section:       &req.Section,
					CustomTitle:   &req.CustomTitle,
					PhoneOverride: &req.PhoneOverride,
					PhotoURL:      &req.PhotoURL,
					Status:        req.Status,
				}
				if err := h.usecase.AddMember(r.Context(), tenant.ID, member); err != nil {
					http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
					return
				}
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusCreated)
				_ = json.NewEncoder(w).Encode(member)
			default:
				http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			}
			return
		}

		if len(parts) == 2 {
			mID, err := uuid.Parse(parts[1])
			if err != nil {
				http.Error(w, `{"error":"invalid member id"}`, http.StatusBadRequest)
				return
			}
			switch r.Method {
			case http.MethodPut:
				if !h.usecase.CanManage(r.Context(), tenant.ID, userID, role) {
					http.Error(w, `{"error":"forbidden: ketua or admin only"}`, http.StatusForbidden)
					return
				}
				var req struct {
					PeriodID      string `json:"period_id"`
					Role          string `json:"role"`
					Section       string `json:"section"`
					CustomTitle   string `json:"custom_title"`
					PhoneOverride string `json:"phone_override"`
					PhotoURL      string `json:"photo_url"`
					Status        string `json:"status"`
				}
				if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
					http.Error(w, `{"error":"invalid payload"}`, http.StatusBadRequest)
					return
				}
				pID, _ := uuid.Parse(req.PeriodID)
				member := &domain.KarangTarunaMember{
					ID:            mID,
					PeriodID:      pID,
					Role:          req.Role,
					Section:       &req.Section,
					CustomTitle:   &req.CustomTitle,
					PhoneOverride: &req.PhoneOverride,
					PhotoURL:      &req.PhotoURL,
					Status:        req.Status,
				}
				if err := h.usecase.UpdateMember(r.Context(), tenant.ID, member); err != nil {
					http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
					return
				}
				w.Header().Set("Content-Type", "application/json")
				_ = json.NewEncoder(w).Encode(member)
			case http.MethodDelete:
				if !h.usecase.CanManage(r.Context(), tenant.ID, userID, role) {
					http.Error(w, `{"error":"forbidden: ketua or admin only"}`, http.StatusForbidden)
					return
				}
				if err := h.usecase.DeleteMember(r.Context(), tenant.ID, mID); err != nil {
					http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
					return
				}
				w.Header().Set("Content-Type", "application/json")
				_ = json.NewEncoder(w).Encode(map[string]string{"message": "member removed"})
			default:
				http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			}
			return
		}
	}

	http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
}
