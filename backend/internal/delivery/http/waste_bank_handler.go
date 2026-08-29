package http

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"
	"github.com/google/uuid"
)

type WasteBankHandler struct {
	usecase    domain.WasteBankUsecase
	tenantRepo domain.TenantRepository
	baseDomain string
}

func NewWasteBankHandler(usecase domain.WasteBankUsecase, tenantRepo domain.TenantRepository, baseDomain string) *WasteBankHandler {
	return &WasteBankHandler{
		usecase:    usecase,
		tenantRepo: tenantRepo,
		baseDomain: baseDomain,
	}
}

func (h *WasteBankHandler) RegisterRoutes(mux *http.ServeMux, tenantMw func(http.Handler) http.Handler, authMw func(http.Handler) http.Handler) {
	// 1. Public transparency endpoints (/api/v1/t/{slug}/waste-bank/...)
	mux.HandleFunc("GET /api/v1/t/{slug}/waste-bank/summary", h.handlePublicSummary)
	mux.HandleFunc("GET /api/v1/t/{slug}/waste-bank/categories", h.handlePublicCategories)
	mux.HandleFunc("GET /api/v1/t/{slug}/waste-bank/households", h.handlePublicHouseholds)

	// 2. Protected admin & internal endpoints (/api/v1/waste-bank/...)
	protected := authMw(tenantMw(http.HandlerFunc(h.handleProtected)))
	mux.Handle("/api/v1/waste-bank", protected)
	mux.Handle("/api/v1/waste-bank/", protected)
}

func (h *WasteBankHandler) resolvePublicTenant(w http.ResponseWriter, r *http.Request) (context.Context, *domain.Tenant, bool) {
	slug := r.PathValue("slug")
	if hostSlug, matched := middleware.HostnameSlug(r.Host, h.baseDomain); matched && hostSlug != slug {
		http.Error(w, `{"error":"tenant not found"}`, http.StatusNotFound)
		return nil, nil, false
	}
	tenant, err := h.tenantRepo.GetBySlug(r.Context(), slug)
	if err != nil || tenant == nil || !tenant.IsActive() {
		http.Error(w, `{"error":"tenant not found"}`, http.StatusNotFound)
		return nil, nil, false
	}
	ctx := context.WithValue(r.Context(), domain.TenantContextKey, tenant)
	return ctx, tenant, true
}

func (h *WasteBankHandler) handlePublicSummary(w http.ResponseWriter, r *http.Request) {
	ctx, tenant, ok := h.resolvePublicTenant(w, r)
	if !ok {
		return
	}
	summary, err := h.usecase.GetSummary(ctx, tenant.ID)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(summary)
}

func (h *WasteBankHandler) handlePublicCategories(w http.ResponseWriter, r *http.Request) {
	ctx, tenant, ok := h.resolvePublicTenant(w, r)
	if !ok {
		return
	}
	categories, err := h.usecase.ListCategories(ctx, tenant.ID, true)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{"data": categories})
}

func (h *WasteBankHandler) handlePublicHouseholds(w http.ResponseWriter, r *http.Request) {
	ctx, tenant, ok := h.resolvePublicTenant(w, r)
	if !ok {
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	list, total, err := h.usecase.ListHouseholdAccumulations(ctx, tenant.ID, limit, offset)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"data":  list,
		"total": total,
	})
}

func (h *WasteBankHandler) handleProtected(w http.ResponseWriter, r *http.Request) {
	tenant := middleware.GetTenantFromContext(r.Context())
	if tenant == nil {
		http.Error(w, `{"error":"tenant context missing"}`, http.StatusBadRequest)
		return
	}
	tenantID := tenant.ID

	p := strings.TrimPrefix(r.URL.Path, "/api/v1/waste-bank")
	p = strings.TrimPrefix(p, "/")

	// Sub-routing
	if p == "summary" && r.Method == http.MethodGet {
		summary, err := h.usecase.GetSummary(r.Context(), tenantID)
		if err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(summary)
		return
	}

	if p == "households" && r.Method == http.MethodGet {
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
		list, total, err := h.usecase.ListHouseholdAccumulations(r.Context(), tenantID, limit, offset)
		if err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"data": list, "total": total})
		return
	}

	if strings.HasPrefix(p, "categories") {
		h.handleCategoriesCRUD(w, r, tenantID, strings.TrimPrefix(p, "categories"))
		return
	}

	if strings.HasPrefix(p, "deposits") {
		h.handleDepositsCRUD(w, r, tenantID, strings.TrimPrefix(p, "deposits"))
		return
	}

	http.NotFound(w, r)
}

