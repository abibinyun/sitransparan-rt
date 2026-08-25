package http

import (
	"encoding/json"
	"net/http"

	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"

	"github.com/google/uuid"
)

// PushHandler menangani langganan Web Push + badge partisipasi (Fase 4).
type PushHandler struct {
	usecase domain.PushUsecase
}

func NewPushHandler(usecase domain.PushUsecase) *PushHandler {
	return &PushHandler{usecase: usecase}
}

// handleConfig: publik — kunci VAPID + status fitur (untuk UI consent).
func (h *PushHandler) handleConfig(w http.ResponseWriter, r *http.Request) {
	key, enabled := h.usecase.Config(r.Context())
	writeSocialJSON(w, http.StatusOK, map[string]interface{}{
		"enabled":     enabled,
		"public_key":  key,
	})
}

// handleSubscribe: simpan langganan — identitas dari JWT.
func (h *PushHandler) handleSubscribe(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r.Context())
	if userID == uuid.Nil {
		writeSocialError(w, http.StatusUnauthorized, "login diperlukan")
		return
	}
	if r.Method != http.MethodPost {
		writeSocialError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var req struct {
		Endpoint   string `json:"endpoint"`
		P256DH     string `json:"keys_p256dh"`
		Auth       string `json:"keys_auth"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeSocialError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	sub := &domain.PushSubscription{
		UserID:    userID,
		Endpoint:  req.Endpoint,
		P256DH:    req.P256DH,
		Auth:      req.Auth,
		UserAgent: r.UserAgent(),
	}
	if err := h.usecase.Subscribe(r.Context(), sub); err != nil {
		writeSocialError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeSocialJSON(w, http.StatusCreated, map[string]string{"message": "subscribed"})
}

// handleUnsubscribe: hapus langganan milik sendiri.
func (h *PushHandler) handleUnsubscribe(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r.Context())
	if userID == uuid.Nil {
		writeSocialError(w, http.StatusUnauthorized, "login diperlukan")
		return
	}
	var req struct {
		Endpoint string `json:"endpoint"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Endpoint == "" {
		writeSocialError(w, http.StatusBadRequest, "endpoint is required")
		return
	}
	if err := h.usecase.Unsubscribe(r.Context(), req.Endpoint, userID); err != nil {
		writeSocialError(w, http.StatusNotFound, "subscription not found")
		return
	}
	writeSocialJSON(w, http.StatusOK, map[string]string{"message": "unsubscribed"})
}

// handleBadge: badge partisipasi warga dari data nyata.
func (h *PushHandler) handleBadge(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r.Context())
	if userID == uuid.Nil {
		writeSocialError(w, http.StatusUnauthorized, "login diperlukan")
		return
	}
	badge, err := h.usecase.Badge(r.Context(), userID)
	if err != nil {
		writeSocialError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeSocialJSON(w, http.StatusOK, badge)
}

func (h *PushHandler) RegisterRoutes(mux *http.ServeMux, authMw func(http.Handler) http.Handler) {
	mux.HandleFunc("GET /api/v1/push/config", h.handleConfig)
	mux.Handle("POST /api/v1/push/subscribe", authMw(http.HandlerFunc(h.handleSubscribe)))
	mux.Handle("POST /api/v1/push/unsubscribe", authMw(http.HandlerFunc(h.handleUnsubscribe)))
	mux.Handle("GET /api/v1/social/badge", authMw(http.HandlerFunc(h.handleBadge)))
}
