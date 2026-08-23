package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Meeting struct {
	ID          uuid.UUID          `json:"id"`
	Title       string             `json:"title"`
	Agenda      string             `json:"agenda"`
	MeetingDate time.Time          `json:"meeting_date"`
	Location    string             `json:"location"`
	MeetingType string             `json:"meeting_type"` // regular, emergency, karang_taruna, rtrw_pleno
	Visibility  string             `json:"visibility"`   // public, internal, confidential
	Status      string             `json:"status"`       // scheduled, ongoing, completed, cancelled
	Notes       *string            `json:"notes,omitempty"`
	CreatedBy   *uuid.UUID         `json:"created_by,omitempty"`
	CreatedAt   time.Time          `json:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at"`
	Attendees   []MeetingAttendee  `json:"attendees,omitempty"`
	Decisions   []MeetingDecision  `json:"decisions,omitempty"`
	ActionItems []MeetingActionItem `json:"action_items,omitempty"`
}

type MeetingAttendee struct {
	ID          uuid.UUID  `json:"id"`
	MeetingID   uuid.UUID  `json:"meeting_id"`
	ResidentID  *uuid.UUID `json:"resident_id,omitempty"`
	Name        string     `json:"name"`
	RoleOrTitle string     `json:"role_or_title"`
	Attended    bool       `json:"attended"`
	Notes       *string    `json:"notes,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

type MeetingDecision struct {
	ID           uuid.UUID `json:"id"`
	MeetingID    uuid.UUID `json:"meeting_id"`
	DecisionText string    `json:"decision_text"`
	Category     string    `json:"category"`
	CreatedAt    time.Time `json:"created_at"`
}

type MeetingActionItem struct {
	ID                 uuid.UUID  `json:"id"`
	MeetingID          uuid.UUID  `json:"meeting_id"`
	Task               string     `json:"task"`
	AssigneeName       string     `json:"assignee_name"`
	AssigneeResidentID *uuid.UUID `json:"assignee_resident_id,omitempty"`
	DueDate            *string    `json:"due_date,omitempty"` // YYYY-MM-DD
	Status             string     `json:"status"`             // pending, in_progress, completed, cancelled
	Notes              *string    `json:"notes,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

type MeetingRepository interface {
	Create(ctx context.Context, m *Meeting) error
	GetByID(ctx context.Context, id uuid.UUID) (*Meeting, error)
	List(ctx context.Context, visibility string) ([]Meeting, error)
	Update(ctx context.Context, m *Meeting) error
	Delete(ctx context.Context, id uuid.UUID) error

	// Attendees
	AddAttendee(ctx context.Context, a *MeetingAttendee) error
	DeleteAttendee(ctx context.Context, id uuid.UUID) error

	// Decisions
	AddDecision(ctx context.Context, d *MeetingDecision) error
	DeleteDecision(ctx context.Context, id uuid.UUID) error

	// Action items
	CreateActionItem(ctx context.Context, item *MeetingActionItem) error
	UpdateActionItem(ctx context.Context, item *MeetingActionItem) error
	DeleteActionItem(ctx context.Context, id uuid.UUID) error
	ListActionItems(ctx context.Context, status string) ([]MeetingActionItem, error)
}

type MeetingUsecase interface {
	CreateMeeting(ctx context.Context, m *Meeting) (*Meeting, error)
	GetMeetingByID(ctx context.Context, id uuid.UUID) (*Meeting, error)
	ListMeetings(ctx context.Context, visibility string) ([]Meeting, error)
	UpdateMeeting(ctx context.Context, m *Meeting) (*Meeting, error)
	DeleteMeeting(ctx context.Context, id uuid.UUID) error

	AddAttendee(ctx context.Context, a *MeetingAttendee) (*MeetingAttendee, error)
	DeleteAttendee(ctx context.Context, id uuid.UUID) error

	AddDecision(ctx context.Context, d *MeetingDecision) (*MeetingDecision, error)
	DeleteDecision(ctx context.Context, id uuid.UUID) error

	CreateActionItem(ctx context.Context, item *MeetingActionItem) (*MeetingActionItem, error)
	UpdateActionItem(ctx context.Context, item *MeetingActionItem) (*MeetingActionItem, error)
	DeleteActionItem(ctx context.Context, id uuid.UUID) error
	ListActionItems(ctx context.Context, status string) ([]MeetingActionItem, error)
}
