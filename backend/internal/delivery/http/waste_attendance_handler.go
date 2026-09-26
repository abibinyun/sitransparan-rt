package http

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"
	"github.com/google/uuid"
)

type WasteAttendanceHandler struct {
	usecase domain.WasteAttendanceUsecase
}

func NewWasteAttendanceHandler(usecase domain.WasteAttendanceUsecase) *WasteAttendanceHandler {
	return &WasteAttendanceHandler{usecase: usecase}
}

func (h *WasteAttendanceHandler) RegisterRoutes(mux *http.ServeMux, tenantMw, authMw, adminMw func(http.Handler) http.Handler) {
	// Protected by tenantMw + authMw + adminMw (SuperAdmin, Admin RT, Operator)
	collectorHandler := authMw(adminMw(tenantMw(http.HandlerFunc(h.handleCollectors))))
	mux.Handle("/api/v1/waste-collectors", collectorHandler)
	mux.Handle("/api/v1/waste-collectors/", collectorHandler)

	attendanceHandler := authMw(adminMw(tenantMw(http.HandlerFunc(h.handleAttendance))))
	mux.Handle("/api/v1/waste-attendance", attendanceHandler)
	mux.Handle("/api/v1/waste-attendance/", attendanceHandler)
}

// ---------- Collectors Handler ----------

func (h *WasteAttendanceHandler) handleCollectors(w http.ResponseWriter, r *http.Request) {
	tenant := middleware.GetTenantFromContext(r.Context())
	if tenant == nil {
		http.Error(w, `{"error":"tenant context missing"}`, http.StatusBadRequest)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/waste-collectors")
	path = strings.TrimPrefix(path, "/")

	if path == "" {
		switch r.Method {
		case http.MethodGet:
			onlyActive := r.URL.Query().Get("active") == "true"
			collectors, err := h.usecase.ListCollectors(r.Context(), tenant.ID, onlyActive)
			if err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{"data": collectors})
			return

		case http.MethodPost:
			var req struct {
				ResidentID *uuid.UUID `json:"resident_id"`
				Name       string     `json:"name"`
				Phone      string     `json:"phone"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
				return
			}
			c, err := h.usecase.CreateCollector(r.Context(), tenant.ID, req.ResidentID, req.Name, req.Phone)
			if err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(c)
			return

		default:
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}
	}

	// /api/v1/waste-collectors/{id}
	id, err := uuid.Parse(path)
	if err != nil {
		http.Error(w, `{"error":"invalid collector id"}`, http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodPut:
		var req struct {
			ResidentID *uuid.UUID `json:"resident_id"`
			Name       string     `json:"name"`
			Phone      string     `json:"phone"`
			IsActive   bool       `json:"is_active"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
			return
		}
		c, err := h.usecase.UpdateCollector(r.Context(), tenant.ID, id, req.ResidentID, req.Name, req.Phone, req.IsActive)
		if err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(c)
		return

	case http.MethodDelete:
		if err := h.usecase.DeleteCollector(r.Context(), tenant.ID, id); err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "petugas berhasil dihapus"})
		return

	default:
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}
}

// ---------- Attendance Handler ----------

func (h *WasteAttendanceHandler) handleAttendance(w http.ResponseWriter, r *http.Request) {
	tenant := middleware.GetTenantFromContext(r.Context())
	if tenant == nil {
		http.Error(w, `{"error":"tenant context missing"}`, http.StatusBadRequest)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/waste-attendance")
	path = strings.TrimPrefix(path, "/")

	if path == "" {
		switch r.Method {
		case http.MethodGet:
			limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
			offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
			if limit <= 0 {
				limit = 20
			}
			list, total, err := h.usecase.ListAttendance(r.Context(), tenant.ID, limit, offset)
			if err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"data":   list,
				"total":  total,
				"limit":  limit,
				"offset": offset,
			})
			return

		case http.MethodPost:
			var req struct {
				Date          string      `json:"date"`
				CollectorIDs  []uuid.UUID `json:"collector_ids"`
				WagePerPerson float64     `json:"wage_per_person"`
				Notes         string      `json:"notes"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
				return
			}

			userID := middleware.GetUserIDFromContext(r.Context())
			var createdBy *uuid.UUID
			if userID != uuid.Nil {
				createdBy = &userID
			}

			att, err := h.usecase.CreateAttendance(r.Context(), tenant.ID, req.Date, req.CollectorIDs, req.WagePerPerson, req.Notes, createdBy)
			if err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(att)
			return

		default:
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}
	}

	// /api/v1/waste-attendance/{id}
	id, err := uuid.Parse(path)
	if err != nil {
		http.Error(w, `{"error":"invalid attendance id"}`, http.StatusBadRequest)
		return
	}

	if r.Method == http.MethodDelete {
		if err := h.usecase.DeleteAttendance(r.Context(), tenant.ID, id); err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "absensi berhasil dihapus"})
		return
	}

	http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
}
