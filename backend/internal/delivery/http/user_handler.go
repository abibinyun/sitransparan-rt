package http

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"
	"backend/internal/usecase"
	"github.com/google/uuid"
)

type UserHandler struct {
	usecase usecase.UserUsecase
}

func NewUserHandler(usecase usecase.UserUsecase) *UserHandler {
	return &UserHandler{usecase: usecase}
}

func (h *UserHandler) RegisterRoutes(mux *http.ServeMux, tenantMw func(http.Handler) http.Handler, authMw func(http.Handler) http.Handler, adminMw func(http.Handler) http.Handler) {
	protected := authMw(adminMw(tenantMw(http.HandlerFunc(h.handleUsers))))
	mux.Handle("/api/v1/users", protected)
	mux.Handle("/api/v1/users/", protected)
}

func (h *UserHandler) handleUsers(w http.ResponseWriter, r *http.Request) {
	callerRole := middleware.GetRoleFromContext(r.Context())
	tenant := middleware.GetTenantFromContext(r.Context())
	if tenant == nil && callerRole != domain.RoleSuperAdmin && callerRole != "SUPER_ADMIN" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "tenant context missing"})
		return
	}

	tenantID := uuid.Nil
	if tenant != nil {
		tenantID = tenant.ID
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/users")
	path = strings.TrimPrefix(path, "/")

	if path == "" {
		switch r.Method {
		case http.MethodGet:
			h.list(w, r, tenantID)
		case http.MethodPost:
			h.create(w, r, tenantID)
		default:
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusMethodNotAllowed)
			json.NewEncoder(w).Encode(map[string]string{"error": "method not allowed"})
		}
		return
	}

	parts := strings.Split(path, "/")
	id, err := uuid.Parse(parts[0])
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid user id"})
		return
	}

	if len(parts) == 1 {
		switch r.Method {
		case http.MethodGet:
			h.getByID(w, r, tenantID, id)
		case http.MethodPut:
			h.update(w, r, tenantID, id)
		case http.MethodDelete:
			h.delete(w, r, tenantID, id)
		default:
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusMethodNotAllowed)
			json.NewEncoder(w).Encode(map[string]string{"error": "method not allowed"})
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotFound)
	json.NewEncoder(w).Encode(map[string]string{"error": "not found"})
}

type createUserReq struct {
	TenantID *uuid.UUID       `json:"tenant_id,omitempty"`
	Name     string          `json:"name"`
	Email    string          `json:"email"`
	Password string          `json:"password"`
	Phone    *string         `json:"phone,omitempty"`
	Role     domain.RoleName `json:"role"`
}

type updateUserReq struct {
	TenantID *uuid.UUID       `json:"tenant_id,omitempty"`
	Name     string          `json:"name"`
	Email    string          `json:"email"`
	Phone    *string         `json:"phone,omitempty"`
	Role     domain.RoleName `json:"role"`
	Password *string         `json:"password,omitempty"`
}

func (h *UserHandler) list(w http.ResponseWriter, r *http.Request, tenantID uuid.UUID) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	if limit <= 0 {
		limit = 10
	}
	if offset < 0 {
		offset = 0
	}

	role := middleware.GetRoleFromContext(r.Context())
	var users []*domain.UserWithRole
	var total int64
	var err error

	if role == domain.RoleSuperAdmin {
		users, total, err = h.usecase.ListAllUsers(r.Context(), limit, offset)
	} else {
		users, total, err = h.usecase.ListUsers(r.Context(), tenantID, limit, offset)
	}

	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data":   users,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

func (h *UserHandler) create(w http.ResponseWriter, r *http.Request, tenantID uuid.UUID) {
	var req createUserReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid JSON body"})
		return
	}

	if req.Name == "" || req.Email == "" || req.Password == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "name, email, and password are required"})
		return
	}

	callerRole := middleware.GetRoleFromContext(r.Context())
	targetTenantID := tenantID
	if (callerRole == domain.RoleSuperAdmin || callerRole == "SUPER_ADMIN") && req.TenantID != nil && *req.TenantID != uuid.Nil {
		targetTenantID = *req.TenantID
	}

	user, err := h.usecase.CreateUser(r.Context(), usecase.CreateUserParam{
		TenantID: targetTenantID,
		Name:     req.Name,
		Email:    req.Email,
		Password: req.Password,
		Phone:    req.Phone,
		Role:     req.Role,
	})
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(user)
}

func (h *UserHandler) getByID(w http.ResponseWriter, r *http.Request, tenantID, id uuid.UUID) {
	user, err := h.usecase.GetUserByID(r.Context(), tenantID, id)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func (h *UserHandler) update(w http.ResponseWriter, r *http.Request, tenantID, id uuid.UUID) {
	var req updateUserReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid JSON body"})
		return
	}

	callerRole := middleware.GetRoleFromContext(r.Context())
	targetTenantID := tenantID
	if (callerRole == domain.RoleSuperAdmin || callerRole == "SUPER_ADMIN") && req.TenantID != nil && *req.TenantID != uuid.Nil {
		targetTenantID = *req.TenantID
	}

	user, err := h.usecase.UpdateUser(r.Context(), usecase.UpdateUserParam{
		TenantID: targetTenantID,
		UserID:   id,
		Name:     req.Name,
		Email:    req.Email,
		Phone:    req.Phone,
		Role:     req.Role,
		Password: req.Password,
	})
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func (h *UserHandler) delete(w http.ResponseWriter, r *http.Request, tenantID, id uuid.UUID) {
	if err := h.usecase.DeleteUser(r.Context(), tenantID, id); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "user deleted successfully"})
}
