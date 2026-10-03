package usecase_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"backend/internal/domain"
	"backend/internal/usecase"
)

type mockWasteBankRepo struct {
	categories map[uuid.UUID]*domain.WasteCategory
	deposits   map[uuid.UUID]*domain.WasteDeposit
}

func newMockWasteBankRepo() *mockWasteBankRepo {
	return &mockWasteBankRepo{
		categories: make(map[uuid.UUID]*domain.WasteCategory),
		deposits:   make(map[uuid.UUID]*domain.WasteDeposit),
	}
}

func (m *mockWasteBankRepo) ListCategories(ctx context.Context, tenantID uuid.UUID, activeOnly bool) ([]*domain.WasteCategory, error) {
	var list []*domain.WasteCategory
	for _, c := range m.categories {
		list = append(list, c)
	}
	return list, nil
}
func (m *mockWasteBankRepo) GetCategoryByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.WasteCategory, error) {
	return m.categories[id], nil
}
func (m *mockWasteBankRepo) CreateCategory(ctx context.Context, category *domain.WasteCategory) error {
	m.categories[category.ID] = category
	return nil
}
func (m *mockWasteBankRepo) UpdateCategory(ctx context.Context, category *domain.WasteCategory) error {
	m.categories[category.ID] = category
	return nil
}
func (m *mockWasteBankRepo) DeleteCategory(ctx context.Context, tenantID, id uuid.UUID) error {
	delete(m.categories, id)
	return nil
}
func (m *mockWasteBankRepo) CreateDeposit(ctx context.Context, deposit *domain.WasteDeposit) error {
	m.deposits[deposit.ID] = deposit
	return nil
}
func (m *mockWasteBankRepo) GetDepositByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.WasteDeposit, error) {
	return m.deposits[id], nil
}
func (m *mockWasteBankRepo) ListDeposits(ctx context.Context, tenantID uuid.UUID, search, status string, limit, offset int) ([]*domain.WasteDeposit, int64, error) {
	var list []*domain.WasteDeposit
	for _, d := range m.deposits {
		list = append(list, d)
	}
	return list, int64(len(list)), nil
}
func (m *mockWasteBankRepo) UpdateDepositStatus(ctx context.Context, tenantID, id uuid.UUID, status string) error {
	return nil
}
func (m *mockWasteBankRepo) GetSummary(ctx context.Context, tenantID uuid.UUID) (*domain.WasteBankSummary, error) {
	return nil, nil
}
func (m *mockWasteBankRepo) ListHouseholdAccumulations(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.HouseholdWasteAccumulation, int64, error) {
	return nil, 0, nil
}

type mockAuditRepo struct{}

func (m *mockAuditRepo) Create(ctx context.Context, log *domain.AuditLog) error {
	return nil
}
func (m *mockAuditRepo) List(ctx context.Context, filter domain.AuditLogFilter) ([]domain.AuditLog, int, error) {
	return nil, 0, nil
}

func TestWasteBankUsecase_DepositCalculations(t *testing.T) {
	repo := newMockWasteBankRepo()
	auditRepo := &mockAuditRepo{}
	uc := usecase.NewWasteBankUsecase(repo, auditRepo)
	ctx := context.Background()
	tenantID := uuid.New()

	// 1. Buat Kategori: Kardus
	catID := uuid.New()
	_ = repo.CreateCategory(ctx, &domain.WasteCategory{
		ID:                   catID,
		TenantID:             tenantID,
		Name:                 "Kardus",
		Unit:                 "kg",
		PricePerUnit:         2000,
		ResidentSharePct:     80,
		KarangTarunaSharePct: 20,
		IsActive:             true,
	})

	// 2. Buat deposit dengan 1 item: 10 kg
	item := &domain.WasteDepositItem{
		ID:                 uuid.New(),
		CategoryID:         catID,
		Quantity:           10,
		UnitPrice:          2000,
		GrossAmount:        20000,
		ResidentAmount:     16000,
		KarangTarunaAmount: 4000,
	}

	deposit := &domain.WasteDeposit{
		ID:                 uuid.New(),
		TenantID:           tenantID,
		FamilyHeadName:     "Bapak Joko",
		DepositDate:        time.Now(),
		TotalWeight:        10,
		TotalGrossAmount:   20000,
		ResidentAmount:     16000,
		KarangTarunaAmount: 4000,
		Status:             "pending",
		Items:              []*domain.WasteDepositItem{item},
	}

	err := uc.CreateDeposit(ctx, deposit)
	if err != nil {
		t.Fatalf("CreateDeposit failed: %v", err)
	}

	saved, err := uc.GetDepositByID(ctx, tenantID, deposit.ID)
	if err != nil || saved == nil {
		t.Fatalf("GetDepositByID failed: %v", err)
	}
	if saved.ResidentAmount != 16000 {
		t.Errorf("expected resident amount 16000, got %f", saved.ResidentAmount)
	}
	if saved.KarangTarunaAmount != 4000 {
		t.Errorf("expected youth amount 4000, got %f", saved.KarangTarunaAmount)
	}
}
