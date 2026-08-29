package http

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"

	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"
)

type HouseHandler struct {
	houseUC domain.HouseUsecase
}

func NewHouseHandler(houseUC domain.HouseUsecase) *HouseHandler {
	return &HouseHandler{houseUC: houseUC}
}

// ClaimToken memvalidasi QR Token rumah warga dan mengembalikan JWT session
func (h *HouseHandler) ClaimToken(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	slug := r.URL.Query().Get("slug")
	token := r.URL.Query().Get("token")

	if slug == "" || token == "" {
		http.Error(w, `{"error":"slug dan token wajib diisi"}`, http.StatusBadRequest)
		return
	}

	res, err := h.houseUC.ClaimAccessToken(r.Context(), slug, token)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(res)
}

// ListAdmin menampilkan daftar rumah warga di tenant saat ini
func (h *HouseHandler) ListAdmin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	tenant := middleware.GetTenantFromContext(r.Context())
	if tenant == nil {
		http.Error(w, `{"error":"tenant context missing"}`, http.StatusBadRequest)
		return
	}

	query := r.URL.Query()
	limit, _ := strconv.Atoi(query.Get("limit"))
	offset, _ := strconv.Atoi(query.Get("offset"))

	houses, total, err := h.houseUC.ListHouses(r.Context(), tenant.ID, limit, offset)
	if err != nil {
		http.Error(w, `{"error":"gagal mengambil daftar rumah"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"data":  houses,
		"total": total,
	})
}

// CreateAdmin menambahkan rumah baru
func (h *HouseHandler) CreateAdmin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	tenant := middleware.GetTenantFromContext(r.Context())
	if tenant == nil {
		http.Error(w, `{"error":"tenant context missing"}`, http.StatusBadRequest)
		return
	}

	var req domain.House
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"payload tidak valid"}`, http.StatusBadRequest)
		return
	}

	house, err := h.houseUC.CreateHouse(r.Context(), tenant.ID, &req)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(house)
}

// RegenerateTokenAdmin me-reset token akses rumah
func (h *HouseHandler) RegenerateTokenAdmin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	tenant := middleware.GetTenantFromContext(r.Context())
	if tenant == nil {
		http.Error(w, `{"error":"tenant context missing"}`, http.StatusBadRequest)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/admin/houses/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) < 2 || parts[1] != "regenerate-token" {
		http.Error(w, `{"error":"invalid url"}`, http.StatusBadRequest)
		return
	}

	houseID, err := uuid.Parse(parts[0])
	if err != nil {
		http.Error(w, `{"error":"invalid house id"}`, http.StatusBadRequest)
		return
	}

	house, err := h.houseUC.RegenerateToken(r.Context(), tenant.ID, houseID)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(house)
}

func (h *HouseHandler) RegisterRoutes(mux *http.ServeMux, tenantMw, authMw, adminMw func(http.Handler) http.Handler) {
	// Public endpoint for QR claiming
	mux.HandleFunc("/api/v1/house-access/claim", h.ClaimToken)

	// Admin RT endpoints
	adminProtected := authMw(adminMw(tenantMw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/v1/admin/houses" || r.URL.Path == "/api/v1/admin/houses/" {
			if r.Method == http.MethodGet {
				h.ListAdmin(w, r)
			} else if r.Method == http.MethodPost {
				h.CreateAdmin(w, r)
			} else {
				http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			}
			return
		}

		if strings.HasSuffix(r.URL.Path, "/regenerate-token") {
			h.RegenerateTokenAdmin(w, r)
			return
		}

		http.NotFound(w, r)
	}))))

	mux.Handle("/api/v1/admin/houses", adminProtected)
	mux.Handle("/api/v1/admin/houses/", adminProtected)
}
