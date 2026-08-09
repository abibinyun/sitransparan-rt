package usecase_test

import (
	"bytes"
	"context"
	"io"
	"testing"

	"backend/internal/domain"
	"backend/internal/repository"
	"backend/internal/usecase"
	"github.com/google/uuid"
)

type mockFinancialRepo struct {
	categories   map[uuid.UUID]*domain.FeeCategory
	duesPayments map[uuid.UUID]*domain.DuesPayment
	transactions map[uuid.UUID]*domain.FinancialTransaction
}

func newMockFinancialRepo() *mockFinancialRepo {
	return &mockFinancialRepo{
		categories:   make(map[uuid.UUID]*domain.FeeCategory),
		duesPayments: make(map[uuid.UUID]*domain.DuesPayment),
		transactions: make(map[uuid.UUID]*domain.FinancialTransaction),
	}
}

func (m *mockFinancialRepo) CreateFeeCategory(ctx context.Context, category *domain.FeeCategory) error {
	if category.ID == uuid.Nil {
		category.ID = uuid.New()
	}
	m.categories[category.ID] = category
	return nil
}

func (m *mockFinancialRepo) GetFeeCategoryByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.FeeCategory, error) {
	cat, ok := m.categories[id]
	if !ok || cat.TenantID != tenantID {
		return nil, repository.ErrNotFound
	}
	return cat, nil
}

func (m *mockFinancialRepo) UpdateFeeCategory(ctx context.Context, category *domain.FeeCategory) error {
	cat, ok := m.categories[category.ID]
	if !ok || cat.TenantID != category.TenantID {
		return repository.ErrNotFound
	}
	m.categories[category.ID] = category
	return nil
}

func (m *mockFinancialRepo) DeleteFeeCategory(ctx context.Context, tenantID, id uuid.UUID) error {
	cat, ok := m.categories[id]
	if !ok || cat.TenantID != tenantID {
		return repository.ErrNotFound
	}
	delete(m.categories, id)
	return nil
}

func (m *mockFinancialRepo) ListFeeCategories(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.FeeCategory, int64, error) {
	var res []*domain.FeeCategory
	for _, c := range m.categories {
		if c.TenantID == tenantID {
			res = append(res, c)
		}
	}
	return res, int64(len(res)), nil
}

func (m *mockFinancialRepo) CreateDuesPayment(ctx context.Context, payment *domain.DuesPayment) error {
	if payment.ID == uuid.Nil {
		payment.ID = uuid.New()
	}
	m.duesPayments[payment.ID] = payment
	return nil
}

func (m *mockFinancialRepo) GetDuesPaymentByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.DuesPayment, error) {
	p, ok := m.duesPayments[id]
	if !ok || p.TenantID != tenantID {
		return nil, repository.ErrNotFound
	}
	return p, nil
}

func (m *mockFinancialRepo) UpdateDuesPayment(ctx context.Context, payment *domain.DuesPayment) error {
	p, ok := m.duesPayments[payment.ID]
	if !ok || p.TenantID != payment.TenantID {
		return repository.ErrNotFound
	}
	m.duesPayments[payment.ID] = payment
	return nil
}

func (m *mockFinancialRepo) ListDuesPayments(ctx context.Context, tenantID uuid.UUID, residentID *uuid.UUID, limit, offset int) ([]*domain.DuesPayment, int64, error) {
	var res []*domain.DuesPayment
	for _, p := range m.duesPayments {
		if p.TenantID == tenantID {
			if residentID != nil && p.ResidentID != *residentID {
				continue
			}
			res = append(res, p)
		}
	}
	return res, int64(len(res)), nil
}

func (m *mockFinancialRepo) CreateFinancialTransaction(ctx context.Context, tx *domain.FinancialTransaction) error {
	if tx.ID == uuid.Nil {
		tx.ID = uuid.New()
	}
	m.transactions[tx.ID] = tx
	return nil
}

func (m *mockFinancialRepo) GetFinancialTransactionByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.FinancialTransaction, error) {
	tx, ok := m.transactions[id]
	if !ok || tx.TenantID != tenantID {
		return nil, repository.ErrNotFound
	}
	return tx, nil
}

func (m *mockFinancialRepo) UpdateFinancialTransaction(ctx context.Context, tx *domain.FinancialTransaction) error {
	t, ok := m.transactions[tx.ID]
	if !ok || t.TenantID != tx.TenantID {
		return repository.ErrNotFound
	}
	m.transactions[tx.ID] = tx
	return nil
}

