package http

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"backend/internal/delivery/http/middleware"
	"backend/internal/usecase"

	"github.com/google/uuid"
)

type AuthHandler struct {
	authUsecase usecase.AuthUsecase
	baseDomain  string
}

func NewAuthHandler(authUsecase usecase.AuthUsecase, baseDomain string) *AuthHandler {
	return &AuthHandler{authUsecase: authUsecase, baseDomain: baseDomain}
}

type loginRequest struct {
	Email    string     `json:"email"`
	Password string     `json:"password"`
	TenantID *uuid.UUID `json:"tenant_id,omitempty"`
}

type loginResponse struct {
	Token string       `json:"token"`
	User  *userDTO     `json:"user"`
}

type userDTO struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Phone     *string   `json:"phone,omitempty"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (h *AuthHandler) GetPublicTenantInfo(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/t/")
	parts := strings.Split(path, "/")
	if len(parts) < 1 || parts[0] == "" {
		http.Error(w, `{"error":"tenant slug missing"}`, http.StatusBadRequest)
		return
	}

	slug := parts[0]

	// Hostname/tenant consistency: when the request arrives on a tenant
	// subdomain of the base domain, the path slug must match the hostname tenant.
	// A hostname that resolves to a different tenant is rejected (404) so the
	// hostname can never select another tenant's public identity.
	if hostSlug, matched := middleware.HostnameSlug(r.Host, h.baseDomain); matched && hostSlug != slug {
		http.Error(w, `{"error":"tenant not found"}`, http.StatusNotFound)
		return
	}

	tenant, err := h.authUsecase.GetTenantBySlug(r.Context(), slug)
	if err != nil || tenant == nil || !tenant.IsActive() {
		http.Error(w, `{"error":"tenant not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data": tenant,
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	token, user, role, err := h.authUsecase.Login(r.Context(), req.Email, req.Password, req.TenantID)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusUnauthorized)
		return
	}

	// The role returned in the response is the role that was actually placed
	// inside the signed JWT (derived from the database mapping). It is never
	// recomputed from the email address.
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(loginResponse{
		Token: token,
		User: &userDTO{
			ID:        user.ID,
			Email:     user.Email,
			Name:      user.Name,
			Phone:     user.Phone,
			Role:      string(role),
			CreatedAt: user.CreatedAt,
			UpdatedAt: user.UpdatedAt,
		},
	})
}

// SwitchTenant re-issues a JWT scoped to a tenant the authenticated user is
// explicitly mapped to. This is the only sanctioned tenant-switching mechanism
// and the backend verifies the mapping server-side.
func (h *AuthHandler) SwitchTenant(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userID := middleware.GetUserIDFromContext(r.Context())
	if userID == uuid.Nil {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var req struct {
		TenantID uuid.UUID `json:"tenant_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	token, user, role, err := h.authUsecase.SwitchTenant(r.Context(), userID, req.TenantID)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusForbidden)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(loginResponse{
		Token: token,
		User: &userDTO{
			ID:        user.ID,
			Email:     user.Email,
			Name:      user.Name,
			Phone:     user.Phone,
			Role:      string(role),
			CreatedAt: user.CreatedAt,
			UpdatedAt: user.UpdatedAt,
		},
	})
}

type registerRequest struct {
	Name     string  `json:"name"`
	Email    string  `json:"email"`
	Password string  `json:"password"`
	Phone    *string `json:"phone,omitempty"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	user, err := h.authUsecase.Register(r.Context(), req.Name, req.Email, req.Password, req.Phone)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(user)
}

func (h *AuthHandler) UserTenants(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r.Context())
	if userID == uuid.Nil {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	tenants, err := h.authUsecase.GetUserTenants(r.Context(), userID)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tenants)
}

func (h *AuthHandler) TenantMe(w http.ResponseWriter, r *http.Request) {
	tenant := middleware.GetTenantFromContext(r.Context())
	if tenant == nil {
		http.Error(w, `{"error":"tenant context not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tenant)
}

type tenantRequest struct {
	Name    string  `json:"name"`
	Slug    string  `json:"slug"`
	Domain  *string `json:"domain,omitempty"`
	LogoURL *string `json:"logo_url,omitempty"`
	Status  *string `json:"status,omitempty"` // 'active' | 'inactive' (optional, update only)
}

func (h *AuthHandler) SuperAdminTenants(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/superadmin/tenants")
	path = strings.TrimPrefix(path, "/")

	switch r.Method {
	case http.MethodGet:
		if path == "" {
			limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
			offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
			tenants, total, err := h.authUsecase.ListTenants(r.Context(), limit, offset)
			if err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"tenants": tenants,
				"total":   total,
			})
			return
		}

		id, err := uuid.Parse(path)
		if err != nil {
			http.Error(w, `{"error":"invalid tenant id"}`, http.StatusBadRequest)
			return
		}

		tenant, err := h.authUsecase.GetTenantByID(r.Context(), id)
		if err != nil {
			http.Error(w, `{"error":"tenant not found"}`, http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(tenant)

	case http.MethodPost:
		var req tenantRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
			return
		}

		tenant, err := h.authUsecase.CreateTenant(r.Context(), req.Name, req.Slug, req.Domain, req.LogoURL)
		if err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(tenant)

	case http.MethodPut:
		id, err := uuid.Parse(path)
		if err != nil {
			http.Error(w, `{"error":"invalid tenant id"}`, http.StatusBadRequest)
			return
		}

		var req tenantRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
			return
		}

		status := ""
		if req.Status != nil {
			status = *req.Status
		}
		tenant, err := h.authUsecase.UpdateTenant(r.Context(), id, req.Name, req.Slug, req.Domain, req.LogoURL, status)
		if err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(tenant)

	case http.MethodDelete:
		id, err := uuid.Parse(path)
		if err != nil {
			http.Error(w, `{"error":"invalid tenant id"}`, http.StatusBadRequest)
			return
		}

		if err := h.authUsecase.DeleteTenant(r.Context(), id); err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
			return
		}

		w.WriteHeader(http.StatusNoContent)

	default:
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
	}
}
