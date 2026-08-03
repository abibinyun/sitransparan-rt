package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"backend/internal/domain"
	"github.com/google/uuid"
)

type residentRepository struct {
	db *sql.DB
}

func NewResidentRepository(db *sql.DB) domain.ResidentRepository {
	return &residentRepository{db: db}
}

func (r *residentRepository) Create(ctx context.Context, resident *domain.Resident) error {
	query := `
		INSERT INTO residents (id, tenant_id, nik, kk_number, full_name, gender, birth_place, birth_date, address, rt_rw, phone, is_head_of_family, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
		RETURNING created_at, updated_at
	`
	if resident.ID == uuid.Nil {
		resident.ID = uuid.New()
	}
	return r.db.QueryRowContext(ctx, query,
		resident.ID,
		resident.TenantID,
		resident.NIK,
		resident.KKNumber,
		resident.FullName,
		resident.Gender,
		resident.BirthPlace,
		resident.BirthDate,
		resident.Address,
		resident.RTRW,
		resident.Phone,
		resident.IsHeadOfFamily,
	).Scan(&resident.CreatedAt, &resident.UpdatedAt)
}

func (r *residentRepository) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Resident, error) {
	query := `
		SELECT id, tenant_id, nik, kk_number, full_name, gender, birth_place, birth_date, address, rt_rw, phone, is_head_of_family, created_at, updated_at
		FROM residents
		WHERE tenant_id = $1 AND id = $2
	`
	var res domain.Resident
	err := r.db.QueryRowContext(ctx, query, tenantID, id).Scan(
		&res.ID,
		&res.TenantID,
		&res.NIK,
		&res.KKNumber,
		&res.FullName,
		&res.Gender,
		&res.BirthPlace,
		&res.BirthDate,
		&res.Address,
		&res.RTRW,
		&res.Phone,
		&res.IsHeadOfFamily,
		&res.CreatedAt,
		&res.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	members, err := r.GetFamilyMembers(ctx, res.ID)
	if err != nil {
		return nil, err
	}
	res.FamilyMembers = members

	return &res, nil
}

func (r *residentRepository) Update(ctx context.Context, resident *domain.Resident) error {
	query := `
		UPDATE residents
		SET nik = $1, kk_number = $2, full_name = $3, gender = $4, birth_place = $5, birth_date = $6, address = $7, rt_rw = $8, phone = $9, is_head_of_family = $10, updated_at = NOW()
		WHERE tenant_id = $11 AND id = $12
		RETURNING updated_at
	`
	err := r.db.QueryRowContext(ctx, query,
		resident.NIK,
		resident.KKNumber,
		resident.FullName,
		resident.Gender,
		resident.BirthPlace,
		resident.BirthDate,
		resident.Address,
		resident.RTRW,
		resident.Phone,
		resident.IsHeadOfFamily,
		resident.TenantID,
		resident.ID,
	).Scan(&resident.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

func (r *residentRepository) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	query := `DELETE FROM residents WHERE tenant_id = $1 AND id = $2`
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

func (r *residentRepository) List(ctx context.Context, tenantID uuid.UUID, q string, limit, offset int) ([]*domain.Resident, int64, error) {
	var count int64
	var countQuery string
	var query string
	var args []interface{}

	if strings.TrimSpace(q) != "" {
		searchStr := "%" + strings.TrimSpace(q) + "%"
		countQuery = `SELECT COUNT(*) FROM residents WHERE tenant_id = $1 AND (full_name ILIKE $2 OR nik ILIKE $2 OR kk_number ILIKE $2)`
		if err := r.db.QueryRowContext(ctx, countQuery, tenantID, searchStr).Scan(&count); err != nil {
			return nil, 0, err
		}

		query = `
			SELECT id, tenant_id, nik, kk_number, full_name, gender, birth_place, birth_date, address, rt_rw, phone, is_head_of_family, created_at, updated_at
			FROM residents
			WHERE tenant_id = $1 AND (full_name ILIKE $2 OR nik ILIKE $2 OR kk_number ILIKE $2)
			ORDER BY created_at DESC LIMIT $3 OFFSET $4
		`
		args = []interface{}{tenantID, searchStr, limit, offset}
	} else {
		countQuery = `SELECT COUNT(*) FROM residents WHERE tenant_id = $1`
		if err := r.db.QueryRowContext(ctx, countQuery, tenantID).Scan(&count); err != nil {
			return nil, 0, err
		}

		query = `
			SELECT id, tenant_id, nik, kk_number, full_name, gender, birth_place, birth_date, address, rt_rw, phone, is_head_of_family, created_at, updated_at
			FROM residents
			WHERE tenant_id = $1
			ORDER BY created_at DESC LIMIT $2 OFFSET $3
		`
		args = []interface{}{tenantID, limit, offset}
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var residents []*domain.Resident
	for rows.Next() {
		var res domain.Resident
		if err := rows.Scan(
			&res.ID,
			&res.TenantID,
			&res.NIK,
			&res.KKNumber,
			&res.FullName,
			&res.Gender,
			&res.BirthPlace,
			&res.BirthDate,
			&res.Address,
			&res.RTRW,
			&res.Phone,
			&res.IsHeadOfFamily,
			&res.CreatedAt,
			&res.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		residents = append(residents, &res)
	}
	return residents, count, rows.Err()
}

func (r *residentRepository) AddFamilyMember(ctx context.Context, member *domain.FamilyMember) error {
	query := `
		INSERT INTO family_members (id, resident_id, full_name, nik, relation, birth_date, gender, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
		RETURNING created_at, updated_at
	`
	if member.ID == uuid.Nil {
		member.ID = uuid.New()
	}
	return r.db.QueryRowContext(ctx, query,
		member.ID,
		member.ResidentID,
		member.FullName,
		member.NIK,
		member.Relation,
		member.BirthDate,
		member.Gender,
	).Scan(&member.CreatedAt, &member.UpdatedAt)
}

func (r *residentRepository) RemoveFamilyMember(ctx context.Context, tenantID, residentID, memberID uuid.UUID) error {
	query := `
		DELETE FROM family_members
		WHERE id = $1 AND resident_id IN (SELECT id FROM residents WHERE id = $2 AND tenant_id = $3)
	`
	res, err := r.db.ExecContext(ctx, query, memberID, residentID, tenantID)
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

func (r *residentRepository) GetFamilyMembers(ctx context.Context, residentID uuid.UUID) ([]*domain.FamilyMember, error) {
	query := `
		SELECT id, resident_id, full_name, nik, relation, birth_date, gender, created_at, updated_at
		FROM family_members
		WHERE resident_id = $1
		ORDER BY created_at ASC
	`
	rows, err := r.db.QueryContext(ctx, query, residentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.FamilyMember
	for rows.Next() {
		var fm domain.FamilyMember
		if err := rows.Scan(
			&fm.ID,
			&fm.ResidentID,
			&fm.FullName,
			&fm.NIK,
			&fm.Relation,
			&fm.BirthDate,
			&fm.Gender,
			&fm.CreatedAt,
			&fm.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan family member: %w", err)
		}
		list = append(list, &fm)
	}
	return list, rows.Err()
}
