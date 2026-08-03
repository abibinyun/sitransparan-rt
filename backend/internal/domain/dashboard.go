package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type DashboardSummary struct {
	TotalResidents    int64   `json:"total_residents"`
	TotalIncome       float64 `json:"total_income"`
	TotalExpense      float64 `json:"total_expense"`
	Balance           float64 `json:"balance"`
	TotalEvents       int64   `json:"total_events"`
	NewAspirationsCount int64 `json:"new_aspirations_count"`
}

type FinancialReportFilter struct {
	StartDate *time.Time
	EndDate   *time.Time
	Format    string // "csv" or "pdf"
}

type DashboardRepository interface {
	GetSummary(ctx context.Context, tenantID uuid.UUID) (*DashboardSummary, error)
	GetFinancialTransactionsForReport(ctx context.Context, tenantID uuid.UUID, startDate, endDate *time.Time) ([]*FinancialTransaction, error)
}

type DashboardUsecase interface {
	GetSummary(ctx context.Context, tenantID uuid.UUID) (*DashboardSummary, error)
	ExportFinancialReport(ctx context.Context, tenantID uuid.UUID, filter FinancialReportFilter) ([]byte, string, string, error) // data, contentType, filename, error
}
