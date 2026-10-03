package repository_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"backend/internal/domain"
	"backend/internal/repository"
)

func TestNotificationRepository_Memory(t *testing.T) {
	// Tes unit contract repository
	repo := repository.NewMemoryNotificationRepository()
	ctx := context.Background()
	userID := uuid.New()

	// 1. Simpan Notifikasi
	n1 := &domain.Notification{
		ID:        uuid.New(),
		UserID:    &userID,
		Title:     "Iuran Berhasil",
		Body:      "Iuran Anda telah diverifikasi",
		Category:  "dues",
		ActionURL: "/admin/financial",
		IsRead:    false,
		CreatedAt: time.Now(),
	}
	err := repo.Create(ctx, n1)
	if err != nil {
		t.Fatalf("Create notification failed: %v", err)
	}

	// 2. Unread count harus 1
	count, err := repo.GetUnreadCount(ctx, userID)
	if err != nil || count != 1 {
		t.Fatalf("expected unread count 1, got %d", count)
	}

	// 3. Mark as read
	err = repo.MarkAsRead(ctx, n1.ID, userID)
	if err != nil {
		t.Fatalf("MarkAsRead failed: %v", err)
	}

	// 4. Unread count harus 0
	count, _ = repo.GetUnreadCount(ctx, userID)
	if count != 0 {
		t.Fatalf("expected unread count 0, got %d", count)
	}
}