func (h *WasteBankHandler) handleCategoriesCRUD(w http.ResponseWriter, r *http.Request, tenantID uuid.UUID, subpath string) {
	subpath = strings.TrimPrefix(subpath, "/")

	if subpath == "" {
		if r.Method == http.MethodGet {
			categories, err := h.usecase.ListCategories(r.Context(), tenantID, false)
			if err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"data": categories})
			return
		}
		if r.Method == http.MethodPost {
			var cat domain.WasteCategory
			if err := json.NewDecoder(r.Body).Decode(&cat); err != nil {
				http.Error(w, `{"error":"invalid json"}`, http.StatusBadRequest)
				return
			}
			cat.TenantID = tenantID
			if err := h.usecase.CreateCategory(r.Context(), &cat); err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			_ = json.NewEncoder(w).Encode(cat)
			return
		}
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	id, err := uuid.Parse(subpath)
	if err != nil {
		http.Error(w, `{"error":"invalid category id"}`, http.StatusBadRequest)
		return
	}

	if r.Method == http.MethodGet {
		cat, err := h.usecase.GetCategoryByID(r.Context(), tenantID, id)
		if err != nil {
			http.Error(w, `{"error":"category not found"}`, http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(cat)
		return
	}

	if r.Method == http.MethodPut {
		var cat domain.WasteCategory
		if err := json.NewDecoder(r.Body).Decode(&cat); err != nil {
			http.Error(w, `{"error":"invalid json"}`, http.StatusBadRequest)
			return
		}
		cat.ID = id
		cat.TenantID = tenantID
		if err := h.usecase.UpdateCategory(r.Context(), &cat); err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(cat)
		return
	}

	if r.Method == http.MethodDelete {
		if err := h.usecase.DeleteCategory(r.Context(), tenantID, id); err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
			return
		}
		w.WriteHeader(http.StatusNoContent)
		return
	}

	http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
}

func (h *WasteBankHandler) handleDepositsCRUD(w http.ResponseWriter, r *http.Request, tenantID uuid.UUID, subpath string) {
	subpath = strings.TrimPrefix(subpath, "/")

	if subpath == "" {
		if r.Method == http.MethodGet {
			search := r.URL.Query().Get("search")
			status := r.URL.Query().Get("status")
			limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
			offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

			list, total, err := h.usecase.ListDeposits(r.Context(), tenantID, search, status, limit, offset)
			if err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"data": list, "total": total})
			return
		}
		if r.Method == http.MethodPost {
			var d domain.WasteDeposit
			if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
				http.Error(w, `{"error":"invalid json"}`, http.StatusBadRequest)
				return
			}
			d.TenantID = tenantID
			if userID := middleware.GetUserIDFromContext(r.Context()); userID != uuid.Nil {
				d.RecordedBy = &userID
			}
			if d.DepositDate.IsZero() {
				d.DepositDate = time.Now()
			}
			if err := h.usecase.CreateDeposit(r.Context(), &d); err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			_ = json.NewEncoder(w).Encode(d)
			return
		}
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	id, err := uuid.Parse(subpath)
	if err != nil {
		http.Error(w, `{"error":"invalid deposit id"}`, http.StatusBadRequest)
		return
	}

	if r.Method == http.MethodGet {
		dep, err := h.usecase.GetDepositByID(r.Context(), tenantID, id)
		if err != nil {
			http.Error(w, `{"error":"deposit not found"}`, http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(dep)
		return
	}

	if r.Method == http.MethodPatch || r.Method == http.MethodPut {
		var body struct {
			Status string `json:"status"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, `{"error":"invalid json"}`, http.StatusBadRequest)
			return
		}
		if err := h.usecase.UpdateDepositStatus(r.Context(), tenantID, id, body.Status); err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"status": body.Status})
		return
	}

	http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
}
