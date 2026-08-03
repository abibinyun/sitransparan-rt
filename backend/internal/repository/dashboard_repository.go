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

	// Total Residents
	err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM residents WHERE tenant_id = $1`, tenantID).Scan(&summary.TotalResidents)
	if err != nil {
		return nil, err
	}

	// Total Income from financial_transactions where type='income' + verified dues_payments
	var txIncome sql.NullFloat64
	err = r.db.QueryRowContext(ctx, `SELECT SUM(amount) FROM financial_transactions WHERE tenant_id = $1 AND type = 'income'`, tenantID).Scan(&txIncome)
	if err != nil {
		return nil, err
	}

	var duesIncome sql.NullFloat64
	err = r.db.QueryRowContext(ctx, `SELECT SUM(amount) FROM dues_payments WHERE tenant_id = $1 AND status = 'verified'`, tenantID).Scan(&duesIncome)
	if err != nil {
		return nil, err
	}

	summary.TotalIncome = txIncome.Float64 + duesIncome.Float64

	// Total Expense from financial_transactions where type='expense'
	var txExpense sql.NullFloat64
	err = r.db.QueryRowContext(ctx, `SELECT SUM(amount) FROM financial_transactions WHERE tenant_id = $1 AND type = 'expense'`, tenantID).Scan(&txExpense)
	if err != nil {
		return nil, err
	}
	summary.TotalExpense = txExpense.Float64

	// Saldo = Total Income - Total Expense
	summary.Balance = summary.TotalIncome - summary.TotalExpense

	// Total Events
	err = r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM events WHERE tenant_id = $1`, tenantID).Scan(&summary.TotalEvents)
	if err != nil {
		return nil, err
	}

	// New Aspirations Count (aspirations with status 'submitted' or 'pending' or total aspirations)
	err = r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM aspirations_and_needs WHERE tenant_id = $1 AND type = 'aspiration'`, tenantID).Scan(&summary.NewAspirationsCount)
	if err != nil {
		return nil, err
	}

	return summary, nil
}

func (r *dashboardRepository) GetFinancialTransactionsForReport(ctx context.Context, tenantID uuid.UUID, startDate, endDate *time.Time) ([]*domain.FinancialTransaction, error) {
	query := `
		SELECT id, tenant_id, type, category, amount, transaction_date, description, proof_url, created_by, created_at, updated_at
		FROM financial_transactions
		WHERE tenant_id = $1
	`
	args := []interface{}{tenantID}

	if startDate != nil {
		args = append(args, *startDate)
		query += fmt.Sprintf(" AND transaction_date >= $%d", len(args))
	}
	if endDate != nil {
		args = append(args, *endDate)
		query += fmt.Sprintf(" AND transaction_date <= $%d", len(args))
	}

	query += " ORDER BY transaction_date ASC"

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.FinancialTransaction
	for rows.Next() {
		var tx domain.FinancialTransaction
		if err := rows.Scan(
			&tx.ID,
			&tx.TenantID,
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
		list = append(list, &tx)
	}

	return list, rows.Err()
}
