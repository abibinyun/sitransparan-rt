package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"

	"backend/internal/domain"
	"backend/pkg/crypto"
	"github.com/google/uuid"
)

type residentRepository struct {
	db *sql.DB
}

func NewResidentRepository(db *sql.DB) domain.ResidentRepository {
	return &residentRepository{db: db}
}

func (r *residentRepository) Create(ctx context.Context, resident *domain.Resident) error {
	var encNIK *string
	var nikHash *string
	if resident.NIK != nil && *resident.NIK != "" {
		enc, err := crypto.EncryptAESGCM(*resident.NIK)
		if err != nil {
			return fmt.Errorf("encrypt NIK: %w", err)
		}
		encNIK = &enc
		h := crypto.HashHMAC(*resident.NIK)
		nikHash = &h
	}
	resident.NIKHash = nikHash

	if resident.Status == "" {
		resident.Status = "pending"
	}

	query := fmt.Sprintf(`
		INSERT INTO %s (id, tenant_id, nik, nik_hash, kk_number, full_name, gender, birth_place, birth_date, address, rt_rw, phone, is_head_of_family, status, ktp_url, kk_url, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
		RETURNING created_at, updated_at
	`, TenantTable(ctx, "residents"))
	if resident.ID == uuid.Nil {
		resident.ID = uuid.New()
	}
	return r.db.QueryRowContext(ctx, query,
		resident.ID,
		resident.TenantID,
		encNIK,
		nikHash,
		resident.KKNumber,
		resident.FullName,
		resident.Gender,
		resident.BirthPlace,
		resident.BirthDate,
		resident.Address,
		resident.RTRW,
		resident.Phone,
		resident.IsHeadOfFamily,
		resident.Status,
		resident.KTPURL,
		resident.KKURL,
	).Scan(&resident.CreatedAt, &resident.UpdatedAt)
}

