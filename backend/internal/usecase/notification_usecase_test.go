package usecase_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"backend/internal/domain"
	"backend/internal/usecase"
)

type mockNotificationRepo struct {
	items map[uuid.UUID]*domain.Notification
}

func newMockNotificationRepo() *mockNotificationRepo {
	return &mockNotificationRepo{items: make(map[uuid.UUID]*domain.Notification)}
}

func (m *mockNotificationRepo) Create(ctx context.Context, n *domain.Notification) error {
	m.items[n.ID] = n
	return nil
}

func (m *mockNotificationRepo) ListByUser(ctx context.Context, userID uuid.UUID, unreadOnly bool, limit, offset int) ([]*domain.Notification, int64, error) {
	var list []*domain.Notification
	for _, n := range m.items {
		if n.UserID != nil && *n.UserID != userID {
			continue
		}
		if unreadOnly && n.IsRead {
			continue
		}
		list = append(list, n)
	}
	return list, int64(len(list)), nil
}

func (m *mockNotificationRepo) MarkAsRead(ctx context.Context, id, userID uuid.UUID) error {
	if n, ok := m.items[id]; ok {
		now := time.Now()
		n.IsRead = true
		n.ReadAt = &now
	}
	return nil
}

func (m *mockNotificationRepo) MarkAllAsRead(ctx context.Context, userID uuid.UUID) error {
	now := time.Now()
	for _, n := range m.items {
		if n.UserID == nil || *n.UserID == userID {
			n.IsRead = true
			n.ReadAt = &now
		}
	}
	return nil
}

func (m *mockNotificationRepo) GetUnreadCount(ctx context.Context, userID uuid.UUID) (int64, error) {
	var count int64
	for _, n := range m.items {
		if (n.UserID == nil || *n.UserID == userID) && !n.IsRead {
			count++
		}
	}
	return count, nil
}

func TestNotificationUsecase_DispatchAndRead(t *testing.T) {
	repo := newMockNotificationRepo()
	uc := usecase.NewNotificationUsecase(repo, nil) // pushUC nil fallback
	ctx := context.Background()
	tenantID := uuid.New()
	userID := uuid.New()

	// 1. Dispatch notifikasi ke user tertentu
	err := uc.Dispatch(ctx, tenantID, &userID, "Tagihan Iuran", "Iuran bulan Oktober telah terbit", "dues", "/admin/financial", nil)
	if err != nil {
		t.Fatalf("Dispatch failed: %v", err)
	}

	// 2. Cek unread count
	count, err := uc.GetUnreadCount(ctx, userID)
	if err != nil || count != 1 {
		t.Fatalf("expected unread count 1, got %d", count)
	}

	// 3. List notifikasi
	list, total, err := uc.ListNotifications(ctx, userID, false, 10, 0)
	if err != nil || total != 1 || len(list) != 1 {
		t.Fatalf("expected 1 notification in list, got %d", total)
	}

	// 4. Mark all as read
	err = uc.MarkAllAsRead(ctx, userID)
	if err != nil {
		t.Fatalf("MarkAllAsRead failed: %v", err)
	}

	count, _ = uc.GetUnreadCount(ctx, userID)
	if count != 0 {
		t.Errorf("expected 0 unread count after MarkAllAsRead, got %d", count)
	}
}
