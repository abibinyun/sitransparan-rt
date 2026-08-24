package http

import (
	"context"
	"encoding/json"
	"net/http"

	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"

	"github.com/google/uuid"
)

// SocialHandler menangani reaksi & polling — fitur interaktivitas Fase 3.
//
// Gerbang keamanan (konsep portal §7):
//   - Semua aksi tulis (reaksi/vote) butuh JWT + tenant context: identitas
//     diambil dari claims, TIDAK dari body.
//   - Kelola polling (create/close) = admin saja.
//   - Hasil agregat publik via route /t/{slug}/polls/{id} (tanpa my_vote).
type SocialHandler struct {
	usecase    domain.SocialUsecase
	tenantRepo domain.TenantRepository
	baseDomain string
}

func NewSocialHandler(usecase domain.SocialUsecase, tenantRepo domain.TenantRepository, baseDomain string) *SocialHandler {
	return &SocialHandler{usecase: usecase, tenantRepo: tenantRepo, baseDomain: baseDomain}
}

func writeSocialJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeSocialError(w http.ResponseWriter, status int, msg string) {
	writeSocialJSON(w, status, map[string]string{"error": msg})
}

// resolvePublicTenant memvalidasi slug publik + konsistensi hostname
// (pola yang sama dengan handler publik lain). Mengembalikan request dengan
// tenant di context.
func (h *SocialHandler) resolvePublicTenant(w http.ResponseWriter, r *http.Request) (*http.Request, bool) {
	slug := r.PathValue("slug")
	if hostSlug, matched := middleware.HostnameSlug(r.Host, h.baseDomain); matched && hostSlug != slug {
		writeSocialError(w, http.StatusNotFound, "tenant not found")
		return nil, false
	}
	tenant, err := h.tenantRepo.GetBySlug(r.Context(), slug)
	if err != nil || tenant == nil || !tenant.IsActive() {
		writeSocialError(w, http.StatusNotFound, "tenant not found")
		return nil, false
	}
	return r.WithContext(context.WithValue(r.Context(), domain.TenantContextKey, tenant)), true
}

