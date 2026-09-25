package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type RTPeriod struct {
	ID        uuid.UUID  `json:"id"`
	TenantID  uuid.UUID  `json:"tenant_id"`
	Name      string     `json:"name"`
	StartDate time.Time  `json:"start_date"`
	EndDate   time.Time  `json:"end_date"`
	Status    string     `json:"status"` // draft, active, archived
	SKNumber  *string    `json:"sk_number,omitempty"`
	SKFileURL *string    `json:"sk_file_url,omitempty"`
	CreatedBy *uuid.UUID `json:"created_by,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`

	Members []*RTMember `json:"members,omitempty"`
}

type RTMember struct {
	ID            uuid.UUID `json:"id"`
	PeriodID      uuid.UUID `json:"period_id"`
	ResidentID    uuid.UUID `json:"resident_id"`
	Role          string    `json:"role"` // ketua, wakil, sekretaris, bendahara, seksi, penasihat
	Section       *string   `json:"section,omitempty"`
	CustomTitle   *string   `json:"custom_title,omitempty"`
	PhoneOverride *string   `json:"phone_override,omitempty"`
	PhotoURL      *string   `json:"photo_url,omitempty"`
	Status        string    `json:"status"` // aktif, demisioner, nonaktif
	JoinedAt      time.Time `json:"joined_at"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`

	// Relasi resident
	ResidentName string  `json:"resident_name,omitempty"`
	ResidentNIK  string  `json:"resident_nik,omitempty"`
	Phone        *string `json:"phone,omitempty"`
}

type RTStructureRepository interface {
	// Periode
	CreatePeriod(ctx context.Context, p *RTPeriod) error
	GetPeriodByID(ctx context.Context, tenantID, id uuid.UUID) (*RTPeriod, error)
	GetActivePeriod(ctx context.Context, tenantID uuid.UUID) (*RTPeriod, error)
	ListPeriods(ctx context.Context, tenantID uuid.UUID, status string) ([]*RTPeriod, error)
	UpdatePeriod(ctx context.Context, p *RTPeriod) error

	// Members
	AddMember(ctx context.Context, m *RTMember) error
	GetMemberByID(ctx context.Context, tenantID, id uuid.UUID) (*RTMember, error)
	ListMembers(ctx context.Context, tenantID, periodID uuid.UUID, section, role, status string) ([]*RTMember, error)
	UpdateMember(ctx context.Context, m *RTMember) error
	DeleteMember(ctx context.Context, tenantID, id uuid.UUID) error
}

type RTStructureUsecase interface {
	CreatePeriod(ctx context.Context, tenantID uuid.UUID, p *RTPeriod) error
	GetPeriod(ctx context.Context, tenantID, id uuid.UUID) (*RTPeriod, error)
	GetActivePeriod(ctx context.Context, tenantID uuid.UUID) (*RTPeriod, error)
	ListPeriods(ctx context.Context, tenantID uuid.UUID, status string) ([]*RTPeriod, error)
	UpdatePeriod(ctx context.Context, tenantID uuid.UUID, p *RTPeriod) error

	AddMember(ctx context.Context, tenantID uuid.UUID, m *RTMember) error
	ListMembers(ctx context.Context, tenantID, periodID uuid.UUID, section, role, status string) ([]*RTMember, error)
	UpdateMember(ctx context.Context, tenantID uuid.UUID, m *RTMember) error
	DeleteMember(ctx context.Context, tenantID, id uuid.UUID) error
}
