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

// handleSubscribe: simpan langganan — mendukung user ber-JWT maupun warga publik.
func (h *PushHandler) handleSubscribe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeSocialError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var req struct {
		TenantSlug string `json:"tenant_slug"`
		Endpoint   string `json:"endpoint"`
		P256DH     string `json:"keys_p256dh"`
		Auth       string `json:"keys_auth"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeSocialError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	userID := middleware.GetUserIDFromContext(r.Context())
	var uIDPtr *uuid.UUID
	if userID != uuid.Nil {
		uIDPtr = &userID
	}

	var tIDPtr *uuid.UUID
	tenantCtx := middleware.GetTenantFromContext(r.Context())
	if tenantCtx != nil && tenantCtx.ID != uuid.Nil {
		tIDPtr = &tenantCtx.ID
	}

	sub := &domain.PushSubscription{
		UserID:    uIDPtr,
		TenantID:  tIDPtr,
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
	var req struct {
		Endpoint string `json:"endpoint"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Endpoint == "" {
		writeSocialError(w, http.StatusBadRequest, "endpoint is required")
		return
	}
	userID := middleware.GetUserIDFromContext(r.Context())
	if userID != uuid.Nil {
		if err := h.usecase.Unsubscribe(r.Context(), req.Endpoint, userID); err != nil {
			// fallback hapus by endpoint
			_ = h.usecase.Unsubscribe(r.Context(), req.Endpoint, uuid.Nil)
		}
	} else {
		// Public unsubscribe
		_ = h.usecase.Unsubscribe(r.Context(), req.Endpoint, uuid.Nil)
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

func (h *PushHandler) RegisterRoutes(mux *http.ServeMux, authMw func(http.Handler) http.Handler, tenantMw func(http.Handler) http.Handler) {
	mux.HandleFunc("GET /api/v1/push/config", h.handleConfig)
	mux.Handle("POST /api/v1/push/subscribe", authMw(tenantMw(http.HandlerFunc(h.handleSubscribe))))
	mux.Handle("POST /api/v1/push/unsubscribe", authMw(tenantMw(http.HandlerFunc(h.handleUnsubscribe))))
	mux.Handle("GET /api/v1/social/badge", authMw(http.HandlerFunc(h.handleBadge)))
}