func (m *mockFinancialRepo) DeleteFinancialTransaction(ctx context.Context, tenantID, id uuid.UUID) error {
	t, ok := m.transactions[id]
	if !ok || t.TenantID != tenantID {
		return repository.ErrNotFound
	}
	delete(m.transactions, id)
	return nil
}

func (m *mockFinancialRepo) ListFinancialTransactions(ctx context.Context, tenantID uuid.UUID, txType string, limit, offset int) ([]*domain.FinancialTransaction, int64, error) {
	var res []*domain.FinancialTransaction
	for _, t := range m.transactions {
		if t.TenantID == tenantID {
			if txType != "" && t.Type != txType {
				continue
			}
			res = append(res, t)
		}
	}
	return res, int64(len(res)), nil
}

func (m *mockFinancialRepo) UploadProof(ctx context.Context, filename string, content io.Reader, contentType string) (string, error) {
	return "/uploads/proofs/test_" + filename, nil
}

func TestFinancialUsecase(t *testing.T) {
	repo := newMockFinancialRepo()
	uc := usecase.NewFinancialUsecase(repo)

	ctx := context.Background()
	tenantID := uuid.New()
	userID := uuid.New()

	// 1. Fee Category CRUD
	cat := &domain.FeeCategory{
		Name:   "Iuran Kebersihan",
		Amount: 50000,
		Period: "monthly",
	}
	if err := uc.CreateFeeCategory(ctx, tenantID, cat); err != nil {
		t.Fatalf("CreateFeeCategory failed: %v", err)
	}

	gotCat, err := uc.GetFeeCategoryByID(ctx, tenantID, cat.ID)
	if err != nil || gotCat.Name != "Iuran Kebersihan" {
		t.Fatalf("GetFeeCategoryByID failed: %v", err)
	}

	cat.Amount = 60000
	if err := uc.UpdateFeeCategory(ctx, tenantID, cat); err != nil {
		t.Fatalf("UpdateFeeCategory failed: %v", err)
	}

	cats, total, err := uc.ListFeeCategories(ctx, tenantID, 10, 0)
	if err != nil || total != 1 || len(cats) != 1 {
		t.Fatalf("ListFeeCategories failed: %v", err)
	}

	// 2. Dues Payment Record & Verify
	resID := uuid.New()
	payment := &domain.DuesPayment{
		ResidentID:    resID,
		FeeCategoryID: cat.ID,
		Amount:        60000,
		PeriodMonth:   8,
		PeriodYear:    2026,
	}
	if err := uc.RecordDuesPayment(ctx, tenantID, payment); err != nil {
		t.Fatalf("RecordDuesPayment failed: %v", err)
	}

	verified, err := uc.VerifyDuesPayment(ctx, tenantID, payment.ID, "verified", userID)
	if err != nil || verified.Status != "verified" || verified.VerifiedBy == nil || *verified.VerifiedBy != userID {
		t.Fatalf("VerifyDuesPayment failed: %v", err)
	}

	duesList, duesTotal, err := uc.ListDuesPayments(ctx, tenantID, &resID, 10, 0)
	if err != nil || duesTotal != 1 || len(duesList) != 1 {
		t.Fatalf("ListDuesPayments failed: %v", err)
	}

	// 3. Financial Transaction CRUD
	tx := &domain.FinancialTransaction{
		Type:     "income",
		Category: "Iuran",
		Amount:   60000,
	}
	if err := uc.CreateFinancialTransaction(ctx, tenantID, tx, userID); err != nil {
		t.Fatalf("CreateFinancialTransaction failed: %v", err)
	}

	gotTx, err := uc.GetFinancialTransactionByID(ctx, tenantID, tx.ID)
	if err != nil || gotTx.Amount != 60000 {
		t.Fatalf("GetFinancialTransactionByID failed: %v", err)
	}

	txs, txTotal, err := uc.ListFinancialTransactions(ctx, tenantID, "income", 10, 0)
	if err != nil || txTotal != 1 || len(txs) != 1 {
		t.Fatalf("ListFinancialTransactions failed: %v", err)
	}

	if _, err := uc.ReverseFinancialTransaction(ctx, tenantID, tx.ID, "Koreksi", userID); err != nil {
		t.Fatalf("ReverseFinancialTransaction failed: %v", err)
	}

	// 4. Upload Proof
	proofURL, err := uc.UploadProof(ctx, "bukti.jpg", bytes.NewBufferString("dummy"), "image/jpeg")
	if err != nil || proofURL == "" {
		t.Fatalf("UploadProof failed: %v", err)
	}

	// Cleanup Fee Category
	if err := uc.DeleteFeeCategory(ctx, tenantID, cat.ID); err != nil {
		t.Fatalf("DeleteFeeCategory failed: %v", err)
	}
}
