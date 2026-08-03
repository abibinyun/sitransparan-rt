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

func (u *financialUsecase) UpdateFinancialTransaction(ctx context.Context, tenantID uuid.UUID, tx *domain.FinancialTransaction) error {
	if tx == nil || tx.Category == "" || tx.Amount <= 0 {
		return ErrInvalidInput
	}
	if tx.Type != "income" && tx.Type != "expense" {
		return ErrInvalidInput
	}
	tx.TenantID = tenantID
	return u.repo.UpdateFinancialTransaction(ctx, tx)
}

func (u *financialUsecase) DeleteFinancialTransaction(ctx context.Context, tenantID, id uuid.UUID) error {
	return u.repo.DeleteFinancialTransaction(ctx, tenantID, id)
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

// Upload Proof
func (u *financialUsecase) UploadProof(ctx context.Context, filename string, content io.Reader, contentType string) (string, error) {
	if filename == "" || content == nil {
		return "", ErrInvalidInput
	}
	return u.repo.UploadProof(ctx, filename, content, contentType)
}
