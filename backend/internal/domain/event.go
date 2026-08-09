package domain

import (
	"context"
	"io"
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
	Item          string    `json:"item"`
	PlannedAmount float64   `json:"planned_amount"`
	ActualAmount  float64   `json:"actual_amount"`
	Category      string    `json:"category"`
	Description   string    `json:"description"`
	EstimatedCost float64   `json:"estimated_cost,omitempty"`
	ActualCost    float64   `json:"actual_cost,omitempty"`
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

type EventRole struct {
	ID         uuid.UUID `json:"id"`
	EventID    uuid.UUID `json:"event_id"`
	ResidentID uuid.UUID `json:"resident_id"`
	Role       string    `json:"role"` // e.g. 'Ketua Panitia', 'Bendahara', 'Sekretaris', 'Seksi Konsumsi', 'Seksi Dokumentasi'
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type EventReceipt struct {
	ID          uuid.UUID  `json:"id"`
	EventID     uuid.UUID  `json:"event_id"`
	ResidentID  *uuid.UUID `json:"resident_id,omitempty"`
	ReceiptURL  string     `json:"receipt_url"`
	Amount      float64    `json:"amount"`
	Description string     `json:"description,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type EventTransparency struct {
	Event           *Event          `json:"event"`
	Timeline        []*Event        `json:"timeline"`
	Status          string          `json:"status"`
	FundingProgress float64         `json:"funding_progress"`
	Budgets         []*EventBudget  `json:"budgets"`
	TotalPlanned    float64         `json:"total_planned"`
	TotalActual     float64         `json:"total_actual"`
	TotalDonations  float64         `json:"total_donations"`
	DonationDetails []*EventSponsor `json:"donation_details,omitempty"`
	Receipts        []*EventReceipt `json:"receipts,omitempty"`
}

type EventRepository interface {
	CreateEvent(ctx context.Context, event *Event) error
	GetEventByID(ctx context.Context, tenantID, id uuid.UUID) (*Event, error)
	UpdateEvent(ctx context.Context, event *Event) error
	DeleteEvent(ctx context.Context, tenantID, id uuid.UUID) error
	ListEvents(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*Event, int64, error)

	AddOrUpdateBudget(ctx context.Context, budget *EventBudget) error
	GetBudgetByEventID(ctx context.Context, eventID uuid.UUID) (*EventBudget, error)
	ListBudgetsByEventID(ctx context.Context, eventID uuid.UUID) ([]*EventBudget, error)

	AddOrUpdateParticipant(ctx context.Context, participant *EventParticipant) error
	ListParticipantsByEventID(ctx context.Context, eventID uuid.UUID) ([]*EventParticipant, error)

	// Roles / Committee
	AssignRole(ctx context.Context, role *EventRole) error
	ListRolesByEventID(ctx context.Context, eventID uuid.UUID) ([]*EventRole, error)
	RemoveRole(ctx context.Context, eventID, roleID uuid.UUID) error

	// Receipts & MinIO
	CreateReceipt(ctx context.Context, receipt *EventReceipt) error
	ListReceiptsByEventID(ctx context.Context, eventID uuid.UUID) ([]*EventReceipt, error)
	UploadReceiptFile(ctx context.Context, filename string, content io.Reader, contentType string) (string, error)
}

type EventUsecase interface {
	CreateEvent(ctx context.Context, tenantID uuid.UUID, event *Event) error
	ListEvents(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*Event, int64, error)
	GetEvent(ctx context.Context, tenantID, id uuid.UUID) (*Event, error)
	UpdateEvent(ctx context.Context, tenantID uuid.UUID, event *Event) error
	DeleteEvent(ctx context.Context, tenantID, id uuid.UUID) error

	AddOrUpdateBudget(ctx context.Context, tenantID, eventID uuid.UUID, budget *EventBudget) error
	ListBudgets(ctx context.Context, tenantID, eventID uuid.UUID) ([]*EventBudget, error)
	RSVP(ctx context.Context, tenantID, eventID uuid.UUID, participant *EventParticipant) error

	// Roles
	AssignRole(ctx context.Context, tenantID, eventID uuid.UUID, role *EventRole) error
	ListRoles(ctx context.Context, tenantID, eventID uuid.UUID) ([]*EventRole, error)
	RemoveRole(ctx context.Context, tenantID, eventID, roleID uuid.UUID) error

	// Receipts & Transparency
	UploadDonationReceipt(ctx context.Context, tenantID, eventID uuid.UUID, residentID *uuid.UUID, filename string, content io.Reader, contentType string, amount float64, description string) (*EventReceipt, error)
	ListReceipts(ctx context.Context, tenantID, eventID uuid.UUID) ([]*EventReceipt, error)
	GetTransparency(ctx context.Context, tenantID, eventID uuid.UUID) (*EventTransparency, error)
}
