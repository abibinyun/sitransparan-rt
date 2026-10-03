package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Notification struct {
	ID        uuid.UUID  `json:"id"`
	UserID    *uuid.UUID `json:"user_id,omitempty"` // nil = broadcast untuk semua warga tenant
	Title     string     `json:"title"`
	Body      string     `json:"body"`
	Category  string     `json:"category"` // announcement, comment_reply, mention, emergency, dues, waste
	ActionURL string     `json:"action_url"`
	IsRead    bool       `json:"is_read"`
	ReadAt    *time.Time `json:"read_at,omitempty"`
	Metadata  []byte     `json:"metadata,omitempty"` // JSONB payload
	CreatedAt time.Time  `json:"created_at"`
}

type NotificationRepository interface {
	Create(ctx context.Context, n *Notification) error
	ListByUser(ctx context.Context, userID uuid.UUID, unreadOnly bool, limit, offset int) ([]*Notification, int64, error)
	MarkAsRead(ctx context.Context, id, userID uuid.UUID) error
	MarkAllAsRead(ctx context.Context, userID uuid.UUID) error
	GetUnreadCount(ctx context.Context, userID uuid.UUID) (int64, error)
}
