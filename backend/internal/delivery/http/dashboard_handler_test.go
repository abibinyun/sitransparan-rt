package http_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	delivery "backend/internal/delivery/http"
	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type MockDashboardUsecase struct {
	mock.Mock
}

func (m *MockDashboardUsecase) GetSummary(ctx context.Context, tenantID uuid.UUID) (*domain.DashboardSummary, error) {
	args := m.Called(ctx, tenantID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.DashboardSummary), args.Error(1)
}

func (m *MockDashboardUsecase) ExportFinancialReport(ctx context.Context, tenantID uuid.UUID, filter domain.FinancialReportFilter) ([]byte, string, string, error) {
	args := m.Called(ctx, tenantID, filter)
	if args.Get(0) == nil {
		return nil, args.String(1), args.String(2), args.Error(3)
	}
	return args.Get(0).([]byte), args.String(1), args.String(2), args.Error(3)
}

func testMiddleware(tenantID uuid.UUID) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := context.WithValue(r.Context(), middleware.TenantContextKey, &domain.Tenant{ID: tenantID})
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func TestDashboardHandler_GetSummary(t *testing.T) {
	tenantID := uuid.New()
	uc := new(MockDashboardUsecase)
	handler := delivery.NewDashboardHandler(uc)

	expectedSummary := &domain.DashboardSummary{
		TotalResidents:      50,
		TotalIncome:         1000000,
		TotalExpense:        400000,
		Balance:             600000,
		TotalEvents:         3,
		NewAspirationsCount: 2,
	}

	uc.On("GetSummary", mock.Anything, tenantID).Return(expectedSummary, nil)

	mux := http.NewServeMux()
	mw := testMiddleware(tenantID)
	handler.RegisterRoutes(mux, mw, mw)

	req := httptest.NewRequest("GET", "/api/v1/dashboard/summary", nil)
	rec := httptest.NewRecorder()

	mux.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	var resp domain.DashboardSummary
	err := json.Unmarshal(rec.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Equal(t, *expectedSummary, resp)
	uc.AssertExpectations(t)
}

func TestDashboardHandler_ExportFinancialReport(t *testing.T) {
	tenantID := uuid.New()
	uc := new(MockDashboardUsecase)
	handler := delivery.NewDashboardHandler(uc)

	mockData := []byte("ID,Tanggal,Tipe,Kategori,Jumlah,Deskripsi\n")
	uc.On("ExportFinancialReport", mock.Anything, tenantID, mock.MatchedBy(func(f domain.FinancialReportFilter) bool {
		return f.Format == "csv"
	})).Return(mockData, "text/csv", "laporan_keuangan.csv", nil)

	mux := http.NewServeMux()
	mw := testMiddleware(tenantID)
	handler.RegisterRoutes(mux, mw, mw)

	req := httptest.NewRequest("GET", "/api/v1/dashboard/reports/financial/export?format=csv", nil)
	rec := httptest.NewRecorder()

	mux.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, "text/csv", rec.Header().Get("Content-Type"))
	assert.Contains(t, rec.Header().Get("Content-Disposition"), "laporan_keuangan.csv")
	assert.Equal(t, string(mockData), rec.Body.String())
	uc.AssertExpectations(t)
}
