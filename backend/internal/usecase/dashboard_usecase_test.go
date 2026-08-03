package usecase_test

import (
	"context"
	"testing"
	"time"

	"backend/internal/domain"
	"backend/internal/usecase"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type MockDashboardRepository struct {
	mock.Mock
}

func (m *MockDashboardRepository) GetSummary(ctx context.Context, tenantID uuid.UUID) (*domain.DashboardSummary, error) {
	args := m.Called(ctx, tenantID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.DashboardSummary), args.Error(1)
}

func (m *MockDashboardRepository) GetFinancialTransactionsForReport(ctx context.Context, tenantID uuid.UUID, startDate, endDate *time.Time) ([]*domain.FinancialTransaction, error) {
	args := m.Called(ctx, tenantID, startDate, endDate)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.FinancialTransaction), args.Error(1)
}

func TestDashboardUsecase_GetSummary(t *testing.T) {
	repo := new(MockDashboardRepository)
	uc := usecase.NewDashboardUsecase(repo)

	tenantID := uuid.New()
	expectedSummary := &domain.DashboardSummary{
		TotalResidents:      100,
		TotalIncome:         5000000,
		TotalExpense:        2000000,
		Balance:             3000000,
		TotalEvents:         5,
		NewAspirationsCount: 12,
	}

	repo.On("GetSummary", mock.Anything, tenantID).Return(expectedSummary, nil)

	summary, err := uc.GetSummary(context.Background(), tenantID)
	assert.NoError(t, err)
	assert.Equal(t, expectedSummary, summary)
	repo.AssertExpectations(t)
}

func TestDashboardUsecase_ExportFinancialReport_CSV(t *testing.T) {
	repo := new(MockDashboardRepository)
	uc := usecase.NewDashboardUsecase(repo)

	tenantID := uuid.New()
	desc := "Iuran bulanan"
	txs := []*domain.FinancialTransaction{
		{
			ID:              uuid.New(),
			TenantID:        tenantID,
			Type:            "income",
			Category:        "Iuran",
			Amount:          50000,
			TransactionDate: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
			Description:     &desc,
		},
	}

	filter := domain.FinancialReportFilter{Format: "csv"}
	repo.On("GetFinancialTransactionsForReport", mock.Anything, tenantID, filter.StartDate, filter.EndDate).Return(txs, nil)

	data, contentType, filename, err := uc.ExportFinancialReport(context.Background(), tenantID, filter)
	assert.NoError(t, err)
	assert.Equal(t, "text/csv", contentType)
	assert.Equal(t, "laporan_keuangan.csv", filename)
	assert.Contains(t, string(data), "income")
	assert.Contains(t, string(data), "50000.00")
	repo.AssertExpectations(t)
}

func TestDashboardUsecase_ExportFinancialReport_PDF(t *testing.T) {
	repo := new(MockDashboardRepository)
	uc := usecase.NewDashboardUsecase(repo)

	tenantID := uuid.New()
	desc := "Pembelian alat kebersihan"
	txs := []*domain.FinancialTransaction{
		{
			ID:              uuid.New(),
			TenantID:        tenantID,
			Type:            "expense",
			Category:        "Kebersihan",
			Amount:          150000,
			TransactionDate: time.Date(2026, 1, 2, 0, 0, 0, 0, time.UTC),
			Description:     &desc,
		},
	}

	filter := domain.FinancialReportFilter{Format: "pdf"}
	repo.On("GetFinancialTransactionsForReport", mock.Anything, tenantID, filter.StartDate, filter.EndDate).Return(txs, nil)

	data, contentType, filename, err := uc.ExportFinancialReport(context.Background(), tenantID, filter)
	assert.NoError(t, err)
	assert.Equal(t, "application/pdf", contentType)
	assert.Equal(t, "laporan_keuangan.pdf", filename)
	assert.True(t, len(data) > 0)
	repo.AssertExpectations(t)
}
