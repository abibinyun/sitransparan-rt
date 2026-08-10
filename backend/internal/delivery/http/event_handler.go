package http

import (
	"bytes"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"
	"github.com/google/uuid"
)

type EventHandler struct {
	usecase domain.EventUsecase
}

func NewEventHandler(usecase domain.EventUsecase) *EventHandler {
	return &EventHandler{usecase: usecase}
}

func (h *EventHandler) RegisterRoutes(mux *http.ServeMux, tenantMw func(http.Handler) http.Handler, authMw func(http.Handler) http.Handler) {
	protected := http.HandlerFunc(h.handleEvents)
	mux.Handle("/api/v1/events", authMw(tenantMw(protected)))
	mux.Handle("/api/v1/events/", authMw(tenantMw(protected)))
}

func (h *EventHandler) handleEvents(w http.ResponseWriter, r *http.Request) {
	tenant := middleware.GetTenantFromContext(r.Context())
	if tenant == nil {
		http.Error(w, `{"error":"tenant context missing"}`, http.StatusBadRequest)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/events")
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
		http.Error(w, `{"error":"invalid event id"}`, http.StatusBadRequest)
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

	if len(parts) == 2 {
		switch parts[1] {
		case "budget":
			if r.Method == http.MethodGet {
				h.listBudgets(w, r, tenant.ID, id)
				return
			}
			if r.Method == http.MethodPost || r.Method == http.MethodPut {
				h.addOrUpdateBudget(w, r, tenant.ID, id)
				return
			}
		case "rsvp":
			if r.Method == http.MethodPost {
				h.rsvp(w, r, tenant.ID, id)
				return
			}
		case "roles":
			if r.Method == http.MethodGet {
				h.listRoles(w, r, tenant.ID, id)
				return
			}
			if r.Method == http.MethodPost {
				h.assignRole(w, r, tenant.ID, id)
				return
			}
		case "receipts":
			if r.Method == http.MethodGet {
				h.listReceipts(w, r, tenant.ID, id)
				return
			}
			if r.Method == http.MethodPost {
				h.uploadReceipt(w, r, tenant.ID, id)
				return
			}
		case "transparency":
			if r.Method == http.MethodGet {
				h.getTransparency(w, r, tenant.ID, id)
				return
			}
		}
	}

	if len(parts) == 3 && parts[1] == "roles" && r.Method == http.MethodDelete {
		roleID, err := uuid.Parse(parts[2])
		if err != nil {
			http.Error(w, `{"error":"invalid role id"}`, http.StatusBadRequest)
			return
		}
		h.removeRole(w, r, tenant.ID, id, roleID)
		return
	}

	http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
}

func (h *EventHandler) list(w http.ResponseWriter, r *http.Request, tenantID uuid.UUID) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	if limit <= 0 {
		limit = 10
	}

	events, total, err := h.usecase.ListEvents(r.Context(), tenantID, limit, offset)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	if events == nil {
		events = []*domain.Event{}
	}

	resp := map[string]interface{}{
		"data":   events,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}

func (h *EventHandler) create(w http.ResponseWriter, r *http.Request, tenantID uuid.UUID) {
	var req domain.Event
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}

	userID := middleware.GetUserIDFromContext(r.Context())
	if userID != uuid.Nil {
		req.CreatedBy = &userID
	}

	if err := h.usecase.CreateEvent(r.Context(), tenantID, &req); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(req)
}

func (h *EventHandler) getByID(w http.ResponseWriter, r *http.Request, tenantID, id uuid.UUID) {
	event, err := h.usecase.GetEvent(r.Context(), tenantID, id)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(event)
}

func (h *EventHandler) update(w http.ResponseWriter, r *http.Request, tenantID, id uuid.UUID) {
	var req domain.Event
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}

	req.ID = id
	if err := h.usecase.UpdateEvent(r.Context(), tenantID, &req); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(req)
}

func (h *EventHandler) delete(w http.ResponseWriter, r *http.Request, tenantID, id uuid.UUID) {
	if err := h.usecase.DeleteEvent(r.Context(), tenantID, id); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"message": "deleted"})
}

