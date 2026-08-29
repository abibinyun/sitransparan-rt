package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type KarangTarunaPeriod struct {
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

	Config  *KarangTarunaConfig   `json:"config,omitempty"`
	Members []*KarangTarunaMember `json:"members,omitempty"`
}

type KarangTarunaConfig struct {
	PeriodID        uuid.UUID `json:"period_id"`
	AllowedRoles    []string  `json:"allowed_roles"`
	AllowedSections []string  `json:"allowed_sections"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type KarangTarunaMember struct {
	ID            uuid.UUID `json:"id"`
	PeriodID      uuid.UUID `json:"period_id"`
	ResidentID    uuid.UUID `json:"resident_id"`
	Role          string    `json:"role"`
	Section       *string   `json:"section,omitempty"`
	CustomTitle   *string   `json:"custom_title,omitempty"`
	PhoneOverride *string   `json:"phone_override,omitempty"`
	Status        string    `json:"status"` // aktif, demisioner, nonaktif
	JoinedAt      time.Time `json:"joined_at"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`

	// Relasi resident
	ResidentName string  `json:"resident_name,omitempty"`
	ResidentNIK  string  `json:"resident_nik,omitempty"`
	Phone        *string `json:"phone,omitempty"`
}

type KarangTarunaRepository interface {
	// Periode
	CreatePeriod(ctx context.Context, p *KarangTarunaPeriod) error
	GetPeriodByID(ctx context.Context, tenantID, id uuid.UUID) (*KarangTarunaPeriod, error)
	GetActivePeriod(ctx context.Context, tenantID uuid.UUID) (*KarangTarunaPeriod, error)
	ListPeriods(ctx context.Context, tenantID uuid.UUID, status string) ([]*KarangTarunaPeriod, error)
	UpdatePeriod(ctx context.Context, p *KarangTarunaPeriod) error

	// Config
	SaveConfig(ctx context.Context, c *KarangTarunaConfig) error
	GetConfig(ctx context.Context, periodID uuid.UUID) (*KarangTarunaConfig, error)

	// Members
	AddMember(ctx context.Context, m *KarangTarunaMember) error
	GetMemberByID(ctx context.Context, tenantID, id uuid.UUID) (*KarangTarunaMember, error)
	ListMembers(ctx context.Context, tenantID, periodID uuid.UUID, section, role, status string) ([]*KarangTarunaMember, error)
	UpdateMember(ctx context.Context, m *KarangTarunaMember) error
	DeleteMember(ctx context.Context, tenantID, id uuid.UUID) error
	IsKetua(ctx context.Context, tenantID, userID uuid.UUID) (bool, error)
}

type KarangTarunaUsecase interface {
	CreatePeriod(ctx context.Context, tenantID uuid.UUID, p *KarangTarunaPeriod) error
	GetPeriod(ctx context.Context, tenantID, id uuid.UUID) (*KarangTarunaPeriod, error)
	GetActivePeriod(ctx context.Context, tenantID uuid.UUID) (*KarangTarunaPeriod, error)
	ListPeriods(ctx context.Context, tenantID uuid.UUID, status string) ([]*KarangTarunaPeriod, error)
	UpdatePeriod(ctx context.Context, tenantID uuid.UUID, p *KarangTarunaPeriod) error
	UpdateConfig(ctx context.Context, tenantID, periodID uuid.UUID, allowedRoles, allowedSections []string) error

	AddMember(ctx context.Context, tenantID uuid.UUID, m *KarangTarunaMember) error
	ListMembers(ctx context.Context, tenantID, periodID uuid.UUID, section, role, status string) ([]*KarangTarunaMember, error)
	UpdateMember(ctx context.Context, tenantID uuid.UUID, m *KarangTarunaMember) error
	DeleteMember(ctx context.Context, tenantID, id uuid.UUID) error
	CanManage(ctx context.Context, tenantID, userID uuid.UUID, callerRole RoleName) bool
}
