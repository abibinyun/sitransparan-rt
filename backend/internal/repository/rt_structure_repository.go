package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"backend/internal/domain"
	"github.com/google/uuid"
)

type rtStructureRepository struct {
	db *sql.DB
}

func NewRTStructureRepository(db *sql.DB) domain.RTStructureRepository {
	return &rtStructureRepository{db: db}
}

const (
	rtPeriodCols = `id, tenant_id, name, start_date, end_date, status, sk_number, sk_file_url, created_by, created_at, updated_at`
	rtMemberCols = `m.id, m.period_id, m.resident_id, m.role, m.section, m.custom_title, m.phone_override, m.photo_url, m.status, m.joined_at, m.created_at, m.updated_at, COALESCE(r.full_name, fm.full_name, 'Warga'), COALESCE(r.nik, fm.nik, ''), COALESCE(r.phone, '')`
)

// Periode methods
func (r *rtStructureRepository) CreatePeriod(ctx context.Context, p *domain.RTPeriod) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	table := TenantTable(ctx, "rt_periods")

	if p.Status == "active" {
		_, _ = r.db.ExecContext(ctx, fmt.Sprintf(`UPDATE %s SET status = 'archived' WHERE tenant_id = $1 AND status = 'active'`, table), p.TenantID)
	}

	query := fmt.Sprintf(`
		INSERT INTO %s (%s)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
		RETURNING created_at, updated_at
	`, table, rtPeriodCols)

	return r.db.QueryRowContext(ctx, query,
		p.ID, p.TenantID, p.Name, p.StartDate, p.EndDate, p.Status, p.SKNumber, p.SKFileURL, p.CreatedBy,
	).Scan(&p.CreatedAt, &p.UpdatedAt)
}

func (r *rtStructureRepository) GetPeriodByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.RTPeriod, error) {
	table := TenantTable(ctx, "rt_periods")
	query := fmt.Sprintf(`SELECT %s FROM %s WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`, rtPeriodCols, table)
	var p domain.RTPeriod
	err := r.db.QueryRowContext(ctx, query, tenantID, id).Scan(
		&p.ID, &p.TenantID, &p.Name, &p.StartDate, &p.EndDate, &p.Status, &p.SKNumber, &p.SKFileURL, &p.CreatedBy, &p.CreatedAt, &p.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &p, err
}

func (r *rtStructureRepository) GetActivePeriod(ctx context.Context, tenantID uuid.UUID) (*domain.RTPeriod, error) {
	table := TenantTable(ctx, "rt_periods")
	query := fmt.Sprintf(`SELECT %s FROM %s WHERE tenant_id = $1 AND status = 'active' AND deleted_at IS NULL ORDER BY start_date DESC LIMIT 1`, rtPeriodCols, table)
	var p domain.RTPeriod
	err := r.db.QueryRowContext(ctx, query, tenantID).Scan(
		&p.ID, &p.TenantID, &p.Name, &p.StartDate, &p.EndDate, &p.Status, &p.SKNumber, &p.SKFileURL, &p.CreatedBy, &p.CreatedAt, &p.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil // No active period yet
	}
	return &p, err
}

func (r *rtStructureRepository) ListPeriods(ctx context.Context, tenantID uuid.UUID, status string) ([]*domain.RTPeriod, error) {
	table := TenantTable(ctx, "rt_periods")
	var conditions []string
	var args []interface{}
	argIdx := 1

	conditions = append(conditions, fmt.Sprintf("tenant_id = $%d", argIdx))
	args = append(args, tenantID)
	argIdx++

	conditions = append(conditions, "deleted_at IS NULL")

	if status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, status)
		argIdx++
	}

	query := fmt.Sprintf(`SELECT %s FROM %s WHERE %s ORDER BY start_date DESC`, rtPeriodCols, table, strings.Join(conditions, " AND "))
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.RTPeriod
	for rows.Next() {
		var p domain.RTPeriod
		if err := rows.Scan(
			&p.ID, &p.TenantID, &p.Name, &p.StartDate, &p.EndDate, &p.Status, &p.SKNumber, &p.SKFileURL, &p.CreatedBy, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, &p)
	}
	return list, rows.Err()
}

func (r *rtStructureRepository) UpdatePeriod(ctx context.Context, p *domain.RTPeriod) error {
	table := TenantTable(ctx, "rt_periods")

	if p.Status == "active" {
		_, _ = r.db.ExecContext(ctx, fmt.Sprintf(`UPDATE %s SET status = 'archived' WHERE tenant_id = $1 AND status = 'active' AND id != $2`, table), p.TenantID, p.ID)
	}

	query := fmt.Sprintf(`
		UPDATE %s
		SET name = $1, start_date = $2, end_date = $3, status = $4, sk_number = $5, sk_file_url = $6, updated_at = NOW()
		WHERE tenant_id = $7 AND id = $8 AND deleted_at IS NULL
		RETURNING updated_at
	`, table)

	err := r.db.QueryRowContext(ctx, query,
		p.Name, p.StartDate, p.EndDate, p.Status, p.SKNumber, p.SKFileURL, p.TenantID, p.ID,
	).Scan(&p.UpdatedAt)

	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

// Members methods
func (r *rtStructureRepository) AddMember(ctx context.Context, m *domain.RTMember) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	table := TenantTable(ctx, "rt_members")
	query := fmt.Sprintf(`
		INSERT INTO %s (id, period_id, resident_id, role, section, custom_title, phone_override, photo_url, status, joined_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
		RETURNING created_at, updated_at
	`, table)

	if m.Status == "" {
		m.Status = "aktif"
	}
	if m.Role == "" {
		m.Role = "seksi"
	}
	if m.JoinedAt.IsZero() {
		m.JoinedAt = time.Now()
	}

	return r.db.QueryRowContext(ctx, query,
		m.ID, m.PeriodID, m.ResidentID, m.Role, m.Section, m.CustomTitle, m.PhoneOverride, m.PhotoURL, m.Status, m.JoinedAt,
	).Scan(&m.CreatedAt, &m.UpdatedAt)
}

