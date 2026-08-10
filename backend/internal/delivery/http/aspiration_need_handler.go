package http

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"
	"github.com/google/uuid"
)

type AspirationNeedHandler struct {
	usecase    domain.AspirationNeedUsecase
	tenantRepo domain.TenantRepository
	baseDomain string
}

func NewAspirationNeedHandler(usecase domain.AspirationNeedUsecase, tenantRepo domain.TenantRepository, baseDomain string) *AspirationNeedHandler {
	return &AspirationNeedHandler{
		usecase:    usecase,
		tenantRepo: tenantRepo,
		baseDomain: baseDomain,
	}
}

func (h *AspirationNeedHandler) RegisterRoutes(mux *http.ServeMux, tenantMw func(http.Handler) http.Handler, authMw func(http.Handler) http.Handler) {
	// Public Tenant routes. Use method-specific wildcard patterns so public
	// tenant resources owned by other handlers can be registered without
	// colliding on the broad /api/v1/t/ prefix.
	mux.HandleFunc("GET /api/v1/t/{slug}/aspirations", h.handlePublicTenantRoutes)
	mux.HandleFunc("POST /api/v1/t/{slug}/aspirations", h.handlePublicTenantRoutes)
	mux.HandleFunc("GET /api/v1/t/{slug}/needs", h.handlePublicTenantRoutes)

	// Private Aspiration routes: /api/v1/aspirations
	protectedAspirations := http.HandlerFunc(h.handlePrivateAspirations)
	mux.Handle("/api/v1/aspirations", authMw(tenantMw(protectedAspirations)))
	mux.Handle("/api/v1/aspirations/", authMw(tenantMw(protectedAspirations)))

	// Private Community Needs routes: /api/v1/needs
	protectedNeeds := http.HandlerFunc(h.handlePrivateNeeds)
	mux.Handle("/api/v1/needs", authMw(tenantMw(protectedNeeds)))
	mux.Handle("/api/v1/needs/", authMw(tenantMw(protectedNeeds)))

	// Event Sponsors routes: /api/v1/events/:id/sponsors
	// These are more specific than the event handler's /api/v1/events/ subtree.
	protectedSponsors := http.HandlerFunc(h.handleEventSponsors)
	mux.Handle("GET /api/v1/events/{id}/sponsors", authMw(tenantMw(protectedSponsors)))
	mux.Handle("POST /api/v1/events/{id}/sponsors", authMw(tenantMw(protectedSponsors)))
	mux.Handle("DELETE /api/v1/events/{id}/sponsors/{sponsorId}", authMw(tenantMw(protectedSponsors)))
}

