package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"backend/internal/domain"
	"github.com/google/uuid"
)

type wasteBankRepository struct {
	db *sql.DB
}

func NewWasteBankRepository(db *sql.DB) domain.WasteBankRepository {
	return &wasteBankRepository{db: db}
}

// Categories
func (r *wasteBankRepository) ListCategories(ctx context.Context, tenantID uuid.UUID, activeOnly bool) ([]*domain.WasteCategory, error) {
	table := TenantTable(ctx, "waste_categories")
	query := fmt.Sprintf(`
		SELECT id, tenant_id, name, unit, price_per_unit, resident_share_pct, karang_taruna_share_pct, description, is_active, created_at, updated_at
		FROM %s
		WHERE tenant_id = $1
	`, table)

	if activeOnly {
		query += " AND is_active = TRUE"
	}
	query += " ORDER BY name ASC"

	rows, err := r.db.QueryContext(ctx, query, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.WasteCategory
	for rows.Next() {
		var c domain.WasteCategory
		if err := rows.Scan(
			&c.ID, &c.TenantID, &c.Name, &c.Unit, &c.PricePerUnit,
			&c.ResidentSharePct, &c.KarangTarunaSharePct, &c.Description,
			&c.IsActive, &c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, &c)
	}
	return list, rows.Err()
}

func (r *wasteBankRepository) GetCategoryByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.WasteCategory, error) {
	table := TenantTable(ctx, "waste_categories")
	query := fmt.Sprintf(`
		SELECT id, tenant_id, name, unit, price_per_unit, resident_share_pct, karang_taruna_share_pct, description, is_active, created_at, updated_at
		FROM %s
		WHERE tenant_id = $1 AND id = $2
	`, table)

	var c domain.WasteCategory
	err := r.db.QueryRowContext(ctx, query, tenantID, id).Scan(
		&c.ID, &c.TenantID, &c.Name, &c.Unit, &c.PricePerUnit,
		&c.ResidentSharePct, &c.KarangTarunaSharePct, &c.Description,
		&c.IsActive, &c.CreatedAt, &c.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &c, err
}

func (r *wasteBankRepository) CreateCategory(ctx context.Context, c *domain.WasteCategory) error {
	table := TenantTable(ctx, "waste_categories")
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	query := fmt.Sprintf(`
		INSERT INTO %s (id, tenant_id, name, unit, price_per_unit, resident_share_pct, karang_taruna_share_pct, description, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
		RETURNING created_at, updated_at
	`, table)

	return r.db.QueryRowContext(ctx, query,
		c.ID, c.TenantID, c.Name, c.Unit, c.PricePerUnit,
		c.ResidentSharePct, c.KarangTarunaSharePct, c.Description, c.IsActive,
	).Scan(&c.CreatedAt, &c.UpdatedAt)
}

func (r *wasteBankRepository) UpdateCategory(ctx context.Context, c *domain.WasteCategory) error {
	table := TenantTable(ctx, "waste_categories")
	query := fmt.Sprintf(`
		UPDATE %s
		SET name = $1, unit = $2, price_per_unit = $3, resident_share_pct = $4, karang_taruna_share_pct = $5, description = $6, is_active = $7, updated_at = NOW()
		WHERE tenant_id = $8 AND id = $9
	`, table)

	res, err := r.db.ExecContext(ctx, query,
		c.Name, c.Unit, c.PricePerUnit, c.ResidentSharePct, c.KarangTarunaSharePct,
		c.Description, c.IsActive, c.TenantID, c.ID,
	)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *wasteBankRepository) DeleteCategory(ctx context.Context, tenantID, id uuid.UUID) error {
	table := TenantTable(ctx, "waste_categories")
	query := fmt.Sprintf(`UPDATE %s SET deleted_at = NOW(), updated_at = NOW() WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`, table)
	res, err := r.db.ExecContext(ctx, query, tenantID, id)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

// Deposits
func (r *wasteBankRepository) CreateDeposit(ctx context.Context, d *domain.WasteDeposit) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	if d.DepositDate.IsZero() {
		d.DepositDate = time.Now()
	}
	if d.Status == "" {
		d.Status = "verified"
	}

	depTable := TenantTable(ctx, "waste_deposits")
	query := fmt.Sprintf(`
		INSERT INTO %s (
			id, tenant_id, house_id, resident_id, kk_number, family_head_name,
			deposit_date, total_weight, total_gross_amount, resident_amount,
			karang_taruna_amount, status, notes, recorded_by, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
		) RETURNING created_at, updated_at
	`, depTable)

	if err := tx.QueryRowContext(ctx, query,
		d.ID, d.TenantID, d.HouseID, d.ResidentID, d.KKNumber, d.FamilyHeadName,
		d.DepositDate, d.TotalWeight, d.TotalGrossAmount, d.ResidentAmount,
		d.KarangTarunaAmount, d.Status, d.Notes, d.RecordedBy,
	).Scan(&d.CreatedAt, &d.UpdatedAt); err != nil {
		return err
	}

	itemTable := TenantTable(ctx, "waste_deposit_items")
	itemQuery := fmt.Sprintf(`
		INSERT INTO %s (
			id, deposit_id, category_id, quantity, unit_price,
			gross_amount, resident_amount, karang_taruna_amount, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
	`, itemTable)

	for _, itm := range d.Items {
		if itm.ID == uuid.Nil {
			itm.ID = uuid.New()
		}
		itm.DepositID = d.ID
		if _, err := tx.ExecContext(ctx, itemQuery,
			itm.ID, itm.DepositID, itm.CategoryID, itm.Quantity, itm.UnitPrice,
			itm.GrossAmount, itm.ResidentAmount, itm.KarangTarunaAmount,
		); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *wasteBankRepository) GetDepositByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.WasteDeposit, error) {
	depTable := TenantTable(ctx, "waste_deposits")
	query := fmt.Sprintf(`
		SELECT id, tenant_id, house_id, resident_id, kk_number, family_head_name,
		       deposit_date, total_weight, total_gross_amount, resident_amount,
		       karang_taruna_amount, status, notes, recorded_by, created_at, updated_at
		FROM %s
		WHERE tenant_id = $1 AND id = $2
	`, depTable)

	var d domain.WasteDeposit
	err := r.db.QueryRowContext(ctx, query, tenantID, id).Scan(
		&d.ID, &d.TenantID, &d.HouseID, &d.ResidentID, &d.KKNumber, &d.FamilyHeadName,
		&d.DepositDate, &d.TotalWeight, &d.TotalGrossAmount, &d.ResidentAmount,
		&d.KarangTarunaAmount, &d.Status, &d.Notes, &d.RecordedBy, &d.CreatedAt, &d.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	itemTable := TenantTable(ctx, "waste_deposit_items")
	catTable := TenantTable(ctx, "waste_categories")
	itemsQuery := fmt.Sprintf(`
		SELECT i.id, i.deposit_id, i.category_id, c.name, c.unit, i.quantity, i.unit_price,
		       i.gross_amount, i.resident_amount, i.karang_taruna_amount, i.created_at
		FROM %s i
		LEFT JOIN %s c ON i.category_id = c.id
		WHERE i.deposit_id = $1
		ORDER BY i.created_at ASC
	`, itemTable, catTable)

	rows, err := r.db.QueryContext(ctx, itemsQuery, d.ID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var itm domain.WasteDepositItem
			var catName, catUnit sql.NullString
			if err := rows.Scan(
				&itm.ID, &itm.DepositID, &itm.CategoryID, &catName, &catUnit,
				&itm.Quantity, &itm.UnitPrice, &itm.GrossAmount,
				&itm.ResidentAmount, &itm.KarangTarunaAmount, &itm.CreatedAt,
			); err == nil {
				if catName.Valid {
					itm.CategoryName = catName.String
				}
				if catUnit.Valid {
					itm.CategoryUnit = catUnit.String
				}
				d.Items = append(d.Items, &itm)
			}
		}
	}

	return &d, nil
}

func (r *wasteBankRepository) ListDeposits(ctx context.Context, tenantID uuid.UUID, search, status string, limit, offset int) ([]*domain.WasteDeposit, int64, error) {
	depTable := TenantTable(ctx, "waste_deposits")
	whereClause := "WHERE tenant_id = $1"
	args := []interface{}{tenantID}
	paramIdx := 2

	if search != "" {
		whereClause += fmt.Sprintf(" AND (family_head_name ILIKE $%d OR kk_number ILIKE $%d)", paramIdx, paramIdx)
		args = append(args, "%"+search+"%")
		paramIdx++
	}
	if status != "" {
		whereClause += fmt.Sprintf(" AND status = $%d", paramIdx)
		args = append(args, status)
		paramIdx++
	}

	var count int64
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM %s %s", depTable, whereClause)
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&count); err != nil {
		return nil, 0, err
	}

	query := fmt.Sprintf(`
		SELECT id, tenant_id, house_id, resident_id, kk_number, family_head_name,
		       deposit_date, total_weight, total_gross_amount, resident_amount,
		       karang_taruna_amount, status, notes, recorded_by, created_at, updated_at
		FROM %s
		%s
		ORDER BY deposit_date DESC, created_at DESC
		LIMIT $%d OFFSET $%d
	`, depTable, whereClause, paramIdx, paramIdx+1)
	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var list []*domain.WasteDeposit
	for rows.Next() {
		var d domain.WasteDeposit
		if err := rows.Scan(
			&d.ID, &d.TenantID, &d.HouseID, &d.ResidentID, &d.KKNumber, &d.FamilyHeadName,
			&d.DepositDate, &d.TotalWeight, &d.TotalGrossAmount, &d.ResidentAmount,
			&d.KarangTarunaAmount, &d.Status, &d.Notes, &d.RecordedBy, &d.CreatedAt, &d.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, &d)
	}

	return list, count, rows.Err()
}

