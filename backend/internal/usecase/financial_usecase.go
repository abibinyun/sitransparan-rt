package usecase

import (
	"context"
	"io"
	"time"

	"backend/internal/domain"
	"github.com/google/uuid"
)

type financialUsecase struct {
	repo domain.FinancialRepository
}

func NewFinancialUsecase(repo domain.FinancialRepository) domain.FinancialUsecase {
	return &financialUsecase{repo: repo}
}

// FeeCategory CRUD
func (u *financialUsecase) CreateFeeCategory(ctx context.Context, tenantID uuid.UUID, category *domain.FeeCategory) error {
	if category == nil || category.Name == "" || category.Amount < 0 {
		return ErrInvalidInput
	}
	if category.Period != "monthly" && category.Period != "one_time" {
		return ErrInvalidInput
	}
	category.TenantID = tenantID
	return u.repo.CreateFeeCategory(ctx, category)
}

func (u *financialUsecase) GetFeeCategoryByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.FeeCategory, error) {
	return u.repo.GetFeeCategoryByID(ctx, tenantID, id)
}

func (u *financialUsecase) UpdateFeeCategory(ctx context.Context, tenantID uuid.UUID, category *domain.FeeCategory) error {
	if category == nil || category.Name == "" || category.Amount < 0 {
		return ErrInvalidInput
	}
	if category.Period != "monthly" && category.Period != "one_time" {
		return ErrInvalidInput
	}
	category.TenantID = tenantID
	return u.repo.UpdateFeeCategory(ctx, category)
}

func (u *financialUsecase) DeleteFeeCategory(ctx context.Context, tenantID, id uuid.UUID) error {
	return u.repo.DeleteFeeCategory(ctx, tenantID, id)
}

func (u *financialUsecase) ListFeeCategories(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.FeeCategory, int64, error) {
	if limit <= 0 {
		limit = 10
	}
	if offset < 0 {
		offset = 0
	}
	return u.repo.ListFeeCategories(ctx, tenantID, limit, offset)
}

// DuesPayment
func (u *financialUsecase) RecordDuesPayment(ctx context.Context, tenantID uuid.UUID, payment *domain.DuesPayment) error {
	if payment == nil || payment.ResidentID == uuid.Nil || payment.FeeCategoryID == uuid.Nil || payment.Amount <= 0 {
		return ErrInvalidInput
	}
	if payment.PeriodMonth < 1 || payment.PeriodMonth > 12 || payment.PeriodYear < 2000 {
		return ErrInvalidInput
	}
	payment.TenantID = tenantID
	payment.Status = "pending"
	return u.repo.CreateDuesPayment(ctx, payment)
}

func (u *financialUsecase) VerifyDuesPayment(ctx context.Context, tenantID, id uuid.UUID, status string, verifierID uuid.UUID) (*domain.DuesPayment, error) {
	if status != "verified" && status != "rejected" {
		return nil, ErrInvalidInput
	}

	payment, err := u.repo.GetDuesPaymentByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	payment.Status = status
	payment.VerifiedAt = &now
	payment.VerifiedBy = &verifierID

	if err := u.repo.UpdateDuesPayment(ctx, payment); err != nil {
		return nil, err
	}

	return payment, nil
}

func (u *financialUsecase) ListDuesPayments(ctx context.Context, tenantID uuid.UUID, residentID *uuid.UUID, limit, offset int) ([]*domain.DuesPayment, int64, error) {
	if limit <= 0 {
		limit = 10
	}
	if offset < 0 {
		offset = 0
	}
	return u.repo.ListDuesPayments(ctx, tenantID, residentID, limit, offset)
}

// Income/Expense Transaction CRUD
func (u *financialUsecase) CreateFinancialTransaction(ctx context.Context, tenantID uuid.UUID, tx *domain.FinancialTransaction, createdBy uuid.UUID) error {
	if tx == nil || tx.Category == "" || tx.Amount <= 0 {
		return ErrInvalidInput
	}
	if tx.Type != "income" && tx.Type != "expense" {
		return ErrInvalidInput
	}
	tx.TenantID = tenantID
	tx.CreatedBy = &createdBy
	return u.repo.CreateFinancialTransaction(ctx, tx)
}