func (r *rtStructureRepository) GetMemberByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.RTMember, error) {
	membersTable := TenantTable(ctx, "rt_members")
	residentsTable := TenantTable(ctx, "residents")
	familyTable := TenantTable(ctx, "family_members")
	periodsTable := TenantTable(ctx, "rt_periods")

	query := fmt.Sprintf(`
		SELECT %s
		FROM %s m
		LEFT JOIN %s r ON m.resident_id = r.id
		LEFT JOIN %s fm ON m.resident_id = fm.id
		JOIN %s p ON m.period_id = p.id
		WHERE p.tenant_id = $1 AND m.id = $2 AND m.deleted_at IS NULL
	`, rtMemberCols, membersTable, residentsTable, familyTable, periodsTable)

	var m domain.RTMember
	err := r.db.QueryRowContext(ctx, query, tenantID, id).Scan(
		&m.ID, &m.PeriodID, &m.ResidentID, &m.Role, &m.Section, &m.CustomTitle, &m.PhoneOverride, &m.PhotoURL, &m.Status, &m.JoinedAt, &m.CreatedAt, &m.UpdatedAt,
		&m.ResidentName, &m.ResidentNIK, &m.Phone,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &m, err
}

func (r *rtStructureRepository) ListMembers(ctx context.Context, tenantID, periodID uuid.UUID, section, role, status string) ([]*domain.RTMember, error) {
	membersTable := TenantTable(ctx, "rt_members")
	residentsTable := TenantTable(ctx, "residents")
	familyTable := TenantTable(ctx, "family_members")
	periodsTable := TenantTable(ctx, "rt_periods")

	var conditions []string
	var args []interface{}
	argIdx := 1

	conditions = append(conditions, fmt.Sprintf("p.tenant_id = $%d", argIdx))
	args = append(args, tenantID)
	argIdx++

	conditions = append(conditions, fmt.Sprintf("m.period_id = $%d", argIdx))
	args = append(args, periodID)
	argIdx++

	conditions = append(conditions, "m.deleted_at IS NULL")

	if section != "" {
		conditions = append(conditions, fmt.Sprintf("m.section = $%d", argIdx))
		args = append(args, section)
		argIdx++
	}
	if role != "" {
		conditions = append(conditions, fmt.Sprintf("m.role = $%d", argIdx))
		args = append(args, role)
		argIdx++
	}
	if status != "" {
		conditions = append(conditions, fmt.Sprintf("m.status = $%d", argIdx))
		args = append(args, status)
		argIdx++
	}

	query := fmt.Sprintf(`
		SELECT %s
		FROM %s m
		LEFT JOIN %s r ON m.resident_id = r.id
		LEFT JOIN %s fm ON m.resident_id = fm.id
		JOIN %s p ON m.period_id = p.id
		WHERE %s
		ORDER BY 
			CASE m.role 
				WHEN 'ketua' THEN 1 
				WHEN 'wakil' THEN 2 
				WHEN 'sekretaris' THEN 3 
				WHEN 'bendahara' THEN 4 
				WHEN 'penasihat' THEN 5 
				ELSE 6 
			END, 
			m.created_at ASC
	`, rtMemberCols, membersTable, residentsTable, familyTable, periodsTable, strings.Join(conditions, " AND "))

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.RTMember
	for rows.Next() {
		var m domain.RTMember
		if err := rows.Scan(
			&m.ID, &m.PeriodID, &m.ResidentID, &m.Role, &m.Section, &m.CustomTitle, &m.PhoneOverride, &m.PhotoURL, &m.Status, &m.JoinedAt, &m.CreatedAt, &m.UpdatedAt,
			&m.ResidentName, &m.ResidentNIK, &m.Phone,
		); err != nil {
			return nil, err
		}
		list = append(list, &m)
	}
	return list, rows.Err()
}

func (r *rtStructureRepository) UpdateMember(ctx context.Context, m *domain.RTMember) error {
	table := TenantTable(ctx, "rt_members")
	query := fmt.Sprintf(`
		UPDATE %s
		SET role = $1, section = $2, custom_title = $3, phone_override = $4, photo_url = $5, status = $6, updated_at = NOW()
		WHERE id = $7 AND deleted_at IS NULL
		RETURNING updated_at
	`, table)

	err := r.db.QueryRowContext(ctx, query,
		m.Role, m.Section, m.CustomTitle, m.PhoneOverride, m.PhotoURL, m.Status, m.ID,
	).Scan(&m.UpdatedAt)

	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

func (r *rtStructureRepository) DeleteMember(ctx context.Context, tenantID, id uuid.UUID) error {
	table := TenantTable(ctx, "rt_members")
	query := fmt.Sprintf(`UPDATE %s SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`, table)
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