func (r *wasteBankRepository) UpdateDepositStatus(ctx context.Context, tenantID, id uuid.UUID, status string) error {
	depTable := TenantTable(ctx, "waste_deposits")
	query := fmt.Sprintf(`UPDATE %s SET status = $1, updated_at = NOW() WHERE tenant_id = $2 AND id = $3`, depTable)
	res, err := r.db.ExecContext(ctx, query, status, tenantID, id)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *wasteBankRepository) GetSummary(ctx context.Context, tenantID uuid.UUID) (*domain.WasteBankSummary, error) {
	depTable := TenantTable(ctx, "waste_deposits")
	query := fmt.Sprintf(`
		SELECT
			COALESCE(COUNT(*), 0) AS total_deposits,
			COALESCE(SUM(total_weight), 0) AS total_weight_kg,
			COALESCE(SUM(total_gross_amount), 0) AS total_gross_value,
			COALESCE(SUM(resident_amount), 0) AS total_resident_earnings,
			COALESCE(SUM(karang_taruna_amount), 0) AS total_karang_taruna_share,
			COALESCE(COUNT(DISTINCT family_head_name), 0) AS active_households_count
		FROM %s
		WHERE tenant_id = $1 AND status != 'cancelled'
	`, depTable)

	var s domain.WasteBankSummary
	err := r.db.QueryRowContext(ctx, query, tenantID).Scan(
		&s.TotalDeposits, &s.TotalWeightKg, &s.TotalGrossValue,
		&s.TotalResidentEarnings, &s.TotalKarangTarunaShare, &s.ActiveHouseholdsCount,
	)
	return &s, err
}

