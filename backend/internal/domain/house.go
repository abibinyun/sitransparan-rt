package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type HouseTokenStatus string

const (
	HouseTokenActive    HouseTokenStatus = "active"
	HouseTokenRevoked   HouseTokenStatus = "revoked"
	HouseTokenSuspended HouseTokenStatus = "suspended"
)

type House struct {
	ID             uuid.UUID        `json:"id"`
	BlockNumber    string           `json:"block_number"`
	Address        *string          `json:"address,omitempty"`
	HeadResidentID *uuid.UUID       `json:"head_resident_id,omitempty"`
	HeadResident   *Resident        `json:"head_resident,omitempty"`
	AccessToken    string           `json:"access_token"`
	TokenStatus    HouseTokenStatus `json:"token_status"`
	CreatedAt      time.Time        `json:"created_at"`
	UpdatedAt      time.Time        `json:"updated_at"`
}

type HouseAccessClaimResponse struct {
	Token        string   `json:"token"`
	House        House    `json:"house"`
	TenantSlug   string   `json:"tenant_slug"`
	TenantName   string   `json:"tenant_name"`
	HeadResident *Resident `json:"head_resident,omitempty"`
}

type HouseRepository interface {
	Create(ctx context.Context, tenantID uuid.UUID, house *House) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*House, error)
	GetByToken(ctx context.Context, tenantID uuid.UUID, token string) (*House, error)
	List(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]House, int, error)
	Update(ctx context.Context, tenantID uuid.UUID, house *House) error
	RevokeAndRegenerateToken(ctx context.Context, tenantID, id uuid.UUID, newToken string) error
	Delete(ctx context.Context, tenantID, id uuid.UUID) error
}

type HouseUsecase interface {
	ClaimAccessToken(ctx context.Context, tenantSlug, token string) (*HouseAccessClaimResponse, error)
	ListHouses(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]House, int, error)
	CreateHouse(ctx context.Context, tenantID uuid.UUID, house *House) (*House, error)
	UpdateHouse(ctx context.Context, tenantID uuid.UUID, house *House) (*House, error)
	DeleteHouse(ctx context.Context, tenantID, houseID uuid.UUID) error
	RegenerateToken(ctx context.Context, tenantID, houseID uuid.UUID) (*House, error)
}
