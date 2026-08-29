package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"backend/internal/domain"
	"github.com/google/uuid"
)

type karangTarunaRepository struct {
	db *sql.DB
}

func NewKarangTarunaRepository(db *sql.DB) domain.KarangTarunaRepository {
	return &karangTarunaRepository{db: db}
}

// ---------------- Periode ----------------

func (r *karangTarunaRepository) CreatePeriod(ctx context.Context, p *domain.KarangTarunaPeriod) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	now := time.Now()
	p.CreatedAt = now
	p.UpdatedAt = now
	if p.Status == "" {
		p.Status = "draft"
	}

	// Jika status active, non-aktifkan periode active lain di tenant ini
	if p.Status == "active" {
		queryDeactivate := fmt.Sprintf(`UPDATE %s SET status = 'archived', updated_at = NOW() WHERE tenant_id = $1 AND status = 'active'`, TenantTable(ctx, "karang_taruna_periods"))
		_, _ = r.db.ExecContext(ctx, queryDeactivate, p.TenantID)
	}

	query := fmt.Sprintf(`
		INSERT INTO %s (id, tenant_id, name, start_date, end_date, status, sk_number, sk_file_url, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`, TenantTable(ctx, "karang_taruna_periods"))
	_, err := r.db.ExecContext(ctx, query, p.ID, p.TenantID, p.Name, p.StartDate, p.EndDate, p.Status, p.SKNumber, p.SKFileURL, p.CreatedBy, p.CreatedAt, p.UpdatedAt)
	if err != nil {
		return err
	}

	// Inisialisasi default config
	defConfig := &domain.KarangTarunaConfig{
		PeriodID:        p.ID,
		AllowedRoles:    []string{"ketua", "wakil", "sekretaris", "bendahara", "koordinator_seksi", "anggota"},
		AllowedSections: []string{"Olahraga & Kebugaran", "Seni & Budaya", "Sosial & Humas", "Kerohanian & Kemitraan", "Lingkungan Hidup"},
	}
	return r.SaveConfig(ctx, defConfig)
}