func (r *wasteBankRepository) ListHouseholdAccumulations(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.HouseholdWasteAccumulation, int64, error) {
	depTable := TenantTable(ctx, "waste_deposits")

	var count int64
	countQuery := fmt.Sprintf(`SELECT COUNT(DISTINCT family_head_name) FROM %s WHERE tenant_id = $1 AND status != 'cancelled'`, depTable)
	if err := r.db.QueryRowContext(ctx, countQuery, tenantID).Scan(&count); err != nil {
		return nil, 0, err
	}

	query := fmt.Sprintf(`
		SELECT
			family_head_name,
			COALESCE(MAX(kk_number), '') AS kk_number,
			COALESCE(SUM(total_weight), 0) AS total_weight,
			COALESCE(SUM(total_gross_amount), 0) AS total_gross_amount,
			COALESCE(SUM(resident_amount), 0) AS resident_amount,
			COALESCE(SUM(karang_taruna_amount), 0) AS karang_taruna_amount,
			COUNT(*) AS deposit_count,
			COALESCE(MAX(deposit_date)::TEXT, '') AS last_deposit_date
		FROM %s
		WHERE tenant_id = $1 AND status != 'cancelled'
		GROUP BY family_head_name
		ORDER BY total_weight DESC
		LIMIT $2 OFFSET $3
	`, depTable)

	rows, err := r.db.QueryContext(ctx, query, tenantID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var list []*domain.HouseholdWasteAccumulation
	for rows.Next() {
		var h domain.HouseholdWasteAccumulation
		if err := rows.Scan(
			&h.FamilyHeadName, &h.KKNumber, &h.TotalWeight,
			&h.TotalGrossAmount, &h.ResidentAmount, &h.KarangTarunaAmount,
			&h.DepositCount, &h.LastDepositDate,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, &h)
	}

	return list, count, rows.Err()
}
