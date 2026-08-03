package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Event struct {
	ID          uuid.UUID   `json:"id"`
	TenantID    uuid.UUID   `json:"tenant_id"`
	Title       string      `json:"title"`
	Description *string     `json:"description,omitempty"`
	EventDate   *time.Time  `json:"event_date,omitempty"`
	Location    *string     `json:"location,omitempty"`
	Status      string      `json:"status"` // 'planned', 'ongoing', 'completed', 'cancelled'
	CreatedBy   *uuid.UUID  `json:"created_by,omitempty"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

type EventBudget struct {
	ID            uuid.UUID `json:"id"`
	EventID       uuid.UUID `json:"event_id"`
	Description   string    `json:"description"`
	EstimatedCost float64   `json:"estimated_cost"`
	ActualCost    float64   `json:"actual_cost"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type EventParticipant struct {
	ID         uuid.UUID `json:"id"`
	EventID    uuid.UUID `json:"event_id"`
	ResidentID uuid.UUID `json:"resident_id"`
	Status     string    `json:"status"` // 'attending', 'absent', 'maybe'
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type EventRepository interface {
	CreateEvent(ctx context.Context, event *Event) error
	GetEventByID(ctx context.Context, tenantID, id uuid.UUID) (*Event, error)
	UpdateEvent(ctx context.Context, event *Event) error
	DeleteEvent(ctx context.Context, tenantID, id uuid.UUID) error
	ListEvents(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*Event, int64, error)

	AddOrUpdateBudget(ctx context.Context, budget *EventBudget) error
	GetBudgetByEventID(ctx context.Context, eventID uuid.UUID) (*EventBudget, error)

	AddOrUpdateParticipant(ctx context.Context, participant *EventParticipant) error
	ListParticipantsByEventID(ctx context.Context, eventID uuid.UUID) ([]*EventParticipant, error)
}

type EventUsecase interface {
	CreateEvent(ctx context.Context, tenantID uuid.UUID, event *Event) error
	ListEvents(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*Event, int64, error)
	GetEvent(ctx context.Context, tenantID, id uuid.UUID) (*Event, error)
	UpdateEvent(ctx context.Context, tenantID uuid.UUID, event *Event) error
	DeleteEvent(ctx context.Context, tenantID, id uuid.UUID) error

	AddOrUpdateBudget(ctx context.Context, tenantID, eventID uuid.UUID, budget *EventBudget) error
	RSVP(ctx context.Context, tenantID, eventID uuid.UUID, participant *EventParticipant) error
}
