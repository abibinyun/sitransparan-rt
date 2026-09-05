package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"backend/internal/domain"
)

type inventoryRepository struct {
	db *sql.DB
}

func NewInventoryRepository(db *sql.DB) domain.InventoryRepository {
	return &inventoryRepository{db: db}
}

func (r *inventoryRepository) CreateItem(ctx context.Context, item *domain.InventoryItem) error {
	table := TenantTable(ctx, "inventory_items")
	query := fmt.Sprintf(`
		INSERT INTO %s (
			item_code, name, category, description, quantity, available_quantity, unit,
			condition, location, source_fund, purchase_date, purchase_price, photo_url,
			is_borrowable, notes, created_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		RETURNING id, created_at, updated_at
	`, table)

	return r.db.QueryRowContext(ctx, query,
		item.ItemCode, item.Name, item.Category, item.Description, item.Quantity, item.AvailableQuantity, item.Unit,
		item.Condition, item.Location, item.SourceFund, item.PurchaseDate, item.PurchasePrice, item.PhotoURL,
		item.IsBorrowable, item.Notes, item.CreatedBy,
	).Scan(&item.ID, &item.CreatedAt, &item.UpdatedAt)
}

func (r *inventoryRepository) GetItemByID(ctx context.Context, id uuid.UUID) (*domain.InventoryItem, error) {
	table := TenantTable(ctx, "inventory_items")
	query := fmt.Sprintf(`
		SELECT id, item_code, name, category, description, quantity, available_quantity, unit,
		       condition, location, source_fund, purchase_date, purchase_price, photo_url,
		       is_borrowable, notes, created_by, created_at, updated_at
		FROM %s
		WHERE id = $1 AND deleted_at IS NULL
	`, table)

	var it domain.InventoryItem
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&it.ID, &it.ItemCode, &it.Name, &it.Category, &it.Description, &it.Quantity, &it.AvailableQuantity, &it.Unit,
		&it.Condition, &it.Location, &it.SourceFund, &it.PurchaseDate, &it.PurchasePrice, &it.PhotoURL,
		&it.IsBorrowable, &it.Notes, &it.CreatedBy, &it.CreatedAt, &it.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &it, nil
}

