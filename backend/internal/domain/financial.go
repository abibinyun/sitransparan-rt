package domain

import (
	"context"
	"io"
	"time"

	"github.com/google/uuid"
)

type FeeCategory struct {
	ID          uuid.UUID `json:"id"`
	TenantID    uuid.UUID `json:"tenant_id"`
	Name        string    `json:"name"`
	Amount      float64   `json:"amount"`
	Period      string    `json:"period"` // 'monthly' or 'one_time'
	Description *string   `json:"description,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type DuesPayment struct {
	ID            uuid.UUID  `json:"id"`
	TenantID      uuid.UUID  `json:"tenant_id"`
	ResidentID    uuid.UUID  `json:"resident_id"`
	FeeCategoryID uuid.UUID  `json:"fee_category_id"`
	Amount        float64    `json:"amount"`
	PeriodMonth   int        `json:"period_month"`
	PeriodYear    int        `json:"period_year"`
	Status        string     `json:"status"` // 'pending', 'verified', 'rejected'
	ProofURL      *string    `json:"proof_url,omitempty"`
	VerifiedAt    *time.Time `json:"verified_at,omitempty"`
	VerifiedBy    *uuid.UUID `json:"verified_by,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type FinancialTransaction struct {
	ID              uuid.UUID  `json:"id"`
	TenantID        uuid.UUID  `json:"tenant_id"`
	Type            string     `json:"type"` // 'income' or 'expense'
	Category        string     `json:"category"`
	Amount          float64    `json:"amount"`
	TransactionDate time.Time  `json:"transaction_date"`
	Description     *string    `json:"description,omitempty"`
	ProofURL        *string    `json:"proof_url,omitempty"`
	CreatedBy       *uuid.UUID `json:"created_by,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type CategoryBreakdown struct {
	Category string  `json:"category"`
	Amount   float64 `json:"amount"`
}

type FinancialSummary struct {
	CurrentBalance    float64             `json:"current_balance"`
	MonthlyIncome     float64             `json:"monthly_income"`
	MonthlyExpense    float64             `json:"monthly_expense"`
	SpendingBreakdown []CategoryBreakdown `json:"spending_breakdown"`
}

type FinancialRepository interface {
	// FeeCategory
	CreateFeeCategory(ctx context.Context, category *FeeCategory) error
	GetFeeCategoryByID(ctx context.Context, tenantID, id uuid.UUID) (*FeeCategory, error)
	UpdateFeeCategory(ctx context.Context, category *FeeCategory) error
	DeleteFeeCategory(ctx context.Context, tenantID, id uuid.UUID) error
	ListFeeCategories(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*FeeCategory, int64, error)

	// DuesPayment
	CreateDuesPayment(ctx context.Context, payment *DuesPayment) error
	GetDuesPaymentByID(ctx context.Context, tenantID, id uuid.UUID) (*DuesPayment, error)
	UpdateDuesPayment(ctx context.Context, payment *DuesPayment) error
	ListDuesPayments(ctx context.Context, tenantID uuid.UUID, residentID *uuid.UUID, limit, offset int) ([]*DuesPayment, int64, error)

	// FinancialTransaction
	CreateFinancialTransaction(ctx context.Context, tx *FinancialTransaction) error
	GetFinancialTransactionByID(ctx context.Context, tenantID, id uuid.UUID) (*FinancialTransaction, error)
	ListFinancialTransactions(ctx context.Context, tenantID uuid.UUID, txType string, limit, offset int) ([]*FinancialTransaction, int64, error)

	// Storage
	UploadProof(ctx context.Context, filename string, content io.Reader, contentType string) (string, error)
}

type FinancialUsecase interface {
	// FeeCategory CRUD
	CreateFeeCategory(ctx context.Context, tenantID uuid.UUID, category *FeeCategory) error
	GetFeeCategoryByID(ctx context.Context, tenantID, id uuid.UUID) (*FeeCategory, error)
	UpdateFeeCategory(ctx context.Context, tenantID uuid.UUID, category *FeeCategory) error
	DeleteFeeCategory(ctx context.Context, tenantID, id uuid.UUID) error
	ListFeeCategories(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*FeeCategory, int64, error)

	// Record Dues Payment & Verify
	RecordDuesPayment(ctx context.Context, tenantID uuid.UUID, payment *DuesPayment) error
	VerifyDuesPayment(ctx context.Context, tenantID, id uuid.UUID, status string, verifierID uuid.UUID) (*DuesPayment, error)
	ListDuesPayments(ctx context.Context, tenantID uuid.UUID, residentID *uuid.UUID, limit, offset int) ([]*DuesPayment, int64, error)

	// Income/Expense Transaction Append-Only Ledger & Reversal
	CreateFinancialTransaction(ctx context.Context, tenantID uuid.UUID, tx *FinancialTransaction, createdBy uuid.UUID) error
	GetFinancialTransactionByID(ctx context.Context, tenantID, id uuid.UUID) (*FinancialTransaction, error)
	ReverseFinancialTransaction(ctx context.Context, tenantID, id uuid.UUID, reason string, createdBy uuid.UUID) (*FinancialTransaction, error)
	ListFinancialTransactions(ctx context.Context, tenantID uuid.UUID, txType string, limit, offset int) ([]*FinancialTransaction, int64, error)

	// Financial Reporting
	GetFinancialSummary(ctx context.Context, tenantID uuid.UUID) (*FinancialSummary, error)

	// Upload Proof
	UploadProof(ctx context.Context, filename string, content io.Reader, contentType string) (string, error)
}