// handleReactions: GET summary, POST set, DELETE remove — semua butuh login.
func (h *SocialHandler) handleReactions(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r.Context())
	if userID == uuid.Nil {
		writeSocialError(w, http.StatusUnauthorized, "login diperlukan untuk berinteraksi")
		return
	}

	targetType := r.URL.Query().Get("target_type")
	if targetType == "" && r.Method != http.MethodPost {
		writeSocialError(w, http.StatusBadRequest, "target_type is required")
		return
	}
	targetIDStr := r.URL.Query().Get("target_id")
	if r.Method != http.MethodPost {
		id, err := uuid.Parse(targetIDStr)
		if err != nil {
			writeSocialError(w, http.StatusBadRequest, "invalid target_id")
			return
		}
		switch r.Method {
		case http.MethodGet:
			summary, err := h.usecase.Summary(r.Context(), targetType, id, userID)
			if err != nil {
				writeSocialError(w, http.StatusBadRequest, err.Error())
				return
			}
			writeSocialJSON(w, http.StatusOK, summary)
		case http.MethodDelete:
			if err := h.usecase.Unreact(r.Context(), targetType, id, userID); err != nil {
				writeSocialError(w, http.StatusBadRequest, err.Error())
				return
			}
			summary, err := h.usecase.Summary(r.Context(), targetType, id, userID)
			if err != nil {
				writeSocialJSON(w, http.StatusOK, map[string]string{"message": "reaction removed"})
				return
			}
			writeSocialJSON(w, http.StatusOK, summary)
		default:
			writeSocialError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
		return
	}

	// POST: identitas dari JWT, bukan body
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT, domain.RoleResident) {
		writeSocialError(w, http.StatusForbidden, "forbidden")
		return
	}
	var req struct {
		TargetType string `json:"target_type"`
		TargetID   string `json:"target_id"`
		Reaction   string `json:"reaction"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeSocialError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	targetID, err := uuid.Parse(req.TargetID)
	if err != nil {
		writeSocialError(w, http.StatusBadRequest, "invalid target_id")
		return
	}
	rx := &domain.Reaction{
		TargetType: req.TargetType,
		TargetID:   targetID,
		UserID:     userID,
		Reaction:   req.Reaction,
	}
	if err := h.usecase.React(r.Context(), rx); err != nil {
		writeSocialError(w, http.StatusBadRequest, err.Error())
		return
	}
	summary, err := h.usecase.Summary(r.Context(), rx.TargetType, rx.TargetID, userID)
	if err != nil {
		writeSocialJSON(w, http.StatusCreated, map[string]string{"message": "reaction saved"})
		return
	}
	writeSocialJSON(w, http.StatusOK, summary)
}

// handlePolls: GET list open (login: dengan my_vote), POST create (admin).
func (h *SocialHandler) handlePolls(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r.Context())
	role := middleware.GetRoleFromContext(r.Context())

	switch r.Method {
	case http.MethodGet:
		includeViewer := userID != uuid.Nil
		var viewer uuid.UUID
		if includeViewer {
			viewer = userID
		}
		polls, err := h.usecase.OpenPolls(r.Context(), viewer, includeViewer)
		if err != nil {
			writeSocialError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if polls == nil {
			polls = []*domain.Poll{}
		}
		writeSocialJSON(w, http.StatusOK, map[string]interface{}{"data": polls})

	case http.MethodPost:
		if role != domain.RoleSuperAdmin && role != domain.RoleAdminRT {
			writeSocialError(w, http.StatusForbidden, "forbidden: admin only")
			return
		}
		var req struct {
			Question string   `json:"question"`
			Options  []string `json:"options"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeSocialError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		poll := &domain.Poll{Question: req.Question, Options: req.Options, CreatedBy: &userID}
		if err := h.usecase.CreatePoll(r.Context(), poll); err != nil {
			writeSocialError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeSocialJSON(w, http.StatusCreated, poll)

	default:
		writeSocialError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// handlePollByID: GET detail (login: my_vote), DELETE close (admin).
func (h *SocialHandler) handlePollByID(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeSocialError(w, http.StatusBadRequest, "invalid poll id")
		return
	}
	userID := middleware.GetUserIDFromContext(r.Context())
	role := middleware.GetRoleFromContext(r.Context())

	switch r.Method {
	case http.MethodGet:
		includeViewer := userID != uuid.Nil
		var viewer uuid.UUID
		if includeViewer {
			viewer = userID
		}
		poll, err := h.usecase.Poll(r.Context(), id, viewer, includeViewer)
		if err != nil {
			writeSocialError(w, http.StatusNotFound, "poll not found")
			return
		}
		writeSocialJSON(w, http.StatusOK, poll)

	case http.MethodDelete:
		if role != domain.RoleSuperAdmin && role != domain.RoleAdminRT {
			writeSocialError(w, http.StatusForbidden, "forbidden: admin only")
			return
		}
		if err := h.usecase.ClosePoll(r.Context(), id); err != nil {
			writeSocialError(w, http.StatusNotFound, "poll not found")
			return
		}
		writeSocialJSON(w, http.StatusOK, map[string]string{"message": "poll closed"})

	default:
		writeSocialError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// handleVote: POST satu suara — warga login, 1 orang 1 suara (unique constraint).
func (h *SocialHandler) handleVote(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r.Context())
	if userID == uuid.Nil {
		writeSocialError(w, http.StatusUnauthorized, "login diperlukan untuk memberi suara")
		return
	}
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT, domain.RoleResident) {
		writeSocialError(w, http.StatusForbidden, "forbidden")
		return
	}
	pollID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeSocialError(w, http.StatusBadRequest, "invalid poll id")
		return
	}
	var req struct {
		OptionIndex *int `json:"option_index"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.OptionIndex == nil {
		writeSocialError(w, http.StatusBadRequest, "option_index is required")
		return
	}
	if err := h.usecase.Vote(r.Context(), pollID, userID, *req.OptionIndex); err != nil {
		writeSocialError(w, http.StatusBadRequest, err.Error())
		return
	}
	poll, err := h.usecase.Poll(r.Context(), pollID, userID, true)
	if err != nil {
		writeSocialJSON(w, http.StatusOK, map[string]string{"message": "vote saved"})
		return
	}
	writeSocialJSON(w, http.StatusOK, poll)
}

// handlePublicPollResults: hasil AGREGAT tanpa login (tanpa my_vote).
func (h *SocialHandler) handlePublicPollResults(w http.ResponseWriter, r *http.Request) {
	r, ok := h.resolvePublicTenant(w, r)
	if !ok {
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeSocialError(w, http.StatusBadRequest, "invalid poll id")
		return
	}
	poll, err := h.usecase.Poll(r.Context(), id, uuid.Nil, false)
	if err != nil {
		writeSocialError(w, http.StatusNotFound, "poll not found")
		return
	}
	writeSocialJSON(w, http.StatusOK, poll)
}

// RegisterRoutes mendaftarkan route sosial. rateLimiter memperketat budget
// endpoint interaksi (anti-spam, konsep portal §7.3).
func (h *SocialHandler) RegisterRoutes(
	mux *http.ServeMux,
	tenantMw func(http.Handler) http.Handler,
	authMw func(http.Handler) http.Handler,
	rateLimiter func(http.Handler) http.Handler,
) {
	// Interaksi (login + budget ketat)
	mux.Handle("/api/v1/reactions", authMw(rateLimiter(tenantMw(http.HandlerFunc(h.handleReactions)))))
	mux.Handle("/api/v1/polls", authMw(rateLimiter(tenantMw(http.HandlerFunc(h.handlePolls)))))
	mux.Handle("/api/v1/polls/{id}", authMw(rateLimiter(tenantMw(http.HandlerFunc(h.handlePollByID)))))
	mux.Handle("POST /api/v1/polls/{id}/vote", authMw(rateLimiter(tenantMw(http.HandlerFunc(h.handleVote)))))

	// Hasil agregat publik
	mux.HandleFunc("GET /api/v1/t/{slug}/polls/{id}", h.handlePublicPollResults)
}