func (r *inventoryRepository) ListItems(ctx context.Context, filter domain.InventoryFilter) ([]domain.InventoryItem, int, error) {
	table := TenantTable(ctx, "inventory_items")

	var conditions []string
	var args []interface{}
	idx := 1

	conditions = append(conditions, "deleted_at IS NULL")

	if filter.Category != "" {
		conditions = append(conditions, fmt.Sprintf("category = $%d", idx))
		args = append(args, filter.Category)
		idx++
	}

	if filter.Condition != "" {
		conditions = append(conditions, fmt.Sprintf("condition = $%d", idx))
		args = append(args, filter.Condition)
		idx++
	}

	if filter.IsBorrowable != nil {
		conditions = append(conditions, fmt.Sprintf("is_borrowable = $%d", idx))
		args = append(args, *filter.IsBorrowable)
		idx++
	}

	if filter.Search != "" {
		conditions = append(conditions, fmt.Sprintf("(name ILIKE $%d OR item_code ILIKE $%d OR location ILIKE $%d)", idx, idx, idx))
		args = append(args, "%"+filter.Search+"%")
		idx++
	}

	whereClause := strings.Join(conditions, " AND ")

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM %s WHERE %s", table, whereClause)
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := filter.Limit
	if limit <= 0 {
		limit = 50
	}
	offset := filter.Offset
	if offset < 0 {
		offset = 0
	}

	listQuery := fmt.Sprintf(`
		SELECT id, item_code, name, category, description, quantity, available_quantity, unit,
		       condition, location, source_fund, purchase_date, purchase_price, photo_url,
		       is_borrowable, notes, created_by, created_at, updated_at
		FROM %s
		WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, table, whereClause, idx, idx+1)

	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var items []domain.InventoryItem
	for rows.Next() {
		var it domain.InventoryItem
		if err := rows.Scan(
			&it.ID, &it.ItemCode, &it.Name, &it.Category, &it.Description, &it.Quantity, &it.AvailableQuantity, &it.Unit,
			&it.Condition, &it.Location, &it.SourceFund, &it.PurchaseDate, &it.PurchasePrice, &it.PhotoURL,
			&it.IsBorrowable, &it.Notes, &it.CreatedBy, &it.CreatedAt, &it.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		items = append(items, it)
	}

	return items, total, rows.Err()
}

func (r *inventoryRepository) UpdateItem(ctx context.Context, item *domain.InventoryItem) error {
	table := TenantTable(ctx, "inventory_items")
	query := fmt.Sprintf(`
		UPDATE %s
		SET item_code = $1, name = $2, category = $3, description = $4,
		    quantity = $5, available_quantity = $6, unit = $7, condition = $8,
		    location = $9, source_fund = $10, purchase_date = $11, purchase_price = $12,
		    photo_url = $13, is_borrowable = $14, notes = $15, updated_at = CURRENT_TIMESTAMP
		WHERE id = $16 AND deleted_at IS NULL
		RETURNING updated_at
	`, table)

	return r.db.QueryRowContext(ctx, query,
		item.ItemCode, item.Name, item.Category, item.Description,
		item.Quantity, item.AvailableQuantity, item.Unit, item.Condition,
		item.Location, item.SourceFund, item.PurchaseDate, item.PurchasePrice,
		item.PhotoURL, item.IsBorrowable, item.Notes, item.ID,
	).Scan(&item.UpdatedAt)
}

func (r *inventoryRepository) DeleteItem(ctx context.Context, id uuid.UUID) error {
	table := TenantTable(ctx, "inventory_items")
	query := fmt.Sprintf(`UPDATE %s SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL`, table)
	res, err := r.db.ExecContext(ctx, query, id)
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

func (r *inventoryRepository) CreateBorrowing(ctx context.Context, b *domain.InventoryBorrowing) error {
	tableBorrowings := TenantTable(ctx, "inventory_borrowings")
	query := fmt.Sprintf(`
		INSERT INTO %s (
			item_id, borrower_name, borrower_phone, borrower_resident_id, borrower_house_id,
			quantity, purpose, borrow_date, expected_return_date, status, condition_before,
			admin_notes, approved_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id, created_at, updated_at
	`, tableBorrowings)

	return r.db.QueryRowContext(ctx, query,
		b.ItemID, b.BorrowerName, b.BorrowerPhone, b.BorrowerResidentID, b.BorrowerHouseID,
		b.Quantity, b.Purpose, b.BorrowDate, b.ExpectedReturnDate, b.Status, b.ConditionBefore,
		b.AdminNotes, b.ApprovedBy,
	).Scan(&b.ID, &b.CreatedAt, &b.UpdatedAt)
}

func (r *inventoryRepository) GetBorrowingByID(ctx context.Context, id uuid.UUID) (*domain.InventoryBorrowing, error) {
	tableBorrowings := TenantTable(ctx, "inventory_borrowings")
	tableItems := TenantTable(ctx, "inventory_items")

	query := fmt.Sprintf(`
		SELECT b.id, b.item_id, i.name, b.borrower_name, b.borrower_phone,
		       b.borrower_resident_id, b.borrower_house_id, b.quantity, b.purpose,
		       b.borrow_date, b.expected_return_date, b.actual_return_date,
		       b.status, b.condition_before, b.condition_after, b.admin_notes,
		       b.approved_by, b.created_at, b.updated_at
		FROM %s b
		JOIN %s i ON b.item_id = i.id
		WHERE b.id = $1 AND b.deleted_at IS NULL
	`, tableBorrowings, tableItems)

	var b domain.InventoryBorrowing
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&b.ID, &b.ItemID, &b.ItemName, &b.BorrowerName, &b.BorrowerPhone,
		&b.BorrowerResidentID, &b.BorrowerHouseID, &b.Quantity, &b.Purpose,
		&b.BorrowDate, &b.ExpectedReturnDate, &b.ActualReturnDate,
		&b.Status, &b.ConditionBefore, &b.ConditionAfter, &b.AdminNotes,
		&b.ApprovedBy, &b.CreatedAt, &b.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &b, nil
}

func (r *inventoryRepository) ListBorrowings(ctx context.Context, filter domain.BorrowingFilter) ([]domain.InventoryBorrowing, int, error) {
	tableBorrowings := TenantTable(ctx, "inventory_borrowings")
	tableItems := TenantTable(ctx, "inventory_items")

	var conditions []string
	var args []interface{}
	idx := 1

	conditions = append(conditions, "b.deleted_at IS NULL")

	if filter.ItemID != nil {
		conditions = append(conditions, fmt.Sprintf("b.item_id = $%d", idx))
		args = append(args, *filter.ItemID)
		idx++
	}

	if filter.Status != "" {
		conditions = append(conditions, fmt.Sprintf("b.status = $%d", idx))
		args = append(args, filter.Status)
		idx++
	}

	if filter.Search != "" {
		conditions = append(conditions, fmt.Sprintf("(b.borrower_name ILIKE $%d OR b.borrower_phone ILIKE $%d OR i.name ILIKE $%d)", idx, idx, idx))
		args = append(args, "%"+filter.Search+"%")
		idx++
	}

	whereClause := strings.Join(conditions, " AND ")

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM %s b
		JOIN %s i ON b.item_id = i.id
		WHERE %s
	`, tableBorrowings, tableItems, whereClause)

	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := filter.Limit
	if limit <= 0 {
		limit = 50
	}
	offset := filter.Offset
	if offset < 0 {
		offset = 0
	}

	listQuery := fmt.Sprintf(`
		SELECT b.id, b.item_id, i.name, b.borrower_name, b.borrower_phone,
		       b.borrower_resident_id, b.borrower_house_id, b.quantity, b.purpose,
		       b.borrow_date, b.expected_return_date, b.actual_return_date,
		       b.status, b.condition_before, b.condition_after, b.admin_notes,
		       b.approved_by, b.created_at, b.updated_at
		FROM %s b
		JOIN %s i ON b.item_id = i.id
		WHERE %s
		ORDER BY b.created_at DESC
		LIMIT $%d OFFSET $%d
	`, tableBorrowings, tableItems, whereClause, idx, idx+1)

	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var list []domain.InventoryBorrowing
	for rows.Next() {
		var b domain.InventoryBorrowing
		if err := rows.Scan(
			&b.ID, &b.ItemID, &b.ItemName, &b.BorrowerName, &b.BorrowerPhone,
			&b.BorrowerResidentID, &b.BorrowerHouseID, &b.Quantity, &b.Purpose,
			&b.BorrowDate, &b.ExpectedReturnDate, &b.ActualReturnDate,
			&b.Status, &b.ConditionBefore, &b.ConditionAfter, &b.AdminNotes,
			&b.ApprovedBy, &b.CreatedAt, &b.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, b)
	}

	return list, total, rows.Err()
}

func (r *inventoryRepository) UpdateBorrowing(ctx context.Context, b *domain.InventoryBorrowing) error {
	table := TenantTable(ctx, "inventory_borrowings")
	query := fmt.Sprintf(`
		UPDATE %s
		SET actual_return_date = $1, status = $2, condition_after = $3,
		    admin_notes = $4, approved_by = $5, updated_at = CURRENT_TIMESTAMP
		WHERE id = $6 AND deleted_at IS NULL
		RETURNING updated_at
	`, table)

	return r.db.QueryRowContext(ctx, query,
		b.ActualReturnDate, b.Status, b.ConditionAfter, b.AdminNotes, b.ApprovedBy, b.ID,
	).Scan(&b.UpdatedAt)
}