func (h *AspirationNeedHandler) handlePublicTenantRoutes(w http.ResponseWriter, r *http.Request) {
	// Pattern: /api/v1/t/:slug/aspirations or /api/v1/t/:slug/needs
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/t/")
	parts := strings.Split(path, "/")
	if len(parts) < 2 {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}

	slug := parts[0]
	resource := parts[1]

	// Hostname/tenant consistency: when the request arrives on a tenant subdomain
	// of the base domain, the path slug must match the hostname tenant, otherwise
	// the request is rejected (404) and the hostname can never select a different
	// tenant's public resources.
	if hostSlug, matched := middleware.HostnameSlug(r.Host, h.baseDomain); matched && hostSlug != slug {
		http.Error(w, `{"error":"tenant not found"}`, http.StatusNotFound)
		return
	}

	tenant, err := h.tenantRepo.GetBySlug(r.Context(), slug)
	if err != nil || tenant == nil || !tenant.IsActive() {
		http.Error(w, `{"error":"tenant not found"}`, http.StatusNotFound)
		return
	}

	// Make the resolved tenant available to repositories so that tenant-scoped
	// queries are schema-qualified against tenant_<slug>.
	r = r.WithContext(context.WithValue(r.Context(), domain.TenantContextKey, tenant))

	switch resource {
	case "aspirations":
		switch r.Method {
		case http.MethodPost:
			h.publicSubmitAspiration(w, r, tenant.ID)
		case http.MethodGet:
			h.publicListAspirations(w, r, tenant.ID)
		default:
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
	case "needs":
		if r.Method == http.MethodGet {
			h.publicListCommunityNeeds(w, r, tenant.ID)
		} else {
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
	default:
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
	}
}

func (h *AspirationNeedHandler) publicSubmitAspiration(w http.ResponseWriter, r *http.Request, tenantID uuid.UUID) {
	var req domain.Aspiration
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}

	// Public submissions are never linked to a resident identity: the caller is
	// unauthenticated, so any resident_id supplied in the body is ignored.
	req.ResidentID = nil

	if err := h.usecase.SubmitAspiration(r.Context(), tenantID, &req); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(req)
}

func (h *AspirationNeedHandler) publicListAspirations(w http.ResponseWriter, r *http.Request, tenantID uuid.UUID) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	aspirations, total, err := h.usecase.ListAspirations(r.Context(), tenantID, true, limit, offset)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	if aspirations == nil {
		aspirations = []*domain.Aspiration{}
	}

	resp := map[string]interface{}{
		"data":   aspirations,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}

func (h *AspirationNeedHandler) publicListCommunityNeeds(w http.ResponseWriter, r *http.Request, tenantID uuid.UUID) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	needs, total, err := h.usecase.ListCommunityNeeds(r.Context(), tenantID, limit, offset)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	if needs == nil {
		needs = []*domain.CommunityNeed{}
	}

	resp := map[string]interface{}{
		"data":   needs,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}

func (h *AspirationNeedHandler) handlePrivateAspirations(w http.ResponseWriter, r *http.Request) {
	tenant := middleware.GetTenantFromContext(r.Context())
	if tenant == nil {
		http.Error(w, `{"error":"tenant context missing"}`, http.StatusBadRequest)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/aspirations")
	path = strings.TrimPrefix(path, "/")

	if path == "" {
		if r.Method == http.MethodGet {
			limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
			offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

			aspirations, total, err := h.usecase.ListAspirations(r.Context(), tenant.ID, false, limit, offset)
			if err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
				return
			}
			if aspirations == nil {
				aspirations = []*domain.Aspiration{}
			}

			resp := map[string]interface{}{
				"data":   aspirations,
				"total":  total,
				"limit":  limit,
				"offset": offset,
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(resp)
			return
		}
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	parts := strings.Split(path, "/")
	id, err := uuid.Parse(parts[0])
	if err != nil {
		http.Error(w, `{"error":"invalid aspiration id"}`, http.StatusBadRequest)
		return
	}

	if len(parts) == 1 {
		switch r.Method {
		case http.MethodGet:
			asp, err := h.usecase.GetAspiration(r.Context(), tenant.ID, id)
			if err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusNotFound)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(asp)
		case http.MethodPut:
			if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
				http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
				return
			}
			var req struct {
				Status   string  `json:"status"`
				Response *string `json:"response"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
				return
			}
			updated, err := h.usecase.UpdateAspirationStatus(r.Context(), tenant.ID, id, req.Status, req.Response)
			if err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(updated)
		default:
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
		return
	}

	http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
}

func (h *AspirationNeedHandler) handlePrivateNeeds(w http.ResponseWriter, r *http.Request) {
	tenant := middleware.GetTenantFromContext(r.Context())
	if tenant == nil {
		http.Error(w, `{"error":"tenant context missing"}`, http.StatusBadRequest)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/needs")
	path = strings.TrimPrefix(path, "/")

	if path == "" {
		switch r.Method {
		case http.MethodGet:
			limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
			offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

			needs, total, err := h.usecase.ListCommunityNeeds(r.Context(), tenant.ID, limit, offset)
			if err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
				return
			}
			if needs == nil {
				needs = []*domain.CommunityNeed{}
			}

			resp := map[string]interface{}{
				"data":   needs,
				"total":  total,
				"limit":  limit,
				"offset": offset,
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(resp)
		case http.MethodPost:
			if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
				http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
				return
			}
			var req domain.CommunityNeed
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
				return
			}
			if err := h.usecase.CreateCommunityNeed(r.Context(), tenant.ID, &req); err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			_ = json.NewEncoder(w).Encode(req)
		default:
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
		return
	}

	parts := strings.Split(path, "/")
	id, err := uuid.Parse(parts[0])
	if err != nil {
		http.Error(w, `{"error":"invalid community need id"}`, http.StatusBadRequest)
		return
	}

	if len(parts) == 1 {
		switch r.Method {
		case http.MethodGet:
			need, err := h.usecase.GetCommunityNeed(r.Context(), tenant.ID, id)
			if err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusNotFound)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(need)
		case http.MethodPut:
			if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
				http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
				return
			}
			var req domain.CommunityNeed
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
				return
			}
			req.ID = id
			if err := h.usecase.UpdateCommunityNeed(r.Context(), tenant.ID, &req); err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(req)
		default:
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
		return
	}

	http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
}

func (h *AspirationNeedHandler) handleEventSponsors(w http.ResponseWriter, r *http.Request) {
	tenant := middleware.GetTenantFromContext(r.Context())
	if tenant == nil {
		http.Error(w, `{"error":"tenant context missing"}`, http.StatusBadRequest)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/events/")
	parts := strings.Split(path, "/")
	// Expected route: /api/v1/events/:id/sponsors or /api/v1/events/:id/sponsors/:sponsorId
	if len(parts) < 2 || parts[1] != "sponsors" {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}

	eventID, err := uuid.Parse(parts[0])
	if err != nil {
		http.Error(w, `{"error":"invalid event id"}`, http.StatusBadRequest)
		return
	}

	if len(parts) == 2 {
		switch r.Method {
		case http.MethodGet:
			sponsors, err := h.usecase.ListEventSponsors(r.Context(), tenant.ID, eventID)
			if err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
				return
			}
			if sponsors == nil {
				sponsors = []*domain.EventSponsor{}
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"data": sponsors})
		case http.MethodPost:
			if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
				http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
				return
			}
			var req domain.EventSponsor
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
				return
			}
			req.EventID = eventID
			if err := h.usecase.CreateEventSponsor(r.Context(), tenant.ID, &req); err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			_ = json.NewEncoder(w).Encode(req)
		default:
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
		return
	}

	if len(parts) == 3 && r.Method == http.MethodDelete {
		if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
			http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
			return
		}
		sponsorID, err := uuid.Parse(parts[2])
		if err != nil {
			http.Error(w, `{"error":"invalid sponsor id"}`, http.StatusBadRequest)
			return
		}
		if err := h.usecase.DeleteEventSponsor(r.Context(), tenant.ID, sponsorID); err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]string{"message": "deleted"})
		return
	}

	http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
}
