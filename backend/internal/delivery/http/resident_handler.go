package http

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"
	"backend/internal/repository"
	"backend/internal/usecase"
	"github.com/google/uuid"
)

type ResidentHandler struct {
	usecase domain.ResidentUsecase
}

func NewResidentHandler(usecase domain.ResidentUsecase) *ResidentHandler {
	return &ResidentHandler{usecase: usecase}
}

func (h *ResidentHandler) RegisterRoutes(mux *http.ServeMux, tenantMw func(http.Handler) http.Handler, authMw func(http.Handler) http.Handler) {
	protected := http.HandlerFunc(h.handleResidents)
	mux.Handle("/api/v1/residents", authMw(tenantMw(protected)))
	mux.Handle("/api/v1/residents/", authMw(tenantMw(protected)))
	mux.Handle("/api/v1/residents/upload", authMw(tenantMw(http.HandlerFunc(h.handleUpload))))
}

func (h *ResidentHandler) handleResidents(w http.ResponseWriter, r *http.Request) {
	tenant := middleware.GetTenantFromContext(r.Context())
	if tenant == nil {
		http.Error(w, `{"error":"tenant context missing"}`, http.StatusBadRequest)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/residents")
	path = strings.TrimPrefix(path, "/")

	if path == "" {
		switch r.Method {
		case http.MethodGet:
			h.list(w, r, tenant.ID)
		case http.MethodPost:
			h.create(w, r, tenant.ID)
		default:
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
		return
	}

	parts := strings.Split(path, "/")
	id, err := uuid.Parse(parts[0])
	if err != nil {
		http.Error(w, `{"error":"invalid resident id"}`, http.StatusBadRequest)
		return
	}

	if len(parts) == 1 {
		switch r.Method {
		case http.MethodGet:
			h.getByID(w, r, tenant.ID, id)
		case http.MethodPut:
			h.update(w, r, tenant.ID, id)
		case http.MethodDelete:
			h.delete(w, r, tenant.ID, id)
		default:
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
		return
	}

	if len(parts) == 2 && parts[1] == "approve" && r.Method == http.MethodPost {
		h.approve(w, r, tenant.ID, id)
		return
	}

	if len(parts) == 2 && parts[1] == "reject" && r.Method == http.MethodPost {
		h.reject(w, r, tenant.ID, id)
		return
	}

	if len(parts) == 2 && parts[1] == "status" && r.Method == http.MethodPost {
		h.updateStatus(w, r, tenant.ID, id)
		return
	}

	if len(parts) == 2 && parts[1] == "family" && r.Method == http.MethodPost {
		h.addFamilyMember(w, r, tenant.ID, id)
		return
	}

	if len(parts) == 3 && parts[1] == "family" && r.Method == http.MethodPut {
		memberID, err := uuid.Parse(parts[2])
		if err != nil {
			http.Error(w, `{"error":"invalid family member id"}`, http.StatusBadRequest)
			return
		}
		h.updateFamilyMember(w, r, tenant.ID, id, memberID)
		return
	}

	if len(parts) == 3 && parts[1] == "family" && r.Method == http.MethodDelete {
		memberID, err := uuid.Parse(parts[2])
		if err != nil {
			http.Error(w, `{"error":"invalid family member id"}`, http.StatusBadRequest)
			return
		}
		h.removeFamilyMember(w, r, tenant.ID, id, memberID)
		return
	}

	if len(parts) == 4 && parts[1] == "family" && parts[3] == "promote" && r.Method == http.MethodPost {
		memberID, err := uuid.Parse(parts[2])
		if err != nil {
			http.Error(w, `{"error":"invalid family member id"}`, http.StatusBadRequest)
			return
		}
		h.promoteFamilyMember(w, r, tenant.ID, id, memberID)
		return
	}

	http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
}

func (h *ResidentHandler) list(w http.ResponseWriter, r *http.Request, tenantID uuid.UUID) {
	// Resident demographic data (incl. NIK) is admin-managed; residents do not
	// get the tenant population list.
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
		return
	}
	query := r.URL.Query().Get("q")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	if limit <= 0 {
		limit = 10
	}

	var isHead *bool
	if v := r.URL.Query().Get("is_head_of_family"); v != "" {
		b := v == "true"
		isHead = &b
	}

	residents, total, err := h.usecase.List(r.Context(), tenantID, query, isHead, limit, offset)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	if residents == nil {
		residents = []*domain.Resident{}
	}

	resp := map[string]interface{}{
		"data":   residents,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}

func (h *ResidentHandler) create(w http.ResponseWriter, r *http.Request, tenantID uuid.UUID) {
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
		return
	}
	var req domain.Resident
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}

	if err := h.usecase.Create(r.Context(), tenantID, &req); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(req)
}

func (h *ResidentHandler) getByID(w http.ResponseWriter, r *http.Request, tenantID, id uuid.UUID) {
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
		return
	}
	resident, err := h.usecase.GetByID(r.Context(), tenantID, id)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resident)
}

