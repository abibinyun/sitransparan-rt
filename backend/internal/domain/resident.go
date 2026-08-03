package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Resident struct {
	ID             uuid.UUID       `json:"id"`
	TenantID       uuid.UUID       `json:"tenant_id"`
	NIK            *string         `json:"nik,omitempty"`
	KKNumber       *string         `json:"kk_number,omitempty"`
	FullName       *string         `json:"full_name,omitempty"`
	Gender         *string         `json:"gender,omitempty"`
	BirthPlace     *string         `json:"birth_place,omitempty"`
	BirthDate      *time.Time      `json:"birth_date,omitempty"`
	Address        *string         `json:"address,omitempty"`
	RTRW           *string         `json:"rt_rw,omitempty"`
	Phone          *string         `json:"phone,omitempty"`
	IsHeadOfFamily *bool           `json:"is_head_of_family,omitempty"`
	FamilyMembers  []*FamilyMember `json:"family_members,omitempty"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
}

type FamilyMember struct {
	ID         uuid.UUID  `json:"id"`
	ResidentID uuid.UUID  `json:"resident_id"`
	FullName   *string    `json:"full_name,omitempty"`
	NIK        *string    `json:"nik,omitempty"`
	Relation   *string    `json:"relation,omitempty"`
	BirthDate  *time.Time `json:"birth_date,omitempty"`
	Gender     *string    `json:"gender,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

type ResidentRepository interface {
	Create(ctx context.Context, resident *Resident) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Resident, error)
	Update(ctx context.Context, resident *Resident) error
	Delete(ctx context.Context, tenantID, id uuid.UUID) error
	List(ctx context.Context, tenantID uuid.UUID, query string, limit, offset int) ([]*Resident, int64, error)
	AddFamilyMember(ctx context.Context, member *FamilyMember) error
	RemoveFamilyMember(ctx context.Context, tenantID, residentID, memberID uuid.UUID) error
	GetFamilyMembers(ctx context.Context, residentID uuid.UUID) ([]*FamilyMember, error)
}

type ResidentUsecase interface {
	Create(ctx context.Context, tenantID uuid.UUID, resident *Resident) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Resident, error)
	Update(ctx context.Context, tenantID uuid.UUID, resident *Resident) error
	Delete(ctx context.Context, tenantID, id uuid.UUID) error
	List(ctx context.Context, tenantID uuid.UUID, query string, limit, offset int) ([]*Resident, int64, error)
	AddFamilyMember(ctx context.Context, tenantID uuid.UUID, member *FamilyMember) error
	RemoveFamilyMember(ctx context.Context, tenantID, residentID, memberID uuid.UUID) error
}
