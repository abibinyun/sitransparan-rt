package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"backend/internal/domain"
)

type houseRepository struct {
	db *sql.DB
}

func NewHouseRepository(db *sql.DB) domain.HouseRepository {
	return &houseRepository{db: db}
}

func (r *houseRepository) schema(ctx context.Context, tenantID uuid.UUID) (string, error) {
	var slug string
	err := r.db.QueryRowContext(ctx, "SELECT slug FROM public.tenants WHERE id = $1", tenantID).Scan(&slug)
	if err != nil {
		return "", err
	}
	return "tenant_" + strings.ReplaceAll(slug, "-", "_"), nil
}

func (r *houseRepository) Create(ctx context.Context, tenantID uuid.UUID, h *domain.House) error {
	schema, err := r.schema(ctx, tenantID)
	if err != nil {
		return err
	}

	if h.ID == uuid.Nil {
		h.ID = uuid.New()
	}
	now := time.Now()
	h.CreatedAt = now
	h.UpdatedAt = now
	if h.TokenStatus == "" {
		h.TokenStatus = domain.HouseTokenActive
	}
	if h.TokenVersion == 0 {
		h.TokenVersion = 1
	}

	query := fmt.Sprintf(`
		INSERT INTO %s.houses (
			id, block_number, address, head_resident_id, user_id, access_token, token_status, pin_code, token_version, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`, schema)

	_, err = r.db.ExecContext(
		ctx, query,
		h.ID, h.BlockNumber, h.Address, h.HeadResidentID, h.UserID, h.AccessToken, h.TokenStatus, h.PinCode, h.TokenVersion, h.CreatedAt, h.UpdatedAt,
	)
	return err
}

func (r *houseRepository) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.House, error) {
	schema, err := r.schema(ctx, tenantID)
	if err != nil {
		return nil, err
	}

	query := fmt.Sprintf(`
		SELECT id, block_number, address, head_resident_id, user_id, access_token, token_status, COALESCE(pin_code, ''), COALESCE(token_version, 1), created_at, updated_at
		FROM %s.houses
		WHERE id = $1 AND deleted_at IS NULL
	`, schema)

	var h domain.House
	var headID sql.NullString
	var userID sql.NullString
	var addr sql.NullString
	err = r.db.QueryRowContext(ctx, query, id).Scan(
		&h.ID, &h.BlockNumber, &addr, &headID, &userID, &h.AccessToken, &h.TokenStatus, &h.PinCode, &h.TokenVersion, &h.CreatedAt, &h.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if addr.Valid {
		h.Address = &addr.String
	}
	if headID.Valid {
		u, _ := uuid.Parse(headID.String)
		h.HeadResidentID = &u
	}
	if userID.Valid {
		u, _ := uuid.Parse(userID.String)
		h.UserID = &u
	}
	return &h, nil
}

func (r *houseRepository) GetByToken(ctx context.Context, tenantID uuid.UUID, token string) (*domain.House, error) {
	schema, err := r.schema(ctx, tenantID)
	if err != nil {
		return nil, err
	}

	query := fmt.Sprintf(`
		SELECT id, block_number, address, head_resident_id, user_id, access_token, token_status, COALESCE(pin_code, ''), COALESCE(token_version, 1), created_at, updated_at
		FROM %s.houses
		WHERE access_token = $1 AND token_status = 'active' AND deleted_at IS NULL
	`, schema)

	var h domain.House
	var headID sql.NullString
	var userID sql.NullString
	var addr sql.NullString
	err = r.db.QueryRowContext(ctx, query, token).Scan(
		&h.ID, &h.BlockNumber, &addr, &headID, &userID, &h.AccessToken, &h.TokenStatus, &h.PinCode, &h.TokenVersion, &h.CreatedAt, &h.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if addr.Valid {
		h.Address = &addr.String
	}
	if headID.Valid {
		u, _ := uuid.Parse(headID.String)
		h.HeadResidentID = &u
	}
	if userID.Valid {
		u, _ := uuid.Parse(userID.String)
		h.UserID = &u
	}
	return &h, nil
}

func (r *houseRepository) List(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]domain.House, int, error) {
	schema, err := r.schema(ctx, tenantID)
	if err != nil {
		return nil, 0, err
	}

	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM %s.houses WHERE deleted_at IS NULL", schema)
	if err := r.db.QueryRowContext(ctx, countQuery).Scan(&total); err != nil {
		return nil, 0, err
	}

	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	query := fmt.Sprintf(`
		SELECT id, block_number, address, head_resident_id, user_id, access_token, token_status, COALESCE(pin_code, ''), COALESCE(token_version, 1), created_at, updated_at
		FROM %s.houses
		WHERE deleted_at IS NULL
		ORDER BY block_number ASC
		LIMIT $1 OFFSET $2
	`, schema)

	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	houses := make([]domain.House, 0)
	for rows.Next() {
		var h domain.House
		var headID sql.NullString
		var userID sql.NullString
		var addr sql.NullString
		err := rows.Scan(
			&h.ID, &h.BlockNumber, &addr, &headID, &userID, &h.AccessToken, &h.TokenStatus, &h.PinCode, &h.TokenVersion, &h.CreatedAt, &h.UpdatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		if addr.Valid {
			h.Address = &addr.String
		}
		if headID.Valid {
			u, _ := uuid.Parse(headID.String)
			h.HeadResidentID = &u
		}
		if userID.Valid {
			u, _ := uuid.Parse(userID.String)
			h.UserID = &u
		}
		houses = append(houses, h)
	}

	return houses, total, nil
}

func (r *houseRepository) Update(ctx context.Context, tenantID uuid.UUID, h *domain.House) error {
	schema, err := r.schema(ctx, tenantID)
	if err != nil {
		return err
	}

	h.UpdatedAt = time.Now()
	query := fmt.Sprintf(`
		UPDATE %s.houses
		SET block_number = $1, address = $2, head_resident_id = $3, user_id = $4, token_status = $5, pin_code = $6, updated_at = $7
		WHERE id = $8 AND deleted_at IS NULL
	`, schema)

	_, err = r.db.ExecContext(ctx, query, h.BlockNumber, h.Address, h.HeadResidentID, h.UserID, h.TokenStatus, h.PinCode, h.UpdatedAt, h.ID)
	return err
}

func (r *houseRepository) RevokeAndRegenerateToken(ctx context.Context, tenantID, id uuid.UUID, newToken, newPin string) error {
	schema, err := r.schema(ctx, tenantID)
	if err != nil {
		return err
	}

	query := fmt.Sprintf(`
		UPDATE %s.houses
		SET access_token = $1, pin_code = $2, token_status = 'active', token_version = token_version + 1, updated_at = $3
		WHERE id = $4 AND deleted_at IS NULL
	`, schema)

	_, err = r.db.ExecContext(ctx, query, newToken, newPin, time.Now(), id)
	return err
}

func (r *houseRepository) ResetPin(ctx context.Context, tenantID, id uuid.UUID, newPin string) error {
	schema, err := r.schema(ctx, tenantID)
	if err != nil {
		return err
	}

	query := fmt.Sprintf(`
		UPDATE %s.houses
		SET pin_code = $1, updated_at = $2
		WHERE id = $3 AND deleted_at IS NULL
	`, schema)

	_, err = r.db.ExecContext(ctx, query, newPin, time.Now(), id)
	return err
}

func (r *houseRepository) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	schema, err := r.schema(ctx, tenantID)
	if err != nil {
		return err
	}

	query := fmt.Sprintf("UPDATE %s.houses SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL", schema)
	_, err = r.db.ExecContext(ctx, query, id)
	return err
}