func (r *karangTarunaRepository) GetPeriodByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.KarangTarunaPeriod, error) {
	query := fmt.Sprintf(`
		SELECT id, tenant_id, name, start_date, end_date, status, sk_number, sk_file_url, created_by, created_at, updated_at
		FROM %s
		WHERE tenant_id = $1 AND id = $2
	`, TenantTable(ctx, "karang_taruna_periods"))
	p := &domain.KarangTarunaPeriod{}
	err := r.db.QueryRowContext(ctx, query, tenantID, id).Scan(
		&p.ID, &p.TenantID, &p.Name, &p.StartDate, &p.EndDate, &p.Status, &p.SKNumber, &p.SKFileURL, &p.CreatedBy, &p.CreatedAt, &p.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	cfg, _ := r.GetConfig(ctx, p.ID)
	p.Config = cfg
	return p, nil
}

func (r *karangTarunaRepository) GetActivePeriod(ctx context.Context, tenantID uuid.UUID) (*domain.KarangTarunaPeriod, error) {
	query := fmt.Sprintf(`
		SELECT id, tenant_id, name, start_date, end_date, status, sk_number, sk_file_url, created_by, created_at, updated_at
		FROM %s
		WHERE tenant_id = $1 AND status = 'active'
		ORDER BY created_at DESC LIMIT 1
	`, TenantTable(ctx, "karang_taruna_periods"))
	p := &domain.KarangTarunaPeriod{}
	err := r.db.QueryRowContext(ctx, query, tenantID).Scan(
		&p.ID, &p.TenantID, &p.Name, &p.StartDate, &p.EndDate, &p.Status, &p.SKNumber, &p.SKFileURL, &p.CreatedBy, &p.CreatedAt, &p.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	cfg, _ := r.GetConfig(ctx, p.ID)
	p.Config = cfg
	return p, nil
}

func (r *karangTarunaRepository) ListPeriods(ctx context.Context, tenantID uuid.UUID, status string) ([]*domain.KarangTarunaPeriod, error) {
	query := fmt.Sprintf(`
		SELECT id, tenant_id, name, start_date, end_date, status, sk_number, sk_file_url, created_by, created_at, updated_at
		FROM %s
		WHERE tenant_id = $1 %s
		ORDER BY start_date DESC
	`, TenantTable(ctx, "karang_taruna_periods"), func() string {
		if status != "" {
			return fmt.Sprintf("AND status = '%s'", status)
		}
		return ""
	}())
	rows, err := r.db.QueryContext(ctx, query, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.KarangTarunaPeriod
	for rows.Next() {
		p := &domain.KarangTarunaPeriod{}
		if err := rows.Scan(&p.ID, &p.TenantID, &p.Name, &p.StartDate, &p.EndDate, &p.Status, &p.SKNumber, &p.SKFileURL, &p.CreatedBy, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		cfg, _ := r.GetConfig(ctx, p.ID)
		p.Config = cfg
		list = append(list, p)
	}
	return list, rows.Err()
}

func (r *karangTarunaRepository) UpdatePeriod(ctx context.Context, p *domain.KarangTarunaPeriod) error {
	p.UpdatedAt = time.Now()
	if p.Status == "active" {
		queryDeact := fmt.Sprintf(`UPDATE %s SET status = 'archived', updated_at = NOW() WHERE tenant_id = $1 AND id != $2 AND status = 'active'`, TenantTable(ctx, "karang_taruna_periods"))
		_, _ = r.db.ExecContext(ctx, queryDeact, p.TenantID, p.ID)
	}
	query := fmt.Sprintf(`
		UPDATE %s
		SET name = $1, start_date = $2, end_date = $3, status = $4, sk_number = $5, sk_file_url = $6, updated_at = $7
		WHERE tenant_id = $8 AND id = $9
	`, TenantTable(ctx, "karang_taruna_periods"))
	res, err := r.db.ExecContext(ctx, query, p.Name, p.StartDate, p.EndDate, p.Status, p.SKNumber, p.SKFileURL, p.UpdatedAt, p.TenantID, p.ID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

// ---------------- Config ----------------

func (r *karangTarunaRepository) SaveConfig(ctx context.Context, c *domain.KarangTarunaConfig) error {
	c.UpdatedAt = time.Now()
	rolesJSON, _ := json.Marshal(c.AllowedRoles)
	sectionsJSON, _ := json.Marshal(c.AllowedSections)

	query := fmt.Sprintf(`
		INSERT INTO %s (period_id, allowed_roles, allowed_sections, updated_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (period_id) DO UPDATE
		SET allowed_roles = EXCLUDED.allowed_roles, allowed_sections = EXCLUDED.allowed_sections, updated_at = EXCLUDED.updated_at
	`, TenantTable(ctx, "karang_taruna_configs"))
	_, err := r.db.ExecContext(ctx, query, c.PeriodID, rolesJSON, sectionsJSON, c.UpdatedAt)
	return err
}

func (r *karangTarunaRepository) GetConfig(ctx context.Context, periodID uuid.UUID) (*domain.KarangTarunaConfig, error) {
	query := fmt.Sprintf(`SELECT period_id, allowed_roles, allowed_sections, updated_at FROM %s WHERE period_id = $1`, TenantTable(ctx, "karang_taruna_configs"))
	var c domain.KarangTarunaConfig
	var rolesRaw, sectionsRaw []byte
	err := r.db.QueryRowContext(ctx, query, periodID).Scan(&c.PeriodID, &rolesRaw, &sectionsRaw, &c.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return &domain.KarangTarunaConfig{
			PeriodID:        periodID,
			AllowedRoles:    []string{"ketua", "wakil", "sekretaris", "bendahara", "koordinator_seksi", "anggota"},
			AllowedSections: []string{"Olahraga & Kebugaran", "Seni & Budaya", "Sosial & Humas", "Kerohanian & Kemitraan", "Lingkungan Hidup"},
		}, nil
	}
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal(rolesRaw, &c.AllowedRoles)
	_ = json.Unmarshal(sectionsRaw, &c.AllowedSections)
	return &c, nil
}

// ---------------- Members ----------------

func (r *karangTarunaRepository) AddMember(ctx context.Context, m *domain.KarangTarunaMember) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	now := time.Now()
	m.CreatedAt = now
	m.UpdatedAt = now
	if m.Status == "" {
		m.Status = "aktif"
	}
	if m.JoinedAt.IsZero() {
		m.JoinedAt = now
	}

	query := fmt.Sprintf(`
		INSERT INTO %s (id, period_id, resident_id, role, section, custom_title, phone_override, photo_url, status, joined_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		ON CONFLICT (period_id, resident_id) DO UPDATE
		SET role = EXCLUDED.role, section = EXCLUDED.section, custom_title = EXCLUDED.custom_title,
		    phone_override = EXCLUDED.phone_override, photo_url = EXCLUDED.photo_url, status = EXCLUDED.status, updated_at = NOW()
	`, TenantTable(ctx, "karang_taruna_members"))
	_, err := r.db.ExecContext(ctx, query, m.ID, m.PeriodID, m.ResidentID, m.Role, m.Section, m.CustomTitle, m.PhoneOverride, m.PhotoURL, m.Status, m.JoinedAt, m.CreatedAt, m.UpdatedAt)
	return err
}

func (r *karangTarunaRepository) GetMemberByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.KarangTarunaMember, error) {
	mTable := TenantTable(ctx, "karang_taruna_members")
	rTable := TenantTable(ctx, "residents")
	query := fmt.Sprintf(`
		SELECT m.id, m.period_id, m.resident_id, m.role, m.section, m.custom_title, m.phone_override, m.photo_url, m.status, m.joined_at, m.created_at, m.updated_at,
		       r.full_name, COALESCE(r.nik, ''), r.phone
		FROM %s m
		JOIN %s r ON r.id = m.resident_id
		WHERE m.id = $1
	`, mTable, rTable)
	m := &domain.KarangTarunaMember{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&m.ID, &m.PeriodID, &m.ResidentID, &m.Role, &m.Section, &m.CustomTitle, &m.PhoneOverride, &m.PhotoURL, &m.Status, &m.JoinedAt, &m.CreatedAt, &m.UpdatedAt,
		&m.ResidentName, &m.ResidentNIK, &m.Phone,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return m, err
}

func (r *karangTarunaRepository) ListMembers(ctx context.Context, tenantID, periodID uuid.UUID, section, role, status string) ([]*domain.KarangTarunaMember, error) {
	mTable := TenantTable(ctx, "karang_taruna_members")
	rTable := TenantTable(ctx, "residents")

	whereClause := "WHERE m.period_id = $1"
	args := []interface{}{periodID}
	argIdx := 2

	if section != "" {
		whereClause += fmt.Sprintf(" AND m.section = $%d", argIdx)
		args = append(args, section)
		argIdx++
	}
	if role != "" {
		whereClause += fmt.Sprintf(" AND m.role = $%d", argIdx)
		args = append(args, role)
		argIdx++
	}
	if status != "" {
		whereClause += fmt.Sprintf(" AND m.status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}

	query := fmt.Sprintf(`
		SELECT m.id, m.period_id, m.resident_id, m.role, m.section, m.custom_title, m.phone_override, m.photo_url, m.status, m.joined_at, m.created_at, m.updated_at,
		       r.full_name, COALESCE(r.nik, ''), r.phone
		FROM %s m
		JOIN %s r ON r.id = m.resident_id
		%s
		ORDER BY 
			CASE m.role
				WHEN 'ketua' THEN 1
				WHEN 'wakil' THEN 2
				WHEN 'sekretaris' THEN 3
				WHEN 'bendahara' THEN 4
				WHEN 'koordinator_seksi' THEN 5
				ELSE 6
			END,
			m.created_at ASC
	`, mTable, rTable, whereClause)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.KarangTarunaMember
	for rows.Next() {
		m := &domain.KarangTarunaMember{}
		if err := rows.Scan(
			&m.ID, &m.PeriodID, &m.ResidentID, &m.Role, &m.Section, &m.CustomTitle, &m.PhoneOverride, &m.PhotoURL, &m.Status, &m.JoinedAt, &m.CreatedAt, &m.UpdatedAt,
			&m.ResidentName, &m.ResidentNIK, &m.Phone,
		); err != nil {
			return nil, err
		}
		list = append(list, m)
	}
	return list, rows.Err()
}

func (r *karangTarunaRepository) UpdateMember(ctx context.Context, m *domain.KarangTarunaMember) error {
	m.UpdatedAt = time.Now()
	query := fmt.Sprintf(`
		UPDATE %s
		SET role = $1, section = $2, custom_title = $3, phone_override = $4, photo_url = $5, status = $6, updated_at = $7
		WHERE id = $8 AND period_id = $9
	`, TenantTable(ctx, "karang_taruna_members"))
	res, err := r.db.ExecContext(ctx, query, m.Role, m.Section, m.CustomTitle, m.PhoneOverride, m.PhotoURL, m.Status, m.UpdatedAt, m.ID, m.PeriodID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *karangTarunaRepository) DeleteMember(ctx context.Context, tenantID, id uuid.UUID) error {
	query := fmt.Sprintf(`DELETE FROM %s WHERE id = $1`, TenantTable(ctx, "karang_taruna_members"))
	res, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *karangTarunaRepository) IsKetua(ctx context.Context, tenantID, userID uuid.UUID) (bool, error) {
	// Cek apakah userID milik warga yang menjabat ketua di periode aktif
	pTable := TenantTable(ctx, "karang_taruna_periods")
	mTable := TenantTable(ctx, "karang_taruna_members")
	query := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM %s m
		JOIN %s p ON p.id = m.period_id AND p.status = 'active'
		WHERE m.role = 'ketua' AND m.status = 'aktif' AND m.resident_id IN (
			SELECT id FROM %s WHERE phone IN (SELECT phone FROM public.users WHERE id = $1)
		)
	`, mTable, pTable, TenantTable(ctx, "residents"))
	var count int
	_ = r.db.QueryRowContext(ctx, query, userID).Scan(&count)
	return count > 0, nil
}
