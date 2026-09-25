package repository

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"path/filepath"
	"strings"

	"backend/internal/domain"
	"backend/pkg/crypto"
	"backend/pkg/storage/minio"
	"github.com/google/uuid"
	"github.com/lib/pq"
)

type residentRepository struct {
	db          *sql.DB
	minioClient *minio.Client
}

func NewResidentRepository(db *sql.DB, minioClient *minio.Client) domain.ResidentRepository {
	return &residentRepository{db: db, minioClient: minioClient}
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
		INSERT INTO %s (id, tenant_id, nik, nik_hash, kk_number, full_name, gender, birth_place, birth_date, address, rt_rw, phone, house_id, is_head_of_family, status, ktp_url, kk_url, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
		RETURNING created_at, updated_at
	`, TenantTable(ctx, "residents"))
	if resident.ID == uuid.Nil {
		resident.ID = uuid.New()
	}
	err := r.db.QueryRowContext(ctx, query,
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
		resident.HouseID,
		resident.IsHeadOfFamily,
		resident.Status,
		resident.KTPURL,
		resident.KKURL,
	).Scan(&resident.CreatedAt, &resident.UpdatedAt)
	if err != nil {
		return err
	}

	// Sinkronisasi otomatis: Jika warga ini adalah Kepala Keluarga dan ditautkan ke suatu rumah,
	// pasang head_resident_id pada tabel houses agar stiker QR rumah langsung mengenali kepala keluarga.
	if resident.HouseID != nil && *resident.HouseID != uuid.Nil && resident.IsHeadOfFamily != nil && *resident.IsHeadOfFamily {
		syncHouseQuery := fmt.Sprintf(`
			UPDATE %s
			SET head_resident_id = $1, updated_at = NOW()
			WHERE id = $2 AND deleted_at IS NULL
		`, TenantTable(ctx, "houses"))
		_, _ = r.db.ExecContext(ctx, syncHouseQuery, resident.ID, *resident.HouseID)
	}

	return nil
}

func (r *residentRepository) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Resident, error) {
	query := fmt.Sprintf(`
		SELECT id, tenant_id, nik, nik_hash, kk_number, full_name, gender, birth_place, birth_date, address, rt_rw, phone, house_id, is_head_of_family, status, ktp_url, kk_url, created_at, updated_at
		FROM %s
		WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
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
		&res.HouseID,
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
		SET nik = $1, nik_hash = $2, kk_number = $3, full_name = $4, gender = $5, birth_place = $6, birth_date = $7, address = $8, rt_rw = $9, phone = $10, house_id = $11, is_head_of_family = $12, status = COALESCE(NULLIF($13, ''), status), ktp_url = $14, kk_url = $15, updated_at = NOW()
		WHERE tenant_id = $16 AND id = $17
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
		resident.HouseID,
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
	if err != nil {
		return err
	}

	// Sinkronisasi otomatis: Jika warga ini adalah Kepala Keluarga dan ditautkan ke suatu rumah,
	// pasang head_resident_id pada tabel houses agar stiker QR rumah langsung mengenali kepala keluarga.
	if resident.HouseID != nil && *resident.HouseID != uuid.Nil && resident.IsHeadOfFamily != nil && *resident.IsHeadOfFamily {
		syncHouseQuery := fmt.Sprintf(`
			UPDATE %s
			SET head_resident_id = $1, updated_at = NOW()
			WHERE id = $2 AND deleted_at IS NULL
		`, TenantTable(ctx, "houses"))
		_, _ = r.db.ExecContext(ctx, syncHouseQuery, resident.ID, *resident.HouseID)
	}

	return nil
}

func (r *residentRepository) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	query := fmt.Sprintf(`
		UPDATE %s
		SET deleted_at = NOW(), updated_at = NOW()
		WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
	`, TenantTable(ctx, "residents"))
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

func (r *residentRepository) List(ctx context.Context, tenantID uuid.UUID, q string, isHead *bool, limit, offset int) ([]*domain.Resident, int64, error) {
	residentsTable := TenantTable(ctx, "residents")
	var count int64
	var countQuery string
	var query string
	var args []interface{}

	// isHead is a Go bool, so it is safe to inline as a boolean literal.
	headClause := ""
	if isHead != nil {
		headClause = fmt.Sprintf(" AND is_head_of_family = %t", *isHead)
	}

	if strings.TrimSpace(q) != "" {
		cleanQ := strings.TrimSpace(q)
		searchStr := "%" + cleanQ + "%"
		searchHash := crypto.HashHMAC(cleanQ)

		familyTable := TenantTable(ctx, "family_members")

		countQuery = fmt.Sprintf(`
			SELECT COUNT(*) FROM %s r
			WHERE r.tenant_id = $1 AND r.deleted_at IS NULL AND (
				r.full_name ILIKE $2
				OR r.nik_hash = $3
				OR r.kk_number ILIKE $2
				OR r.address ILIKE $2
				OR r.phone ILIKE $2
				OR r.rt_rw ILIKE $2
				OR EXISTS (
					SELECT 1 FROM %s fm
					WHERE fm.resident_id = r.id
					  AND fm.deleted_at IS NULL
					  AND (fm.full_name ILIKE $2)
				)
			)%s
		`, residentsTable, familyTable, headClause)
		if err := r.db.QueryRowContext(ctx, countQuery, tenantID, searchStr, searchHash).Scan(&count); err != nil {
			return nil, 0, err
		}

		query = fmt.Sprintf(`
			SELECT r.id, r.tenant_id, r.nik, r.nik_hash, r.kk_number, r.full_name, r.gender, r.birth_place, r.birth_date, r.address, r.rt_rw, r.phone, r.house_id, r.is_head_of_family, r.status, r.ktp_url, r.kk_url, r.created_at, r.updated_at
			FROM %s r
			WHERE r.tenant_id = $1 AND r.deleted_at IS NULL AND (
				r.full_name ILIKE $2
				OR r.nik_hash = $3
				OR r.kk_number ILIKE $2
				OR r.address ILIKE $2
				OR r.phone ILIKE $2
				OR r.rt_rw ILIKE $2
				OR EXISTS (
					SELECT 1 FROM %s fm
					WHERE fm.resident_id = r.id
					  AND fm.deleted_at IS NULL
					  AND (fm.full_name ILIKE $2)
				)
			)%s
			ORDER BY r.created_at DESC LIMIT $4 OFFSET $5
		`, residentsTable, familyTable, headClause)
		args = []interface{}{tenantID, searchStr, searchHash, limit, offset}
	} else {
		countQuery = fmt.Sprintf(`SELECT COUNT(*) FROM %s WHERE tenant_id = $1 AND deleted_at IS NULL%s`, residentsTable, headClause)
		if err := r.db.QueryRowContext(ctx, countQuery, tenantID).Scan(&count); err != nil {
			return nil, 0, err
		}

		query = fmt.Sprintf(`
			SELECT id, tenant_id, nik, nik_hash, kk_number, full_name, gender, birth_place, birth_date, address, rt_rw, phone, house_id, is_head_of_family, status, ktp_url, kk_url, created_at, updated_at
			FROM %s
			WHERE tenant_id = $1 AND deleted_at IS NULL%s
			ORDER BY created_at DESC LIMIT $2 OFFSET $3
		`, residentsTable, headClause)
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
			&res.HouseID,
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
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	// Populate family members for the listed residents (only heads of family
	// can have members) so the UI can render the expanded KK detail.
	var headIDs []uuid.UUID
	for _, res := range residents {
		if res.IsHeadOfFamily != nil && *res.IsHeadOfFamily {
			headIDs = append(headIDs, res.ID)
		}
	}
	if len(headIDs) > 0 {
		membersByResident, err := r.familyMembersByResidents(ctx, tenantID, headIDs)
		if err != nil {
			return nil, 0, err
		}
		for _, res := range residents {
			res.FamilyMembers = membersByResident[res.ID]
		}
	}
	return residents, count, nil
}

// familyMembersByResidents returns family members for a set of residents,
// decrypting encrypted NIK values, keyed by resident ID.
func (r *residentRepository) familyMembersByResidents(ctx context.Context, tenantID uuid.UUID, residentIDs []uuid.UUID) (map[uuid.UUID][]*domain.FamilyMember, error) {
	query := fmt.Sprintf(`
		SELECT fm.id, fm.resident_id, fm.full_name, fm.nik, fm.relation, fm.birth_date, fm.gender, fm.created_at, fm.updated_at
		FROM %s fm
		JOIN %s r ON r.id = fm.resident_id
		WHERE r.tenant_id = $1 AND fm.resident_id = ANY($2) AND fm.deleted_at IS NULL
		ORDER BY fm.created_at ASC
	`, TenantTable(ctx, "family_members"), TenantTable(ctx, "residents"))
	rows, err := r.db.QueryContext(ctx, query, tenantID, pq.Array(residentIDs))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	byResident := make(map[uuid.UUID][]*domain.FamilyMember)
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
			if dec, err := crypto.DecryptAESGCM(*encNIK); err == nil {
				fm.NIK = &dec
			} else {
				fm.NIK = encNIK
			}
		}
		byResident[fm.ResidentID] = append(byResident[fm.ResidentID], &fm)
	}
	return byResident, rows.Err()
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

func (r *residentRepository) UpdateFamilyMember(ctx context.Context, tenantID, residentID uuid.UUID, member *domain.FamilyMember) error {
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
		UPDATE %s
		SET full_name = $1, nik = $2, relation = $3, birth_date = $4, gender = $5, updated_at = NOW()
		WHERE id = $6 AND resident_id IN (SELECT id FROM %s WHERE id = $7 AND tenant_id = $8)
		RETURNING updated_at
	`, TenantTable(ctx, "family_members"), TenantTable(ctx, "residents"))
	err := r.db.QueryRowContext(ctx, query,
		member.FullName,
		encNIK,
		member.Relation,
		member.BirthDate,
		member.Gender,
		member.ID,
		residentID,
		tenantID,
	).Scan(&member.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

func (r *residentRepository) RemoveFamilyMember(ctx context.Context, tenantID, residentID, memberID uuid.UUID) error {
	query := fmt.Sprintf(`
		UPDATE %s
		SET deleted_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL AND resident_id IN (SELECT id FROM %s WHERE id = $2 AND tenant_id = $3)
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
		WHERE resident_id = $1 AND deleted_at IS NULL
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

func (r *residentRepository) PromoteFamilyMemberToHead(ctx context.Context, tenantID, currentHeadID, newHeadMemberID uuid.UUID) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Ambil data kepala keluarga saat ini
	currentHeadQuery := fmt.Sprintf(`
		SELECT id, kk_number, full_name, nik, gender, birth_date, birth_place, address, rt_rw, phone, house_id, status, ktp_url, kk_url
		FROM %s
		WHERE tenant_id = $1 AND id = $2
		FOR UPDATE
	`, TenantTable(ctx, "residents"))
	var cHead domain.Resident
	var cHeadEncNIK *string
	if err := tx.QueryRowContext(ctx, currentHeadQuery, tenantID, currentHeadID).Scan(
		&cHead.ID,
		&cHead.KKNumber,
		&cHead.FullName,
		&cHeadEncNIK,
		&cHead.Gender,
		&cHead.BirthDate,
		&cHead.BirthPlace,
		&cHead.Address,
		&cHead.RTRW,
		&cHead.Phone,
		&cHead.HouseID,
		&cHead.Status,
		&cHead.KTPURL,
		&cHead.KKURL,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return fmt.Errorf("get current head: %w", err)
	}

	// 2. Ambil data anggota keluarga yang akan dipromosikan
	memberQuery := fmt.Sprintf(`
		SELECT id, full_name, nik, relation, birth_date, gender
		FROM %s
		WHERE id = $1 AND resident_id = $2
		FOR UPDATE
	`, TenantTable(ctx, "family_members"))
	var member domain.FamilyMember
	var memberEncNIK *string
	if err := tx.QueryRowContext(ctx, memberQuery, newHeadMemberID, currentHeadID).Scan(
		&member.ID,
		&member.FullName,
		&memberEncNIK,
		&member.Relation,
		&member.BirthDate,
		&member.Gender,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return fmt.Errorf("get family member to promote: %w", err)
	}

	// 3. Buat record baru di tabel residents untuk kepala keluarga baru
	newHeadID := uuid.New()
	var newHeadNIKHash *string
	if memberEncNIK != nil && *memberEncNIK != "" {
		dec, err := crypto.DecryptAESGCM(*memberEncNIK)
		if err == nil {
			h := crypto.HashHMAC(dec)
			newHeadNIKHash = &h
		}
	}

	insertNewHeadQuery := fmt.Sprintf(`
		INSERT INTO %s (
			id, tenant_id, nik, nik_hash, kk_number, full_name, gender, birth_place, birth_date,
			address, rt_rw, phone, house_id, is_head_of_family, status, ktp_url, kk_url, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9,
			$10, $11, $12, $13, TRUE, 'approved', NULL, $14, NOW(), NOW()
		)
	`, TenantTable(ctx, "residents"))

	if _, err := tx.ExecContext(ctx, insertNewHeadQuery,
		newHeadID,
		tenantID,
		memberEncNIK,
		newHeadNIKHash,
		cHead.KKNumber,
		member.FullName,
		member.Gender,
		cHead.BirthPlace,
		member.BirthDate,
		cHead.Address,
		cHead.RTRW,
		cHead.Phone,
		cHead.HouseID,
		cHead.KKURL,
	); err != nil {
		return fmt.Errorf("insert new head: %w", err)
	}

	// 4. Pindahkan semua anggota keluarga lain dari kepala lama ke kepala baru
	relinkMembersQuery := fmt.Sprintf(`
		UPDATE %s
		SET resident_id = $1, updated_at = NOW()
		WHERE resident_id = $2 AND id != $3
	`, TenantTable(ctx, "family_members"))
	if _, err := tx.ExecContext(ctx, relinkMembersQuery, newHeadID, currentHeadID, newHeadMemberID); err != nil {
		return fmt.Errorf("relink family members: %w", err)
	}

	// 5. Masukkan kepala keluarga lama sebagai anggota keluarga di bawah kepala baru
	oldHeadRelation := "Mantan Kepala Keluarga"
	if cHead.Status == "deceased" {
		oldHeadRelation = "Mantan Kepala Keluarga (Almarhum)"
	} else if cHead.Status == "moved" {
		oldHeadRelation = "Mantan Kepala Keluarga (Pindah)"
	}
	insertOldHeadAsMemberQuery := fmt.Sprintf(`
		INSERT INTO %s (id, resident_id, full_name, nik, relation, birth_date, gender, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
	`, TenantTable(ctx, "family_members"))
	if _, err := tx.ExecContext(ctx, insertOldHeadAsMemberQuery,
		uuid.New(),
		newHeadID,
		cHead.FullName,
		cHeadEncNIK,
		&oldHeadRelation,
		cHead.BirthDate,
		cHead.Gender,
	); err != nil {
		return fmt.Errorf("insert old head as member: %w", err)
	}

	// 6. Hapus anggota keluarga yang dipromosikan dari tabel family_members
	deleteMemberQuery := fmt.Sprintf(`
		DELETE FROM %s WHERE id = $1
	`, TenantTable(ctx, "family_members"))
	if _, err := tx.ExecContext(ctx, deleteMemberQuery, newHeadMemberID); err != nil {
		return fmt.Errorf("delete promoted member: %w", err)
	}

	// Relink relasi FK resident lama ke resident baru agar data historis tetap aman
	relinkDuesQuery := fmt.Sprintf(`UPDATE %s SET resident_id = $1 WHERE resident_id = $2`, TenantTable(ctx, "dues_payments"))
	_, _ = tx.ExecContext(ctx, relinkDuesQuery, newHeadID, currentHeadID)

	relinkHousesQuery := fmt.Sprintf(`UPDATE %s SET head_resident_id = $1 WHERE head_resident_id = $2`, TenantTable(ctx, "houses"))
	_, _ = tx.ExecContext(ctx, relinkHousesQuery, newHeadID, currentHeadID)

	// 7. Hapus/turunkan resident lama (karena sudah berpindah menjadi family_member dari kepala keluarga baru)
	deleteOldHeadQuery := fmt.Sprintf(`
		DELETE FROM %s WHERE id = $1 AND tenant_id = $2
	`, TenantTable(ctx, "residents"))
	if _, err := tx.ExecContext(ctx, deleteOldHeadQuery, currentHeadID, tenantID); err != nil {
		return fmt.Errorf("delete old head resident record: %w", err)
	}

	return tx.Commit()
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
	objectKey := minio.ObjectKey(TenantSlug(ctx), subDir, uuid.New().String()+"_"+filepath.Base(filename), "")
	if size, ok := contentSize(content); ok {
		return r.minioClient.Upload(ctx, objectKey, content, size, contentType)
	}
	data, err := io.ReadAll(content)
	if err != nil {
		return "", err
	}
	return r.minioClient.Upload(ctx, objectKey, bytes.NewReader(data), int64(len(data)), contentType)
}
