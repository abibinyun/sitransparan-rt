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
	UserID         *uuid.UUID       `json:"user_id,omitempty"`
	AccessToken    string           `json:"access_token"`
	TokenStatus    HouseTokenStatus `json:"token_status"`
	PinCode        string           `json:"pin_code"`
	TokenVersion   int              `json:"token_version"`
	CreatedAt      time.Time        `json:"created_at"`
	UpdatedAt      time.Time        `json:"updated_at"`
}

type HouseAccessClaimResponse struct {
	Token        string    `json:"token"`
	House        House     `json:"house"`
	TenantSlug   string    `json:"tenant_slug"`
	TenantName   string    `json:"tenant_name"`
	HeadResident *Resident `json:"head_resident,omitempty"`
	User         *User     `json:"user,omitempty"`
}

type HouseRepository interface {
	Create(ctx context.Context, tenantID uuid.UUID, house *House) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*House, error)
	GetByToken(ctx context.Context, tenantID uuid.UUID, token string) (*House, error)
	GetByUserID(ctx context.Context, tenantID, userID uuid.UUID) (*House, error)
	List(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]House, int, error)
	Update(ctx context.Context, tenantID uuid.UUID, house *House) error
	RevokeAndRegenerateToken(ctx context.Context, tenantID, id uuid.UUID, newToken, newPin string) error
	ResetPin(ctx context.Context, tenantID, id uuid.UUID, newPin string) error
	Delete(ctx context.Context, tenantID, id uuid.UUID) error
}

type HouseUsecase interface {
	ClaimAccessToken(ctx context.Context, tenantSlug, token, pin string) (*HouseAccessClaimResponse, error)
	GetMyHouse(ctx context.Context, tenantID, userID uuid.UUID) (*House, *Resident, error)
	ListHouses(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]House, int, error)
	CreateHouse(ctx context.Context, tenantID uuid.UUID, house *House) (*House, error)
	UpdateHouse(ctx context.Context, tenantID uuid.UUID, house *House) (*House, error)
	DeleteHouse(ctx context.Context, tenantID, houseID uuid.UUID) error
	RegenerateToken(ctx context.Context, tenantID, houseID uuid.UUID) (*House, error)
	ResetPin(ctx context.Context, tenantID, houseID uuid.UUID) (*House, error)
	VerifyPin(ctx context.Context, tenantID, houseID uuid.UUID, inputPin string) (bool, error)
}
