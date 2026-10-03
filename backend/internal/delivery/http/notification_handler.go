package http

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"
	"backend/internal/usecase"
)

type NotificationHandler struct {
	usecase usecase.NotificationUsecase
}

func NewNotificationHandler(uc usecase.NotificationUsecase) *NotificationHandler {
	return &NotificationHandler{usecase: uc}
}

func (h *NotificationHandler) RegisterRoutes(mux *http.ServeMux, tenantMw, authMw func(http.Handler) http.Handler) {
	handler := authMw(tenantMw(http.HandlerFunc(h.handleNotifications)))
	mux.Handle("/api/v1/notifications", handler)
	mux.Handle("/api/v1/notifications/", handler)
	mux.Handle("/api/v1/notifications/read-all", handler)
	mux.Handle("/api/v1/notifications/unread-count", handler)
}

func (h *NotificationHandler) handleNotifications(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r.Context())
	if userID == uuid.Nil {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/notifications")
	path = strings.TrimPrefix(path, "/")

	// 1. Unread count endpoint
	if path == "unread-count" && r.Method == http.MethodGet {
		count, err := h.usecase.GetUnreadCount(r.Context(), userID)
		if err != nil {
			http.Error(w, `{"error":"failed to get unread count"}`, http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"unread_count": count})
		return
	}

	// 2. Mark all as read endpoint
	if path == "read-all" && r.Method == http.MethodPost {
		err := h.usecase.MarkAllAsRead(r.Context(), userID)
		if err != nil {
			http.Error(w, `{"error":"failed to mark all as read"}`, http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "all marked as read"})
		return
	}

	// 3. Mark single as read: POST /notifications/{id}/read
	if strings.HasSuffix(path, "/read") && r.Method == http.MethodPost {
		idStr := strings.TrimSuffix(path, "/read")
		idStr = strings.TrimPrefix(idStr, "/")
		id, err := uuid.Parse(idStr)
		if err != nil {
			http.Error(w, `{"error":"invalid notification id"}`, http.StatusBadRequest)
			return
		}
		if err := h.usecase.MarkAsRead(r.Context(), id, userID); err != nil {
			http.Error(w, `{"error":"failed to mark as read"}`, http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "marked as read"})
		return
	}

	// 4. List notifications: GET /notifications?unread=true&limit=20&offset=0
	if path == "" && r.Method == http.MethodGet {
		unreadOnly := r.URL.Query().Get("unread") == "true"
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

		list, total, err := h.usecase.ListNotifications(r.Context(), userID, unreadOnly, limit, offset)
		if err != nil {
			http.Error(w, `{"error":"failed to list notifications"}`, http.StatusInternalServerError)
			return
		}

		if list == nil {
			list = []*domain.Notification{}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"data":   list,
			"total":  total,
			"limit":  limit,
			"offset": offset,
		})
		return
	}

	http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
}