func (h *ResidentHandler) update(w http.ResponseWriter, r *http.Request, tenantID, id uuid.UUID) {
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
		return
	}
	var req domain.Resident
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}

	req.ID = id
	if err := h.usecase.Update(r.Context(), tenantID, &req); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(req)
}

func (h *ResidentHandler) delete(w http.ResponseWriter, r *http.Request, tenantID, id uuid.UUID) {
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
		return
	}
	if err := h.usecase.Delete(r.Context(), tenantID, id); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"message": "deleted"})
}

func (h *ResidentHandler) addFamilyMember(w http.ResponseWriter, r *http.Request, tenantID, residentID uuid.UUID) {
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
		return
	}
	var member domain.FamilyMember
	if err := json.NewDecoder(r.Body).Decode(&member); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}

	member.ResidentID = residentID
	if err := h.usecase.AddFamilyMember(r.Context(), tenantID, &member); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(member)
}

func (h *ResidentHandler) updateFamilyMember(w http.ResponseWriter, r *http.Request, tenantID, residentID, memberID uuid.UUID) {
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
		return
	}
	var member domain.FamilyMember
	if err := json.NewDecoder(r.Body).Decode(&member); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}
	member.ID = memberID
	member.ResidentID = residentID

	if err := h.usecase.UpdateFamilyMember(r.Context(), tenantID, residentID, &member); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			http.Error(w, `{"error":"family member not found"}`, http.StatusNotFound)
			return
		}
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(member)
}

func (h *ResidentHandler) removeFamilyMember(w http.ResponseWriter, r *http.Request, tenantID, residentID, memberID uuid.UUID) {
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
		return
	}
	if err := h.usecase.RemoveFamilyMember(r.Context(), tenantID, residentID, memberID); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"message": "family member removed"})
}

func (h *ResidentHandler) approve(w http.ResponseWriter, r *http.Request, tenantID, id uuid.UUID) {
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
		return
	}
	adminUserID := middleware.GetUserIDFromContext(r.Context())
	if err := h.usecase.Approve(r.Context(), tenantID, id, adminUserID); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"message": "resident approved", "status": "approved"})
}

func (h *ResidentHandler) reject(w http.ResponseWriter, r *http.Request, tenantID, id uuid.UUID) {
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
		return
	}
	adminUserID := middleware.GetUserIDFromContext(r.Context())
	if err := h.usecase.Reject(r.Context(), tenantID, id, adminUserID); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"message": "resident rejected", "status": "rejected"})
}

func (h *ResidentHandler) promoteFamilyMember(w http.ResponseWriter, r *http.Request, tenantID, residentID, memberID uuid.UUID) {
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
		return
	}
	adminUserID := middleware.GetUserIDFromContext(r.Context())
	if err := h.usecase.PromoteFamilyMemberToHead(r.Context(), tenantID, residentID, memberID, adminUserID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			http.Error(w, `{"error":"resident or family member not found"}`, http.StatusNotFound)
			return
		}
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"message": "anggota keluarga berhasil dipromosikan menjadi kepala keluarga",
	})
}

func (h *ResidentHandler) updateStatus(w http.ResponseWriter, r *http.Request, tenantID, id uuid.UUID) {
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
		return
	}
	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}
	adminUserID := middleware.GetUserIDFromContext(r.Context())
	if err := h.usecase.UpdateStatus(r.Context(), tenantID, id, adminUserID, req.Status); err != nil {
		if errors.Is(err, usecase.ErrInvalidInput) {
			http.Error(w, `{"error":"invalid resident status"}`, http.StatusBadRequest)
			return
		}
		if errors.Is(err, repository.ErrNotFound) {
			http.Error(w, `{"error":"resident not found"}`, http.StatusNotFound)
			return
		}
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"message": "resident status updated",
		"status":  req.Status,
	})
}

func (h *ResidentHandler) handleUpload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	limitUploadBody(r)
	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, `{"error":"file is required atau melebihi 5 MB"}`, http.StatusBadRequest)
		return
	}
	defer file.Close()

	if msg := validateUploadFile(header.Filename, header.Header.Get("Content-Type"), header.Size); msg != "" {
		http.Error(w, `{"error":"`+msg+`"}`, http.StatusBadRequest)
		return
	}

	docType := r.FormValue("type")
	if docType == "" {
		docType = "document"
	}

	contentType := header.Header.Get("Content-Type")
	fileURL, err := h.usecase.UploadDocument(r.Context(), docType, header.Filename, file, contentType)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	resp := map[string]string{
		"url":      fileURL,
		"file_url": fileURL,
		"type":     docType,
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}
