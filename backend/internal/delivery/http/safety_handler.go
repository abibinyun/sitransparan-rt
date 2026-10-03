package http

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"
	"backend/internal/usecase"
)

type SafetyHandler struct {
	usecase usecase.SafetyUsecase
}

func NewSafetyHandler(uc usecase.SafetyUsecase) *SafetyHandler {
	return &SafetyHandler{usecase: uc}
}

func (h *SafetyHandler) RegisterRoutes(mux *http.ServeMux, tenantMw, authMw, adminMw func(http.Handler) http.Handler) {
	// Panic Button
	panicHandler := authMw(tenantMw(http.HandlerFunc(h.handlePanic)))
	mux.Handle("/api/v1/safety/panic", panicHandler)
	mux.Handle("/api/v1/safety/emergencies", panicHandler)
	mux.Handle("/api/v1/safety/emergencies/", panicHandler)

	// House Vacancy (confidential)
	vacancyHandler := authMw(tenantMw(http.HandlerFunc(h.handleVacancies)))
	mux.Handle("/api/v1/safety/vacancies", vacancyHandler)
}

func (h *SafetyHandler) handlePanic(w http.ResponseWriter, r *http.Request) {
	tenant := middleware.GetTenantFromContext(r.Context())
	if tenant == nil {
		http.Error(w, `{"error":"tenant context missing"}`, http.StatusBadRequest)
		return
	}
	userID := middleware.GetUserIDFromContext(r.Context())

	// POST /api/v1/safety/panic: trigger panic
	if r.URL.Path == "/api/v1/safety/panic" && r.Method == http.MethodPost {
		var req struct {
			HouseID      *uuid.UUID `json:"house_id"`
			ReporterName string     `json:"reporter_name"`
			HouseNumber  string     `json:"house_number"`
			AlertType    string     `json:"alert_type"`
			Description  string     `json:"description"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
			return
		}

		alert, err := h.usecase.TriggerPanic(r.Context(), tenant.ID, userID, req.HouseID, req.ReporterName, req.HouseNumber, req.AlertType, req.Description)
		if err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(alert)
		return
	}

	// GET /api/v1/safety/emergencies: list active
	if r.URL.Path == "/api/v1/safety/emergencies" && r.Method == http.MethodGet {
		list, err := h.usecase.ListActiveEmergencies(r.Context(), tenant.ID)
		if err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
			return
		}
		if list == nil {
			list = []*domain.EmergencyAlert{}
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"data": list})
		return
	}

	// POST /api/v1/safety/emergencies/{id}/resolve
	if strings.HasSuffix(r.URL.Path, "/resolve") && r.Method == http.MethodPost {
		idStr := strings.TrimPrefix(r.URL.Path, "/api/v1/safety/emergencies/")
		idStr = strings.TrimSuffix(idStr, "/resolve")
		alertID, err := uuid.Parse(idStr)
		if err != nil {
			http.Error(w, `{"error":"invalid alert id"}`, http.StatusBadRequest)
			return
		}

		if err := h.usecase.ResolveEmergency(r.Context(), tenant.ID, alertID, userID); err != nil {
			http.Error(w, `{"error":"failed to resolve emergency"}`, http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "emergency resolved"})
		return
	}

	http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
}

func (h *SafetyHandler) handleVacancies(w http.ResponseWriter, r *http.Request) {
	tenant := middleware.GetTenantFromContext(r.Context())
	if tenant == nil {
		http.Error(w, `{"error":"tenant context missing"}`, http.StatusBadRequest)
		return
	}
	userID := middleware.GetUserIDFromContext(r.Context())
	role := middleware.GetRoleFromContext(r.Context())

	// POST /api/v1/safety/vacancies: report vacancy
	if r.Method == http.MethodPost {
		var req struct {
			HouseID          uuid.UUID `json:"house_id"`
			StartDate        string    `json:"start_date"`
			EndDate          string    `json:"end_date"`
			EmergencyContact string    `json:"emergency_contact"`
			Notes            string    `json:"notes"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
			return
		}

		v, err := h.usecase.ReportHouseVacancy(r.Context(), tenant.ID, userID, req.HouseID, req.StartDate, req.EndDate, req.EmergencyContact, req.Notes)
		if err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(v)
		return
	}

	// GET /api/v1/safety/vacancies: list (Confidentiality Enforced!)
	if r.Method == http.MethodGet {
		list, err := h.usecase.ListHouseVacancies(r.Context(), tenant.ID, userID, domain.RoleName(role))
		if err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusForbidden)
			return
		}
		if list == nil {
			list = []*domain.HouseVacancy{}
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"data": list})
		return
	}

	http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
}
