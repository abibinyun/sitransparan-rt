package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type WasteCategory struct {
	ID                   uuid.UUID `json:"id"`
	TenantID             uuid.UUID `json:"tenant_id"`
	Name                 string    `json:"name"`
	Unit                 string    `json:"unit"` // kg, liter, pcs
	PricePerUnit         float64   `json:"price_per_unit"`
	ResidentSharePct     float64   `json:"resident_share_pct"`     // e.g. 80.0
	KarangTarunaSharePct float64   `json:"karang_taruna_share_pct"` // e.g. 20.0
	Description          *string   `json:"description,omitempty"`
	IsActive             bool      `json:"is_active"`
	CreatedAt            time.Time `json:"created_at"`
	UpdatedAt            time.Time `json:"updated_at"`
}

type WasteDepositItem struct {
	ID                 uuid.UUID `json:"id"`
	DepositID          uuid.UUID `json:"deposit_id"`
	CategoryID         uuid.UUID `json:"category_id"`
	CategoryName       string    `json:"category_name,omitempty"`
	CategoryUnit       string    `json:"category_unit,omitempty"`
	Quantity           float64   `json:"quantity"`
	UnitPrice          float64   `json:"unit_price"`
	GrossAmount        float64   `json:"gross_amount"`
	ResidentAmount     float64   `json:"resident_amount"`
	KarangTarunaAmount float64   `json:"karang_taruna_amount"`
	CreatedAt          time.Time `json:"created_at"`
}

type WasteDeposit struct {
	ID                 uuid.UUID           `json:"id"`
	TenantID           uuid.UUID           `json:"tenant_id"`
	HouseID            *uuid.UUID          `json:"house_id,omitempty"`
	ResidentID         *uuid.UUID          `json:"resident_id,omitempty"`
	KKNumber           *string             `json:"kk_number,omitempty"`
	FamilyHeadName     string              `json:"family_head_name"`
	DepositDate        time.Time           `json:"deposit_date"`
	TotalWeight        float64             `json:"total_weight"`
	TotalGrossAmount   float64             `json:"total_gross_amount"`
	ResidentAmount     float64             `json:"resident_amount"`
	KarangTarunaAmount float64             `json:"karang_taruna_amount"`
	Status             string              `json:"status"` // pending, verified, paid_out, cancelled
	Notes              *string             `json:"notes,omitempty"`
	RecordedBy         *uuid.UUID          `json:"recorded_by,omitempty"`
	Items              []*WasteDepositItem `json:"items,omitempty"`
	CreatedAt          time.Time           `json:"created_at"`
	UpdatedAt          time.Time           `json:"updated_at"`
}

type WasteBankSummary struct {
	TotalDeposits          int64   `json:"total_deposits"`
	TotalWeightKg          float64 `json:"total_weight_kg"`
	TotalGrossValue        float64 `json:"total_gross_value"`
	TotalResidentEarnings  float64 `json:"total_resident_earnings"`
	TotalKarangTarunaShare float64 `json:"total_karang_taruna_share"`
	ActiveHouseholdsCount  int64   `json:"active_households_count"`
}

type HouseholdWasteAccumulation struct {
	FamilyHeadName     string  `json:"family_head_name"`
	KKNumber           string  `json:"kk_number,omitempty"`
	TotalWeight        float64 `json:"total_weight"`
	TotalGrossAmount   float64 `json:"total_gross_amount"`
	ResidentAmount     float64 `json:"resident_amount"`
	KarangTarunaAmount float64 `json:"karang_taruna_amount"`
	DepositCount       int64   `json:"deposit_count"`
	LastDepositDate    string  `json:"last_deposit_date"`
}

type WasteBankRepository interface {
	// Categories
	ListCategories(ctx context.Context, tenantID uuid.UUID, activeOnly bool) ([]*WasteCategory, error)
	GetCategoryByID(ctx context.Context, tenantID, id uuid.UUID) (*WasteCategory, error)
	CreateCategory(ctx context.Context, category *WasteCategory) error
	UpdateCategory(ctx context.Context, category *WasteCategory) error
	DeleteCategory(ctx context.Context, tenantID, id uuid.UUID) error

	// Deposits
	CreateDeposit(ctx context.Context, deposit *WasteDeposit) error
	GetDepositByID(ctx context.Context, tenantID, id uuid.UUID) (*WasteDeposit, error)
	ListDeposits(ctx context.Context, tenantID uuid.UUID, search, status string, limit, offset int) ([]*WasteDeposit, int64, error)
	UpdateDepositStatus(ctx context.Context, tenantID, id uuid.UUID, status string) error

	// Aggregates
	GetSummary(ctx context.Context, tenantID uuid.UUID) (*WasteBankSummary, error)
	ListHouseholdAccumulations(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*HouseholdWasteAccumulation, int64, error)
}

type WasteBankUsecase interface {
	ListCategories(ctx context.Context, tenantID uuid.UUID, activeOnly bool) ([]*WasteCategory, error)
	GetCategoryByID(ctx context.Context, tenantID, id uuid.UUID) (*WasteCategory, error)
	CreateCategory(ctx context.Context, category *WasteCategory) error
	UpdateCategory(ctx context.Context, category *WasteCategory) error
	DeleteCategory(ctx context.Context, tenantID, id uuid.UUID) error

	CreateDeposit(ctx context.Context, deposit *WasteDeposit) error
	GetDepositByID(ctx context.Context, tenantID, id uuid.UUID) (*WasteDeposit, error)
	ListDeposits(ctx context.Context, tenantID uuid.UUID, search, status string, limit, offset int) ([]*WasteDeposit, int64, error)
	UpdateDepositStatus(ctx context.Context, tenantID, id uuid.UUID, status string) error

	GetSummary(ctx context.Context, tenantID uuid.UUID) (*WasteBankSummary, error)
	ListHouseholdAccumulations(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*HouseholdWasteAccumulation, int64, error)
}
