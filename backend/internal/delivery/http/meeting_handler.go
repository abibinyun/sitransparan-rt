package http

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"
	"backend/internal/repository"
	"github.com/google/uuid"
)

type MeetingHandler struct {
	meetingUsecase domain.MeetingUsecase
	tenantRepo     domain.TenantRepository
	baseDomain     string
}

func NewMeetingHandler(meetingUsecase domain.MeetingUsecase, tenantRepo domain.TenantRepository, baseDomain string) *MeetingHandler {
	return &MeetingHandler{
		meetingUsecase: meetingUsecase,
		tenantRepo:     tenantRepo,
		baseDomain:     baseDomain,
	}
}

type CreateMeetingRequest struct {
	Title       string `json:"title"`
	Agenda      string `json:"agenda"`
	MeetingDate string `json:"meeting_date"` // ISO 8601 or YYYY-MM-DD
	Location    string `json:"location"`
	MeetingType string `json:"meeting_type"`
	Visibility  string `json:"visibility"`
	Status      string `json:"status"`
	Notes       string `json:"notes"`
}

type AddAttendeeRequest struct {
	ResidentID  *string `json:"resident_id,omitempty"`
	Name        string  `json:"name"`
	RoleOrTitle string  `json:"role_or_title"`
	Attended    *bool   `json:"attended,omitempty"`
	Notes       string  `json:"notes"`
}

type AddDecisionRequest struct {
	DecisionText string `json:"decision_text"`
	Category     string `json:"category"`
}

type ActionItemRequest struct {
	MeetingID          string  `json:"meeting_id"`
	Task               string  `json:"task"`
	AssigneeName       string  `json:"assignee_name"`
	AssigneeResidentID *string `json:"assignee_resident_id,omitempty"`
	DueDate            *string `json:"due_date,omitempty"`
	Status             string  `json:"status"`
	Notes              string  `json:"notes"`
}

func writeMeetingJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeMeetingError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

// isMeetingAdmin reports whether the requester may see confidential and
// internal meetings. Residents are limited to public meetings.
func isMeetingAdmin(r *http.Request) bool {
	return middleware.RequireOperatorOrAdmin(r)
}

