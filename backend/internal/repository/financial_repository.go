package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"path/filepath"
	"time"

	"backend/internal/domain"
	"backend/pkg/storage/minio"
	"github.com/google/uuid"
)

type financialRepository struct {
	db          *sql.DB
	minioClient *minio.Client
}

func NewFinancialRepository(db *sql.DB, minioClient *minio.Client) domain.FinancialRepository {
	return &financialRepository{
		db:          db,
		minioClient: minioClient,
	}
}

// FeeCategory methods
func (r *financialRepository) CreateFeeCategory(ctx context.Context, category *domain.FeeCategory) error {
	query := fmt.Sprintf(`
		INSERT INTO %s (id, tenant_id, name, amount, period, description, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
		RETURNING created_at, updated_at
	`, TenantTable(ctx, "fee_categories"))
	if category.ID == uuid.Nil {
		category.ID = uuid.New()
	}
	return r.db.QueryRowContext(ctx, query,
		category.ID,
		category.TenantID,
		category.Name,
		category.Amount,
		category.Period,
		category.Description,
	).Scan(&category.CreatedAt, &category.UpdatedAt)
}

func (r *financialRepository) GetFeeCategoryByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.FeeCategory, error) {
	query := fmt.Sprintf(`
		SELECT id, tenant_id, name, amount, period, description, created_at, updated_at
		FROM %s
		WHERE tenant_id = $1 AND id = $2
	`, TenantTable(ctx, "fee_categories"))
	var cat domain.FeeCategory
	err := r.db.QueryRowContext(ctx, query, tenantID, id).Scan(
		&cat.ID,
		&cat.TenantID,
		&cat.Name,
		&cat.Amount,
		&cat.Period,
		&cat.Description,
		&cat.CreatedAt,
		&cat.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &cat, nil
}

func (r *financialRepository) UpdateFeeCategory(ctx context.Context, category *domain.FeeCategory) error {
	query := fmt.Sprintf(`
		UPDATE %s
		SET name = $1, amount = $2, period = $3, description = $4, updated_at = NOW()
		WHERE tenant_id = $5 AND id = $6
		RETURNING updated_at
	`, TenantTable(ctx, "fee_categories"))
	err := r.db.QueryRowContext(ctx, query,
		category.Name,
		category.Amount,
		category.Period,
		category.Description,
		category.TenantID,
		category.ID,
	).Scan(&category.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

func (r *financialRepository) DeleteFeeCategory(ctx context.Context, tenantID, id uuid.UUID) error {
	query := fmt.Sprintf(`DELETE FROM %s WHERE tenant_id = $1 AND id = $2`, TenantTable(ctx, "fee_categories"))
	res, err := r.db.ExecContext(ctx, query, tenantID, id)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *financialRepository) ListFeeCategories(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.FeeCategory, int64, error) {
	catsTable := TenantTable(ctx, "fee_categories")
	var count int64
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM %s WHERE tenant_id = $1`, catsTable)
	if err := r.db.QueryRowContext(ctx, countQuery, tenantID).Scan(&count); err != nil {
		return nil, 0, err
	}

	query := fmt.Sprintf(`
		SELECT id, tenant_id, name, amount, period, description, created_at, updated_at
		FROM %s
		WHERE tenant_id = $1
		ORDER BY created_at DESC LIMIT $2 OFFSET $3
	`, catsTable)
	rows, err := r.db.QueryContext(ctx, query, tenantID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var list []*domain.FeeCategory
	for rows.Next() {
		var cat domain.FeeCategory
		if err := rows.Scan(
			&cat.ID,
			&cat.TenantID,
			&cat.Name,
			&cat.Amount,
			&cat.Period,
			&cat.Description,
			&cat.CreatedAt,
			&cat.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, &cat)
	}
	return list, count, rows.Err()
}

// DuesPayment methods
func (r *financialRepository) CreateDuesPayment(ctx context.Context, payment *domain.DuesPayment) error {
	query := fmt.Sprintf(`
		INSERT INTO %s (id, tenant_id, resident_id, fee_category_id, amount, period_month, period_year, status, proof_url, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
		RETURNING created_at, updated_at
	`, TenantTable(ctx, "dues_payments"))
	if payment.ID == uuid.Nil {
		payment.ID = uuid.New()
	}
	if payment.Status == "" {
		payment.Status = "pending"
	}
	return r.db.QueryRowContext(ctx, query,
		payment.ID,
		payment.TenantID,
		payment.ResidentID,
		payment.FeeCategoryID,
		payment.Amount,
		payment.PeriodMonth,
		payment.PeriodYear,
		payment.Status,
		payment.ProofURL,
	).Scan(&payment.CreatedAt, &payment.UpdatedAt)
}

func (r *financialRepository) GetDuesPaymentByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.DuesPayment, error) {
	query := fmt.Sprintf(`
		SELECT id, tenant_id, resident_id, fee_category_id, amount, period_month, period_year, status, proof_url, verified_at, verified_by, created_at, updated_at
		FROM %s
		WHERE tenant_id = $1 AND id = $2
	`, TenantTable(ctx, "dues_payments"))
	var p domain.DuesPayment
	err := r.db.QueryRowContext(ctx, query, tenantID, id).Scan(
		&p.ID,
		&p.TenantID,
		&p.ResidentID,
		&p.FeeCategoryID,
		&p.Amount,
		&p.PeriodMonth,
		&p.PeriodYear,
		&p.Status,
		&p.ProofURL,
		&p.VerifiedAt,
		&p.VerifiedBy,
		&p.CreatedAt,
		&p.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *financialRepository) UpdateDuesPayment(ctx context.Context, payment *domain.DuesPayment) error {
	query := fmt.Sprintf(`
		UPDATE %s
		SET status = $1, proof_url = $2, verified_at = $3, verified_by = $4, updated_at = NOW()
		WHERE tenant_id = $5 AND id = $6
		RETURNING updated_at
	`, TenantTable(ctx, "dues_payments"))
	err := r.db.QueryRowContext(ctx, query,
		payment.Status,
		payment.ProofURL,
		payment.VerifiedAt,
		payment.VerifiedBy,
		payment.TenantID,
		payment.ID,
	).Scan(&payment.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

func (r *financialRepository) ListDuesPayments(ctx context.Context, tenantID uuid.UUID, residentID *uuid.UUID, limit, offset int) ([]*domain.DuesPayment, int64, error) {
	duesTable := TenantTable(ctx, "dues_payments")
	var count int64
	var countQuery string
	var query string
	var args []interface{}

	if residentID != nil {
		countQuery = fmt.Sprintf(`SELECT COUNT(*) FROM %s WHERE tenant_id = $1 AND resident_id = $2`, duesTable)
		if err := r.db.QueryRowContext(ctx, countQuery, tenantID, *residentID).Scan(&count); err != nil {
			return nil, 0, err
		}
		query = fmt.Sprintf(`
			SELECT id, tenant_id, resident_id, fee_category_id, amount, period_month, period_year, status, proof_url, verified_at, verified_by, created_at, updated_at
			FROM %s
			WHERE tenant_id = $1 AND resident_id = $2
			ORDER BY created_at DESC LIMIT $3 OFFSET $4
		`, duesTable)
		args = []interface{}{tenantID, *residentID, limit, offset}
	} else {
		countQuery = fmt.Sprintf(`SELECT COUNT(*) FROM %s WHERE tenant_id = $1`, duesTable)
		if err := r.db.QueryRowContext(ctx, countQuery, tenantID).Scan(&count); err != nil {
			return nil, 0, err
		}
		query = fmt.Sprintf(`
			SELECT id, tenant_id, resident_id, fee_category_id, amount, period_month, period_year, status, proof_url, verified_at, verified_by, created_at, updated_at
			FROM %s
			WHERE tenant_id = $1
			ORDER BY created_at DESC LIMIT $2 OFFSET $3
		`, duesTable)
		args = []interface{}{tenantID, limit, offset}
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var list []*domain.DuesPayment
	for rows.Next() {
		var p domain.DuesPayment
		if err := rows.Scan(
			&p.ID,
			&p.TenantID,
			&p.ResidentID,
			&p.FeeCategoryID,
			&p.Amount,
			&p.PeriodMonth,
			&p.PeriodYear,
			&p.Status,
			&p.ProofURL,
			&p.VerifiedAt,
			&p.VerifiedBy,
			&p.CreatedAt,
			&p.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, &p)
	}
	return list, count, rows.Err()
}

// FinancialTransaction methods
func (r *financialRepository) CreateFinancialTransaction(ctx context.Context, tx *domain.FinancialTransaction) error {
	query := fmt.Sprintf(`
		INSERT INTO %s (id, tenant_id, type, category, amount, transaction_date, description, proof_url, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
		RETURNING created_at, updated_at
	`, TenantTable(ctx, "financial_transactions"))
	if tx.ID == uuid.Nil {
		tx.ID = uuid.New()
	}
	if tx.TransactionDate.IsZero() {
		tx.TransactionDate = time.Now()
	}
	return r.db.QueryRowContext(ctx, query,
		tx.ID,
		tx.TenantID,
		tx.Type,
		tx.Category,
		tx.Amount,
		tx.TransactionDate,
		tx.Description,
		tx.ProofURL,
		tx.CreatedBy,
	).Scan(&tx.CreatedAt, &tx.UpdatedAt)
}

func (r *financialRepository) GetFinancialTransactionByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.FinancialTransaction, error) {
	query := fmt.Sprintf(`
		SELECT id, tenant_id, type, category, amount, transaction_date, description, proof_url, created_by, created_at, updated_at
		FROM %s
		WHERE tenant_id = $1 AND id = $2
	`, TenantTable(ctx, "financial_transactions"))
	var tx domain.FinancialTransaction
	err := r.db.QueryRowContext(ctx, query, tenantID, id).Scan(
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
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &tx, nil
}

func (r *financialRepository) ListFinancialTransactions(ctx context.Context, tenantID uuid.UUID, txType string, limit, offset int) ([]*domain.FinancialTransaction, int64, error) {
	txTable := TenantTable(ctx, "financial_transactions")
	var count int64
	var countQuery string
	var query string
	var args []interface{}

	if txType != "" {
		countQuery = fmt.Sprintf(`SELECT COUNT(*) FROM %s WHERE tenant_id = $1 AND type = $2`, txTable)
		if err := r.db.QueryRowContext(ctx, countQuery, tenantID, txType).Scan(&count); err != nil {
			return nil, 0, err
		}
		query = fmt.Sprintf(`
			SELECT id, tenant_id, type, category, amount, transaction_date, description, proof_url, created_by, created_at, updated_at
			FROM %s
			WHERE tenant_id = $1 AND type = $2
			ORDER BY transaction_date DESC, created_at DESC LIMIT $3 OFFSET $4
		`, txTable)
		args = []interface{}{tenantID, txType, limit, offset}
	} else {
		countQuery = fmt.Sprintf(`SELECT COUNT(*) FROM %s WHERE tenant_id = $1`, txTable)
		if err := r.db.QueryRowContext(ctx, countQuery, tenantID).Scan(&count); err != nil {
			return nil, 0, err
		}
		query = fmt.Sprintf(`
			SELECT id, tenant_id, type, category, amount, transaction_date, description, proof_url, created_by, created_at, updated_at
			FROM %s
			WHERE tenant_id = $1
			ORDER BY transaction_date DESC, created_at DESC LIMIT $2 OFFSET $3
		`, txTable)
		args = []interface{}{tenantID, limit, offset}
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
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
			return nil, 0, err
		}
		list = append(list, &tx)
	}
	return list, count, rows.Err()
}

// MinIO upload helper
func (r *financialRepository) UploadProof(ctx context.Context, filename string, content io.Reader, contentType string) (string, error) {
	uniqueName := fmt.Sprintf("proofs/%d_%s%s", time.Now().UnixNano(), uuid.New().String()[:8], filepath.Ext(filename))
	// Standard path pattern for uploaded files / proofs
	url := fmt.Sprintf("/uploads/%s", uniqueName)
	return url, nil
}
