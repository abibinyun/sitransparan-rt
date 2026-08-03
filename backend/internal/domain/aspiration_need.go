package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Aspiration struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenant_id"`
	ResidentID  *uuid.UUID `json:"resident_id,omitempty"`
	Title       string     `json:"title"`
	Content     string     `json:"content"`
	Category    string     `json:"category"`    // 'suggestion', 'complaint', 'question'
	Status      string     `json:"status"`      // 'submitted', 'under_review', 'resolved', 'rejected'
	IsAnonymous bool       `json:"is_anonymous"`
	Response    *string    `json:"response,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type CommunityNeed struct {
	ID            uuid.UUID `json:"id"`
	TenantID      uuid.UUID `json:"tenant_id"`
	Title         string    `json:"title"`
	Description   *string   `json:"description,omitempty"`
	EstimatedCost float64   `json:"estimated_cost"`
	Status        string    `json:"status"` // 'proposed', 'approved', 'in_progress', 'completed'
	ProgressNotes *string   `json:"progress_notes,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type EventSponsor struct {
	ID        uuid.UUID `json:"id"`
	EventID   uuid.UUID `json:"event_id"`
	Name      string    `json:"name"`
	Amount    float64   `json:"amount"`
	Type      string    `json:"type"` // 'cash', 'goods', 'service'
	Notes     *string   `json:"notes,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type AspirationNeedRepository interface {
	CreateAspiration(ctx context.Context, asp *Aspiration) error
	GetAspirationByID(ctx context.Context, tenantID, id uuid.UUID) (*Aspiration, error)
	ListAspirations(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*Aspiration, int64, error)
	UpdateAspiration(ctx context.Context, asp *Aspiration) error

	CreateCommunityNeed(ctx context.Context, need *CommunityNeed) error
	GetCommunityNeedByID(ctx context.Context, tenantID, id uuid.UUID) (*CommunityNeed, error)
	ListCommunityNeeds(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*CommunityNeed, int64, error)
	UpdateCommunityNeed(ctx context.Context, need *CommunityNeed) error

	CreateEventSponsor(ctx context.Context, sponsor *EventSponsor) error
	ListEventSponsorsByEventID(ctx context.Context, tenantID, eventID uuid.UUID) ([]*EventSponsor, error)
	DeleteEventSponsor(ctx context.Context, tenantID, sponsorID uuid.UUID) error
}

type AspirationNeedUsecase interface {
	SubmitAspiration(ctx context.Context, tenantID uuid.UUID, asp *Aspiration) error
	GetAspiration(ctx context.Context, tenantID, id uuid.UUID) (*Aspiration, error)
	ListAspirations(ctx context.Context, tenantID uuid.UUID, isPublic bool, limit, offset int) ([]*Aspiration, int64, error)
	UpdateAspirationStatus(ctx context.Context, tenantID, id uuid.UUID, status string, response *string) (*Aspiration, error)

	CreateCommunityNeed(ctx context.Context, tenantID uuid.UUID, need *CommunityNeed) error
	GetCommunityNeed(ctx context.Context, tenantID, id uuid.UUID) (*CommunityNeed, error)
	ListCommunityNeeds(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*CommunityNeed, int64, error)
	UpdateCommunityNeed(ctx context.Context, tenantID uuid.UUID, need *CommunityNeed) error

	CreateEventSponsor(ctx context.Context, tenantID uuid.UUID, sponsor *EventSponsor) error
	ListEventSponsors(ctx context.Context, tenantID, eventID uuid.UUID) ([]*EventSponsor, error)
	DeleteEventSponsor(ctx context.Context, tenantID, sponsorID uuid.UUID) error
}
