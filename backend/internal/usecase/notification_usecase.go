package usecase

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"backend/internal/domain"
)

type NotificationUsecase interface {
	Dispatch(ctx context.Context, tenantID uuid.UUID, userID *uuid.UUID, title, body, category, actionURL string, metadata map[string]interface{}) error
	ListNotifications(ctx context.Context, userID uuid.UUID, unreadOnly bool, limit, offset int) ([]*domain.Notification, int64, error)
	MarkAsRead(ctx context.Context, id, userID uuid.UUID) error
	MarkAllAsRead(ctx context.Context, userID uuid.UUID) error
	GetUnreadCount(ctx context.Context, userID uuid.UUID) (int64, error)
}

type notificationUsecase struct {
	repo   domain.NotificationRepository
	pushUC domain.PushUsecase
}

func NewNotificationUsecase(repo domain.NotificationRepository, pushUC domain.PushUsecase) NotificationUsecase {
	return &notificationUsecase{
		repo:   repo,
		pushUC: pushUC,
	}
}

func (u *notificationUsecase) Dispatch(ctx context.Context, tenantID uuid.UUID, userID *uuid.UUID, title, body, category, actionURL string, metadata map[string]interface{}) error {
	var metaBytes []byte
	if metadata != nil {
		metaBytes, _ = json.Marshal(metadata)
	}

	notif := &domain.Notification{
		ID:        uuid.New(),
		UserID:    userID,
		Title:     title,
		Body:      body,
		Category:  category,
		ActionURL: actionURL,
		IsRead:    false,
		Metadata:  metaBytes,
		CreatedAt: time.Now(),
	}

	// 1. Simpan permanen ke database tabel notifications
	if err := u.repo.Create(ctx, notif); err != nil {
		return err
	}

	// 2. Kirim Web Push jika push service tersedia
	if u.pushUC != nil {
		_ = u.pushUC.BroadcastTenant(ctx, tenantID, title, body, actionURL)
	}

	return nil
}

func (u *notificationUsecase) ListNotifications(ctx context.Context, userID uuid.UUID, unreadOnly bool, limit, offset int) ([]*domain.Notification, int64, error) {
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	return u.repo.ListByUser(ctx, userID, unreadOnly, limit, offset)
}

func (u *notificationUsecase) MarkAsRead(ctx context.Context, id, userID uuid.UUID) error {
	return u.repo.MarkAsRead(ctx, id, userID)
}

func (u *notificationUsecase) MarkAllAsRead(ctx context.Context, userID uuid.UUID) error {
	return u.repo.MarkAllAsRead(ctx, userID)
}

func (u *notificationUsecase) GetUnreadCount(ctx context.Context, userID uuid.UUID) (int64, error) {
	return u.repo.GetUnreadCount(ctx, userID)
}
