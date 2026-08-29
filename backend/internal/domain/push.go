package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// PushSubscription menyimpan langganan Web Push satu perangkat per user atau warga publik.
type PushSubscription struct {
	ID        uuid.UUID  `json:"id"`
	UserID    *uuid.UUID `json:"user_id,omitempty"`
	TenantID  *uuid.UUID `json:"tenant_id,omitempty"`
	Endpoint  string     `json:"endpoint"`
	P256DH    string     `json:"p256dh"`
	Auth      string     `json:"auth"`
	UserAgent string     `json:"user_agent,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

// ParticipationBadge: gamifikasi partisipasi warga (Fase 4).
// Dihitung dari data nyata: reaksi yang diberikan + suara polling.
type ParticipationBadge struct {
	ReactionsGiven int64  `json:"reactions_given"`
	VotesCast      int64  `json:"votes_cast"`
	Total          int64  `json:"total"`
	Level          string `json:"level"`
}

type PushRepository interface {
	Upsert(ctx context.Context, sub *PushSubscription) error
	Delete(ctx context.Context, endpoint string, userID uuid.UUID) error
	DeleteByEndpoint(ctx context.Context, endpoint string) error
	ListByUser(ctx context.Context, userID uuid.UUID) ([]*PushSubscription, error)
	ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]*PushSubscription, error)
	CountReactionsGiven(ctx context.Context, userID uuid.UUID) (int64, error)
	CountVotesCast(ctx context.Context, userID uuid.UUID) (int64, error)
}

type PushUsecase interface {
	Subscribe(ctx context.Context, sub *PushSubscription) error
	Unsubscribe(ctx context.Context, endpoint string, userID uuid.UUID) error
	Config(ctx context.Context) (publicKey string, enabled bool)
	// Broadcast mengirim push ke semua langganan user yang ter-mapping tenant.
	BroadcastTenant(ctx context.Context, tenantID uuid.UUID, title, body, url string) error
	Badge(ctx context.Context, userID uuid.UUID) (*ParticipationBadge, error)
}