func (u *financialUsecase) GetFinancialTransactionByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.FinancialTransaction, error) {
	return u.repo.GetFinancialTransactionByID(ctx, tenantID, id)
}

func (u *financialUsecase) ReverseFinancialTransaction(ctx context.Context, tenantID, id uuid.UUID, reason string, createdBy uuid.UUID) (*domain.FinancialTransaction, error) {
	orig, err := u.repo.GetFinancialTransactionByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}

	revType := "expense"
	if orig.Type == "expense" {
		revType = "income"
	}

	desc := "Reversal of " + orig.ID.String()
	if reason != "" {
		desc += ": " + reason
	}

	revTx := &domain.FinancialTransaction{
		ID:              uuid.New(),
		TenantID:        tenantID,
		Type:            revType,
		Category:        orig.Category,
		Amount:          orig.Amount,
		TransactionDate: time.Now(),
		Description:     &desc,
		CreatedBy:       &createdBy,
	}

	if err := u.repo.CreateFinancialTransaction(ctx, revTx); err != nil {
		return nil, err
	}
	return revTx, nil
}

func (u *financialUsecase) ListFinancialTransactions(ctx context.Context, tenantID uuid.UUID, txType string, limit, offset int) ([]*domain.FinancialTransaction, int64, error) {
	if limit <= 0 {
		limit = 10
	}
	if offset < 0 {
		offset = 0
	}
	return u.repo.ListFinancialTransactions(ctx, tenantID, txType, limit, offset)
}

func (u *financialUsecase) GetFinancialSummary(ctx context.Context, tenantID uuid.UUID) (*domain.FinancialSummary, error) {
	txs, _, err := u.repo.ListFinancialTransactions(ctx, tenantID, "", 10000, 0)
	if err != nil {
		return nil, err
	}

	dues, _, err := u.repo.ListDuesPayments(ctx, tenantID, nil, 10000, 0)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	currentMonth := now.Month()
	currentYear := now.Year()

	var totalIncome, totalExpense float64
	var monthlyIncome, monthlyExpense float64
	spendingMap := make(map[string]float64)

	for _, tx := range txs {
		if tx.Type == "income" {
			totalIncome += tx.Amount
			if tx.TransactionDate.Year() == currentYear && tx.TransactionDate.Month() == currentMonth {
				monthlyIncome += tx.Amount
			}
		} else if tx.Type == "expense" {
			totalExpense += tx.Amount
			spendingMap[tx.Category] += tx.Amount
			if tx.TransactionDate.Year() == currentYear && tx.TransactionDate.Month() == currentMonth {
				monthlyExpense += tx.Amount
			}
		}
	}

	for _, d := range dues {
		if d.Status == "verified" {
			totalIncome += d.Amount
			if d.PeriodYear == currentYear && time.Month(d.PeriodMonth) == currentMonth {
				monthlyIncome += d.Amount
			}
		}
	}

	breakdown := make([]domain.CategoryBreakdown, 0, len(spendingMap))
	for cat, amt := range spendingMap {
		breakdown = append(breakdown, domain.CategoryBreakdown{
			Category: cat,
			Amount:   amt,
		})
	}

	return &domain.FinancialSummary{
		CurrentBalance:    totalIncome - totalExpense,
		MonthlyIncome:     monthlyIncome,
		MonthlyExpense:    monthlyExpense,
		SpendingBreakdown: breakdown,
	}, nil
}

// Upload Proof
func (u *financialUsecase) UploadProof(ctx context.Context, filename string, content io.Reader, contentType string) (string, error) {
	if filename == "" || content == nil {
		return "", ErrInvalidInput
	}
	return u.repo.UploadProof(ctx, filename, content, contentType)
}