// HandleMeetings handles GET (list) and POST (create)
func (h *MeetingHandler) HandleMeetings(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		visibility := r.URL.Query().Get("visibility")
		if !isMeetingAdmin(r) {
			// Non-admins (residents) may only list public meetings,
			// regardless of what the query string asks for.
			visibility = "public"
		}
		meetings, err := h.meetingUsecase.ListMeetings(r.Context(), visibility)
		if err != nil {
			writeMeetingError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if meetings == nil {
			meetings = []domain.Meeting{}
		}
		writeMeetingJSON(w, http.StatusOK, map[string]interface{}{"data": meetings})

	case http.MethodPost:
		if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
			writeMeetingError(w, http.StatusForbidden, "forbidden: insufficient permissions")
			return
		}

		var req CreateMeetingRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeMeetingError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		meetingDate, err := time.Parse(time.RFC3339, req.MeetingDate)
		if err != nil {
			meetingDate, err = time.Parse("2006-01-02", req.MeetingDate)
			if err != nil {
				writeMeetingError(w, http.StatusBadRequest, "invalid meeting_date format (use RFC3339 or YYYY-MM-DD)")
				return
			}
		}

		m := &domain.Meeting{
			Title:       req.Title,
			Agenda:      req.Agenda,
			MeetingDate: meetingDate,
			Location:    req.Location,
			MeetingType: req.MeetingType,
			Visibility:  req.Visibility,
			Status:      req.Status,
		}
		if req.Notes != "" {
			m.Notes = &req.Notes
		}

		userID := middleware.GetUserIDFromContext(r.Context())
		if userID != uuid.Nil {
			m.CreatedBy = &userID
		}

		created, err := h.meetingUsecase.CreateMeeting(r.Context(), m)
		if err != nil {
			writeMeetingError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeMeetingJSON(w, http.StatusCreated, created)

	default:
		writeMeetingError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func extractIDFromPath(path, prefix string) string {
	p := strings.TrimPrefix(path, prefix)
	p = strings.TrimPrefix(p, "/")
	parts := strings.Split(p, "/")
	if len(parts) > 0 {
		return parts[0]
	}
	return ""
}

// HandleMeetingByID handles GET, PUT, DELETE for /api/v1/meetings/{id}
func (h *MeetingHandler) HandleMeetingByID(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	if idStr == "" {
		idStr = extractIDFromPath(r.URL.Path, "/api/v1/meetings")
	}
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeMeetingError(w, http.StatusBadRequest, "invalid meeting id")
		return
	}

	switch r.Method {
	case http.MethodGet:
		m, err := h.meetingUsecase.GetMeetingByID(r.Context(), id)
		if err != nil {
			if errors.Is(err, repository.ErrNotFound) {
				writeMeetingError(w, http.StatusNotFound, "meeting not found")
				return
			}
			writeMeetingError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if !isMeetingAdmin(r) && m.Visibility != "public" {
			writeMeetingError(w, http.StatusForbidden, "forbidden: meeting is not public")
			return
		}
		writeMeetingJSON(w, http.StatusOK, m)

	case http.MethodPut:
		if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
			writeMeetingError(w, http.StatusForbidden, "forbidden: insufficient permissions")
			return
		}

		var req CreateMeetingRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeMeetingError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		var meetingDate time.Time
		if req.MeetingDate != "" {
			meetingDate, _ = time.Parse(time.RFC3339, req.MeetingDate)
			if meetingDate.IsZero() {
				meetingDate, _ = time.Parse("2006-01-02", req.MeetingDate)
			}
		}

		m := &domain.Meeting{
			ID:          id,
			Title:       req.Title,
			Agenda:      req.Agenda,
			MeetingDate: meetingDate,
			Location:    req.Location,
			MeetingType: req.MeetingType,
			Visibility:  req.Visibility,
			Status:      req.Status,
		}
		if req.Notes != "" {
			m.Notes = &req.Notes
		}

		updated, err := h.meetingUsecase.UpdateMeeting(r.Context(), m)
		if err != nil {
			if errors.Is(err, repository.ErrNotFound) {
				writeMeetingError(w, http.StatusNotFound, "meeting not found")
				return
			}
			writeMeetingError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeMeetingJSON(w, http.StatusOK, updated)

	case http.MethodDelete:
		if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
			writeMeetingError(w, http.StatusForbidden, "forbidden: insufficient permissions")
			return
		}

		err := h.meetingUsecase.DeleteMeeting(r.Context(), id)
		if err != nil {
			if errors.Is(err, repository.ErrNotFound) {
				writeMeetingError(w, http.StatusNotFound, "meeting not found")
				return
			}
			writeMeetingError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeMeetingJSON(w, http.StatusOK, map[string]string{"message": "meeting deleted successfully"})

	default:
		writeMeetingError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// HandleAttendees handles POST /api/v1/meetings/{id}/attendees and DELETE /api/v1/meetings/{id}/attendees/{attId}
func (h *MeetingHandler) HandleAttendees(w http.ResponseWriter, r *http.Request) {
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		writeMeetingError(w, http.StatusForbidden, "forbidden: insufficient permissions")
		return
	}

	meetingIDStr := r.PathValue("id")
	if meetingIDStr == "" {
		meetingIDStr = extractIDFromPath(r.URL.Path, "/api/v1/meetings")
	}
	meetingID, err := uuid.Parse(meetingIDStr)
	if err != nil {
		writeMeetingError(w, http.StatusBadRequest, "invalid meeting id")
		return
	}

	if r.Method == http.MethodPost {
		var req AddAttendeeRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeMeetingError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		att := &domain.MeetingAttendee{
			MeetingID:   meetingID,
			Name:        req.Name,
			RoleOrTitle: req.RoleOrTitle,
			Attended:    true,
		}
		if req.Attended != nil {
			att.Attended = *req.Attended
		}
		if req.ResidentID != nil && *req.ResidentID != "" {
			if resID, err := uuid.Parse(*req.ResidentID); err == nil {
				att.ResidentID = &resID
			}
		}
		if req.Notes != "" {
			att.Notes = &req.Notes
		}

		created, err := h.meetingUsecase.AddAttendee(r.Context(), att)
		if err != nil {
			writeMeetingError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeMeetingJSON(w, http.StatusCreated, created)
		return
	}

	writeMeetingError(w, http.StatusMethodNotAllowed, "method not allowed")
}

// HandleDecisions handles POST /api/v1/meetings/{id}/decisions
func (h *MeetingHandler) HandleDecisions(w http.ResponseWriter, r *http.Request) {
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		writeMeetingError(w, http.StatusForbidden, "forbidden: insufficient permissions")
		return
	}

	meetingIDStr := r.PathValue("id")
	if meetingIDStr == "" {
		meetingIDStr = extractIDFromPath(r.URL.Path, "/api/v1/meetings")
	}
	meetingID, err := uuid.Parse(meetingIDStr)
	if err != nil {
		writeMeetingError(w, http.StatusBadRequest, "invalid meeting id")
		return
	}

	if r.Method == http.MethodPost {
		var req AddDecisionRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeMeetingError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		d := &domain.MeetingDecision{
			MeetingID:    meetingID,
			DecisionText: req.DecisionText,
			Category:     req.Category,
		}
		created, err := h.meetingUsecase.AddDecision(r.Context(), d)
		if err != nil {
			writeMeetingError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeMeetingJSON(w, http.StatusCreated, created)
		return
	}

	writeMeetingError(w, http.StatusMethodNotAllowed, "method not allowed")
}

// HandleActionItems handles GET /api/v1/action-items and POST /api/v1/action-items
func (h *MeetingHandler) HandleActionItems(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		status := r.URL.Query().Get("status")
		items, err := h.meetingUsecase.ListActionItems(r.Context(), status, !isMeetingAdmin(r))
		if err != nil {
			writeMeetingError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if items == nil {
			items = []domain.MeetingActionItem{}
		}
		writeMeetingJSON(w, http.StatusOK, map[string]interface{}{"data": items})

	case http.MethodPost:
		if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
			writeMeetingError(w, http.StatusForbidden, "forbidden: insufficient permissions")
			return
		}

		var req ActionItemRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeMeetingError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		meetingID, err := uuid.Parse(req.MeetingID)
		if err != nil {
			writeMeetingError(w, http.StatusBadRequest, "invalid meeting_id")
			return
		}

		item := &domain.MeetingActionItem{
			MeetingID:    meetingID,
			Task:         req.Task,
			AssigneeName: req.AssigneeName,
			Status:       req.Status,
		}
		if req.DueDate != nil && strings.TrimSpace(*req.DueDate) != "" {
			d := strings.TrimSpace(*req.DueDate)
			item.DueDate = &d
		} else {
			item.DueDate = nil
		}
		if req.AssigneeResidentID != nil && *req.AssigneeResidentID != "" {
			if resID, err := uuid.Parse(*req.AssigneeResidentID); err == nil {
				item.AssigneeResidentID = &resID
			}
		}
		if req.Notes != "" {
			item.Notes = &req.Notes
		}

		created, err := h.meetingUsecase.CreateActionItem(r.Context(), item)
		if err != nil {
			writeMeetingError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeMeetingJSON(w, http.StatusCreated, created)

	default:
		writeMeetingError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// HandleActionItemByID handles PUT, DELETE for /api/v1/action-items/{id}
func (h *MeetingHandler) HandleActionItemByID(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	if idStr == "" {
		idStr = extractIDFromPath(r.URL.Path, "/api/v1/action-items")
	}
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeMeetingError(w, http.StatusBadRequest, "invalid action item id")
		return
	}

	switch r.Method {
	case http.MethodPut:
		if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
			writeMeetingError(w, http.StatusForbidden, "forbidden: insufficient permissions")
			return
		}

		var req ActionItemRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeMeetingError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		item := &domain.MeetingActionItem{
			ID:           id,
			Task:         req.Task,
			AssigneeName: req.AssigneeName,
			Status:       req.Status,
		}
		if req.DueDate != nil && strings.TrimSpace(*req.DueDate) != "" {
			d := strings.TrimSpace(*req.DueDate)
			item.DueDate = &d
		} else {
			item.DueDate = nil
		}
		if req.AssigneeResidentID != nil && *req.AssigneeResidentID != "" {
			if resID, err := uuid.Parse(*req.AssigneeResidentID); err == nil {
				item.AssigneeResidentID = &resID
			}
		}
		if req.Notes != "" {
			item.Notes = &req.Notes
		}

		updated, err := h.meetingUsecase.UpdateActionItem(r.Context(), item)
		if err != nil {
			if errors.Is(err, repository.ErrNotFound) {
				writeMeetingError(w, http.StatusNotFound, "action item not found")
				return
			}
			writeMeetingError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeMeetingJSON(w, http.StatusOK, updated)

	case http.MethodDelete:
		if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
			writeMeetingError(w, http.StatusForbidden, "forbidden: insufficient permissions")
			return
		}

		err := h.meetingUsecase.DeleteActionItem(r.Context(), id)
		if err != nil {
			if errors.Is(err, repository.ErrNotFound) {
				writeMeetingError(w, http.StatusNotFound, "action item not found")
				return
			}
			writeMeetingError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeMeetingJSON(w, http.StatusOK, map[string]string{"message": "action item deleted successfully"})

	default:
		writeMeetingError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// publicMeetingView is the anonymous-safe projection of a meeting: internal
// notes and creator identity are never exposed on the public feed.
type publicMeetingDecisionView struct {
	ID           uuid.UUID `json:"id"`
	DecisionText string    `json:"decision_text"`
	Category     string    `json:"category"`
}

type publicMeetingActionItemView struct {
	ID           uuid.UUID `json:"id"`
	Task         string    `json:"task"`
	AssigneeName string    `json:"assignee_name"`
	DueDate      *string   `json:"due_date,omitempty"`
	Status       string    `json:"status"`
}

type publicMeetingView struct {
	ID          uuid.UUID                     `json:"id"`
	Title       string                        `json:"title"`
	Agenda      string                        `json:"agenda"`
	MeetingDate time.Time                     `json:"meeting_date"`
	Location    string                        `json:"location"`
	MeetingType string                        `json:"meeting_type"`
	Status      string                        `json:"status"`
	Decisions   []publicMeetingDecisionView   `json:"decisions,omitempty"`
	ActionItems []publicMeetingActionItemView `json:"action_items,omitempty"`
}

// handlePublicTenantMeetings serves GET /api/v1/t/{slug}/meetings — the
// anonymous transparency feed. Only meetings with visibility='public' are
// returned, and only through a valid, active tenant slug.
func (h *MeetingHandler) handlePublicTenantMeetings(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")

	// Hostname/tenant consistency: on a tenant subdomain of the base domain,
	// the path slug must match the hostname tenant (else 404).
	if hostSlug, matched := middleware.HostnameSlug(r.Host, h.baseDomain); matched && hostSlug != slug {
		writeMeetingError(w, http.StatusNotFound, "tenant not found")
		return
	}

	tenant, err := h.tenantRepo.GetBySlug(r.Context(), slug)
	if err != nil || tenant == nil || !tenant.IsActive() {
		writeMeetingError(w, http.StatusNotFound, "tenant not found")
		return
	}

	r = r.WithContext(context.WithValue(r.Context(), domain.TenantContextKey, tenant))

	meetings, err := h.meetingUsecase.ListMeetings(r.Context(), "public")
	if err != nil {
		writeMeetingError(w, http.StatusInternalServerError, err.Error())
		return
	}

	view := make([]publicMeetingView, 0, len(meetings))
	for _, m := range meetings {
		fullMeeting, err := h.meetingUsecase.GetMeetingByID(r.Context(), m.ID)
		var decisions []publicMeetingDecisionView
		var actions []publicMeetingActionItemView
		if err == nil && fullMeeting != nil {
			for _, d := range fullMeeting.Decisions {
				decisions = append(decisions, publicMeetingDecisionView{
					ID:           d.ID,
					DecisionText: d.DecisionText,
					Category:     d.Category,
				})
			}
			for _, a := range fullMeeting.ActionItems {
				actions = append(actions, publicMeetingActionItemView{
					ID:           a.ID,
					Task:         a.Task,
					AssigneeName: a.AssigneeName,
					DueDate:      a.DueDate,
					Status:       a.Status,
				})
			}
		}

		view = append(view, publicMeetingView{
			ID:          m.ID,
			Title:       m.Title,
			Agenda:      m.Agenda,
			MeetingDate: m.MeetingDate,
			Location:    m.Location,
			MeetingType: m.MeetingType,
			Status:      m.Status,
			Decisions:   decisions,
			ActionItems: actions,
		})
	}

	writeMeetingJSON(w, http.StatusOK, map[string]interface{}{"data": view})
}

func (h *MeetingHandler) RegisterRoutes(mux *http.ServeMux, tenantMw func(http.Handler) http.Handler, authMw func(http.Handler) http.Handler) {
	// Public tenant route: /api/v1/t/{slug}/meetings — anonymous transparency
	// feed, strictly limited to meetings with visibility='public'.
	mux.HandleFunc("GET /api/v1/t/{slug}/meetings", h.handlePublicTenantMeetings)

	meetingHandler := authMw(tenantMw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/api/v1/meetings")
		path = strings.TrimPrefix(path, "/")

		if path == "" {
			h.HandleMeetings(w, r)
			return
		}

		parts := strings.Split(path, "/")
		if len(parts) == 1 {
			h.HandleMeetingByID(w, r)
			return
		}

		if len(parts) >= 2 {
			switch parts[1] {
			case "attendees":
				h.HandleAttendees(w, r)
				return
			case "decisions":
				h.HandleDecisions(w, r)
				return
			}
		}

		writeMeetingError(w, http.StatusNotFound, "not found")
	})))

	actionHandler := authMw(tenantMw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/api/v1/action-items")
		path = strings.TrimPrefix(path, "/")

		if path == "" {
			h.HandleActionItems(w, r)
			return
		}

		parts := strings.Split(path, "/")
		if len(parts) == 1 {
			h.HandleActionItemByID(w, r)
			return
		}

		writeMeetingError(w, http.StatusNotFound, "not found")
	})))

	mux.Handle("/api/v1/meetings", meetingHandler)
	mux.Handle("/api/v1/meetings/", meetingHandler)
	mux.Handle("/api/v1/action-items", actionHandler)
	mux.Handle("/api/v1/action-items/", actionHandler)
}
