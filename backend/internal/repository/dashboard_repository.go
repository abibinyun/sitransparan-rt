package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"backend/internal/domain"
	"github.com/google/uuid"
)

type dashboardRepository struct {
	db *sql.DB
}

func NewDashboardRepository(db *sql.DB) domain.DashboardRepository {
	return &dashboardRepository{db: db}
}

func (r *dashboardRepository) GetSummary(ctx context.Context, tenantID uuid.UUID) (*domain.DashboardSummary, error) {
	summary := &domain.DashboardSummary{}

	residentsTable := TenantTable(ctx, "residents")
	txTable := TenantTable(ctx, "financial_transactions")
	duesTable := TenantTable(ctx, "dues_payments")
	eventsTable := TenantTable(ctx, "events")
	aspTable := TenantTable(ctx, "aspirations")

	// Total Residents
	err := r.db.QueryRowContext(ctx, fmt.Sprintf(`SELECT COUNT(*) FROM %s WHERE tenant_id = $1`, residentsTable), tenantID).Scan(&summary.TotalResidents)
	if err != nil {
		return nil, err
	}

	// Total Income from financial_transactions where type='income' + verified dues_payments
	var txIncome sql.NullFloat64
	err = r.db.QueryRowContext(ctx, fmt.Sprintf(`SELECT SUM(amount) FROM %s WHERE tenant_id = $1 AND type = 'income'`, txTable), tenantID).Scan(&txIncome)
	if err != nil {
		return nil, err
	}

	var duesIncome sql.NullFloat64
	err = r.db.QueryRowContext(ctx, fmt.Sprintf(`SELECT SUM(amount) FROM %s WHERE tenant_id = $1 AND status = 'verified'`, duesTable), tenantID).Scan(&duesIncome)
	if err != nil {
		return nil, err
	}

	summary.TotalIncome = txIncome.Float64 + duesIncome.Float64

	// Total Expense from financial_transactions where type='expense'
	var txExpense sql.NullFloat64
	err = r.db.QueryRowContext(ctx, fmt.Sprintf(`SELECT SUM(amount) FROM %s WHERE tenant_id = $1 AND type = 'expense'`, txTable), tenantID).Scan(&txExpense)
	if err != nil {
		return nil, err
	}
	summary.TotalExpense = txExpense.Float64

	// Saldo = Total Income - Total Expense
	summary.Balance = summary.TotalIncome - summary.TotalExpense

	// Total Events
	err = r.db.QueryRowContext(ctx, fmt.Sprintf(`SELECT COUNT(*) FROM %s WHERE tenant_id = $1`, eventsTable), tenantID).Scan(&summary.TotalEvents)
	if err != nil {
		return nil, err
	}

	// New Aspirations Count (aspirations with status 'submitted' or 'under_review')
	var newAsp sql.NullInt64
	err = r.db.QueryRowContext(ctx, fmt.Sprintf(`SELECT COUNT(*) FROM %s WHERE tenant_id = $1 AND status IN ('submitted', 'under_review')`, aspTable), tenantID).Scan(&newAsp)
	if err != nil {
		return nil, err
	}
	summary.NewAspirationsCount = newAsp.Int64

	return summary, nil
}

func (r *dashboardRepository) GetFinancialTransactionsForReport(ctx context.Context, tenantID uuid.UUID, startDate, endDate *time.Time) ([]*domain.FinancialTransaction, error) {
	txTable := TenantTable(ctx, "financial_transactions")
	fundsTable := TenantTable(ctx, "funds")
	query := fmt.Sprintf(`
		SELECT t.id, t.tenant_id, t.fund_id, COALESCE(f.name, ''), t.type, t.category, t.amount, t.transaction_date, t.description, t.proof_url, t.created_by, t.created_at, t.updated_at
		FROM %s t
		LEFT JOIN %s f ON f.id = t.fund_id
		WHERE t.tenant_id = $1
	`, txTable, fundsTable)
	args := []interface{}{tenantID}

	if startDate != nil {
		args = append(args, *startDate)
		query += fmt.Sprintf(" AND t.transaction_date >= $%d", len(args))
	}
	if endDate != nil {
		args = append(args, *endDate)
		query += fmt.Sprintf(" AND t.transaction_date <= $%d", len(args))
	}

	query += " ORDER BY t.transaction_date ASC, t.created_at ASC"

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.FinancialTransaction
	for rows.Next() {
		var tx domain.FinancialTransaction
		var fundName string
		if err := rows.Scan(
			&tx.ID,
			&tx.TenantID,
			&tx.FundID,
			&fundName,
			&tx.Type,
			&tx.Category,
			&tx.Amount,
			&tx.TransactionDate,
			&tx.Description,
			&tx.ProofURL,
			&tx.CreatedBy,
			&tx.CreatedAt,
			&tx.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if fundName != "" {
			tx.FundName = &fundName
		}
		list = append(list, &tx)
	}

	return list, rows.Err()
}