func (h *EventHandler) addOrUpdateBudget(w http.ResponseWriter, r *http.Request, tenantID, eventID uuid.UUID) {
	var req domain.EventBudget
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}

	if err := h.usecase.AddOrUpdateBudget(r.Context(), tenantID, eventID, &req); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(req)
}

func (h *EventHandler) listBudgets(w http.ResponseWriter, r *http.Request, tenantID, eventID uuid.UUID) {
	budgets, err := h.usecase.ListBudgets(r.Context(), tenantID, eventID)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	if budgets == nil {
		budgets = []*domain.EventBudget{}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(budgets)
}

func (h *EventHandler) rsvp(w http.ResponseWriter, r *http.Request, tenantID, eventID uuid.UUID) {
	var req domain.EventParticipant
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}

	if err := h.usecase.RSVP(r.Context(), tenantID, eventID, &req); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(req)
}

func (h *EventHandler) assignRole(w http.ResponseWriter, r *http.Request, tenantID, eventID uuid.UUID) {
	var req domain.EventRole
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}

	if err := h.usecase.AssignRole(r.Context(), tenantID, eventID, &req); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(req)
}

func (h *EventHandler) listRoles(w http.ResponseWriter, r *http.Request, tenantID, eventID uuid.UUID) {
	roles, err := h.usecase.ListRoles(r.Context(), tenantID, eventID)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	if roles == nil {
		roles = []*domain.EventRole{}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(roles)
}

func (h *EventHandler) removeRole(w http.ResponseWriter, r *http.Request, tenantID, eventID, roleID uuid.UUID) {
	if err := h.usecase.RemoveRole(r.Context(), tenantID, eventID, roleID); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"message": "role removed"})
}

func (h *EventHandler) uploadReceipt(w http.ResponseWriter, r *http.Request, tenantID, eventID uuid.UUID) {
	if strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/form-data") {
		if err := r.ParseMultipartForm(10 << 20); err != nil {
			http.Error(w, `{"error":"unable to parse multipart form"}`, http.StatusBadRequest)
			return
		}

		file, header, err := r.FormFile("file")
		if err != nil {
			http.Error(w, `{"error":"file is required"}`, http.StatusBadRequest)
			return
		}
		defer file.Close()

		var residentID *uuid.UUID
		if resStr := r.FormValue("resident_id"); resStr != "" {
			if id, err := uuid.Parse(resStr); err == nil {
				residentID = &id
			}
		}
		amount, _ := strconv.ParseFloat(r.FormValue("amount"), 64)
		description := r.FormValue("description")

		contentType := header.Header.Get("Content-Type")
		receipt, err := h.usecase.UploadDonationReceipt(r.Context(), tenantID, eventID, residentID, header.Filename, file, contentType, amount, description)
		if err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(receipt)
		return
	}

	var req struct {
		ResidentID  *uuid.UUID `json:"resident_id,omitempty"`
		Filename    string     `json:"filename"`
		FileContent string     `json:"file_content"`
		Amount      float64    `json:"amount"`
		Description string     `json:"description"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}

	filename := req.Filename
	if filename == "" {
		filename = "receipt.jpg"
	}
	content := bytes.NewReader([]byte(req.FileContent))

	receipt, err := h.usecase.UploadDonationReceipt(r.Context(), tenantID, eventID, req.ResidentID, filename, content, "application/octet-stream", req.Amount, req.Description)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(receipt)
}

func (h *EventHandler) listReceipts(w http.ResponseWriter, r *http.Request, tenantID, eventID uuid.UUID) {
	receipts, err := h.usecase.ListReceipts(r.Context(), tenantID, eventID)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	if receipts == nil {
		receipts = []*domain.EventReceipt{}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(receipts)
}

func (h *EventHandler) getTransparency(w http.ResponseWriter, r *http.Request, tenantID, eventID uuid.UUID) {
	transparency, err := h.usecase.GetTransparency(r.Context(), tenantID, eventID)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(transparency)
}