func (r *residentRepository) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Resident, error) {
	query := fmt.Sprintf(`
		SELECT id, tenant_id, nik, nik_hash, kk_number, full_name, gender, birth_place, birth_date, address, rt_rw, phone, is_head_of_family, status, ktp_url, kk_url, created_at, updated_at
		FROM %s
		WHERE tenant_id = $1 AND id = $2
	`, TenantTable(ctx, "residents"))
	var res domain.Resident
	var encNIK *string
	err := r.db.QueryRowContext(ctx, query, tenantID, id).Scan(
		&res.ID,
		&res.TenantID,
		&encNIK,
		&res.NIKHash,
		&res.KKNumber,
		&res.FullName,
		&res.Gender,
		&res.BirthPlace,
		&res.BirthDate,
		&res.Address,
		&res.RTRW,
		&res.Phone,
		&res.IsHeadOfFamily,
		&res.Status,
		&res.KTPURL,
		&res.KKURL,
		&res.CreatedAt,
		&res.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	if encNIK != nil && *encNIK != "" {
		dec, err := crypto.DecryptAESGCM(*encNIK)
		if err == nil {
			res.NIK = &dec
		} else {
			res.NIK = encNIK
		}
	}

	members, err := r.GetFamilyMembers(ctx, res.ID)
	if err != nil {
		return nil, err
	}
	res.FamilyMembers = members

	return &res, nil
}

func (r *residentRepository) Update(ctx context.Context, resident *domain.Resident) error {
	var encNIK *string
	var nikHash *string
	if resident.NIK != nil && *resident.NIK != "" {
		enc, err := crypto.EncryptAESGCM(*resident.NIK)
		if err != nil {
			return fmt.Errorf("encrypt NIK: %w", err)
		}
		encNIK = &enc
		h := crypto.HashHMAC(*resident.NIK)
		nikHash = &h
	}
	resident.NIKHash = nikHash

	query := fmt.Sprintf(`
		UPDATE %s
		SET nik = $1, nik_hash = $2, kk_number = $3, full_name = $4, gender = $5, birth_place = $6, birth_date = $7, address = $8, rt_rw = $9, phone = $10, is_head_of_family = $11, status = COALESCE(NULLIF($12, ''), status), ktp_url = $13, kk_url = $14, updated_at = NOW()
		WHERE tenant_id = $15 AND id = $16
		RETURNING updated_at
	`, TenantTable(ctx, "residents"))
	err := r.db.QueryRowContext(ctx, query,
		encNIK,
		nikHash,
		resident.KKNumber,
		resident.FullName,
		resident.Gender,
		resident.BirthPlace,
		resident.BirthDate,
		resident.Address,
		resident.RTRW,
		resident.Phone,
		resident.IsHeadOfFamily,
		resident.Status,
		resident.KTPURL,
		resident.KKURL,
		resident.TenantID,
		resident.ID,
	).Scan(&resident.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

func (r *residentRepository) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	query := fmt.Sprintf(`DELETE FROM %s WHERE tenant_id = $1 AND id = $2`, TenantTable(ctx, "residents"))
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
	residentsTable := TenantTable(ctx, "residents")
	var count int64
	var countQuery string
	var query string
	var args []interface{}

	if strings.TrimSpace(q) != "" {
		cleanQ := strings.TrimSpace(q)
		searchStr := "%" + cleanQ + "%"
		searchHash := crypto.HashHMAC(cleanQ)

		countQuery = fmt.Sprintf(`SELECT COUNT(*) FROM %s WHERE tenant_id = $1 AND (full_name ILIKE $2 OR nik_hash = $3 OR kk_number ILIKE $2)`, residentsTable)
		if err := r.db.QueryRowContext(ctx, countQuery, tenantID, searchStr, searchHash).Scan(&count); err != nil {
			return nil, 0, err
		}

		query = fmt.Sprintf(`
			SELECT id, tenant_id, nik, nik_hash, kk_number, full_name, gender, birth_place, birth_date, address, rt_rw, phone, is_head_of_family, status, ktp_url, kk_url, created_at, updated_at
			FROM %s
			WHERE tenant_id = $1 AND (full_name ILIKE $2 OR nik_hash = $3 OR kk_number ILIKE $2)
			ORDER BY created_at DESC LIMIT $4 OFFSET $5
		`, residentsTable)
		args = []interface{}{tenantID, searchStr, searchHash, limit, offset}
	} else {
		countQuery = fmt.Sprintf(`SELECT COUNT(*) FROM %s WHERE tenant_id = $1`, residentsTable)
		if err := r.db.QueryRowContext(ctx, countQuery, tenantID).Scan(&count); err != nil {
			return nil, 0, err
		}

		query = fmt.Sprintf(`
			SELECT id, tenant_id, nik, nik_hash, kk_number, full_name, gender, birth_place, birth_date, address, rt_rw, phone, is_head_of_family, status, ktp_url, kk_url, created_at, updated_at
			FROM %s
			WHERE tenant_id = $1
			ORDER BY created_at DESC LIMIT $2 OFFSET $3
		`, residentsTable)
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
		var encNIK *string
		if err := rows.Scan(
			&res.ID,
			&res.TenantID,
			&encNIK,
			&res.NIKHash,
			&res.KKNumber,
			&res.FullName,
			&res.Gender,
			&res.BirthPlace,
			&res.BirthDate,
			&res.Address,
			&res.RTRW,
			&res.Phone,
			&res.IsHeadOfFamily,
			&res.Status,
			&res.KTPURL,
			&res.KKURL,
			&res.CreatedAt,
			&res.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		if encNIK != nil && *encNIK != "" {
			dec, err := crypto.DecryptAESGCM(*encNIK)
			if err == nil {
				res.NIK = &dec
			} else {
				res.NIK = encNIK
			}
		}
		residents = append(residents, &res)
	}
	return residents, count, rows.Err()
}

func (r *residentRepository) AddFamilyMember(ctx context.Context, member *domain.FamilyMember) error {
	var encNIK *string
	if member.NIK != nil && *member.NIK != "" {
		enc, err := crypto.EncryptAESGCM(*member.NIK)
		if err == nil {
			encNIK = &enc
		} else {
			encNIK = member.NIK
		}
	}

	query := fmt.Sprintf(`
		INSERT INTO %s (id, resident_id, full_name, nik, relation, birth_date, gender, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
		RETURNING created_at, updated_at
	`, TenantTable(ctx, "family_members"))
	if member.ID == uuid.Nil {
		member.ID = uuid.New()
	}
	return r.db.QueryRowContext(ctx, query,
		member.ID,
		member.ResidentID,
		member.FullName,
		encNIK,
		member.Relation,
		member.BirthDate,
		member.Gender,
	).Scan(&member.CreatedAt, &member.UpdatedAt)
}

func (r *residentRepository) RemoveFamilyMember(ctx context.Context, tenantID, residentID, memberID uuid.UUID) error {
	query := fmt.Sprintf(`
		DELETE FROM %s
		WHERE id = $1 AND resident_id IN (SELECT id FROM %s WHERE id = $2 AND tenant_id = $3)
	`, TenantTable(ctx, "family_members"), TenantTable(ctx, "residents"))
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
	query := fmt.Sprintf(`
		SELECT id, resident_id, full_name, nik, relation, birth_date, gender, created_at, updated_at
		FROM %s
		WHERE resident_id = $1
		ORDER BY created_at ASC
	`, TenantTable(ctx, "family_members"))
	rows, err := r.db.QueryContext(ctx, query, residentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.FamilyMember
	for rows.Next() {
		var fm domain.FamilyMember
		var encNIK *string
		if err := rows.Scan(
			&fm.ID,
			&fm.ResidentID,
			&fm.FullName,
			&encNIK,
			&fm.Relation,
			&fm.BirthDate,
			&fm.Gender,
			&fm.CreatedAt,
			&fm.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan family member: %w", err)
		}
		if encNIK != nil && *encNIK != "" {
			dec, err := crypto.DecryptAESGCM(*encNIK)
			if err == nil {
				fm.NIK = &dec
			} else {
				fm.NIK = encNIK
			}
		}
		list = append(list, &fm)
	}
	return list, rows.Err()
}

func (r *residentRepository) UpdateStatus(ctx context.Context, tenantID, id uuid.UUID, status string) error {
	query := fmt.Sprintf(`
		UPDATE %s
		SET status = $1, updated_at = NOW()
		WHERE tenant_id = $2 AND id = $3
	`, TenantTable(ctx, "residents"))
	res, err := r.db.ExecContext(ctx, query, status, tenantID, id)
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

// LogAudit writes to the global audit_logs table (public schema), NOT a tenant table.
func (r *residentRepository) LogAudit(ctx context.Context, tenantID, userID uuid.UUID, action, resource string, payload interface{}) error {
	payloadBytes, _ := json.Marshal(payload)
	query := `
		INSERT INTO audit_logs (id, tenant_id, user_id, action, resource, payload, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
	`
	var uID *uuid.UUID
	if userID != uuid.Nil {
		uID = &userID
	}
	var tID *uuid.UUID
	if tenantID != uuid.Nil {
		tID = &tenantID
	}
	_, err := r.db.ExecContext(ctx, query, uuid.New(), tID, uID, action, resource, string(payloadBytes))
	return err
}

func (r *residentRepository) UploadDocument(ctx context.Context, docType, filename string, content io.Reader, contentType string) (string, error) {
	subDir := "documents"
	if docType == "ktp" {
		subDir = "ktp"
	} else if docType == "kk" {
		subDir = "kk"
	}
	objectKey := fmt.Sprintf("%s/%s_%s", subDir, uuid.New().String(), filename)
	return "/uploads/" + objectKey, nil
}
