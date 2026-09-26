package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"backend/internal/domain"
	"github.com/google/uuid"
)

type wasteAttendanceRepository struct {
	db *sql.DB
}

func NewWasteAttendanceRepository(db *sql.DB) domain.WasteAttendanceRepository {
	return &wasteAttendanceRepository{db: db}
}

// ---------- Collectors ----------

func (r *wasteAttendanceRepository) ListCollectors(ctx context.Context, tenantID uuid.UUID, onlyActive bool) ([]domain.WasteCollector, error) {
	table := TenantTable(ctx, "waste_collectors")
	query := fmt.Sprintf(`
		SELECT id, tenant_id, resident_id, name, phone, is_active, created_at, updated_at
		FROM %s
		WHERE tenant_id = $1 AND deleted_at IS NULL
	`, table)

	if onlyActive {
		query += " AND is_active = TRUE"
	}
	query += " ORDER BY name ASC"

	rows, err := r.db.QueryContext(ctx, query, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var collectors []domain.WasteCollector
	for rows.Next() {
		var c domain.WasteCollector
		var phone sql.NullString
		if err := rows.Scan(
			&c.ID, &c.TenantID, &c.ResidentID, &c.Name, &phone,
			&c.IsActive, &c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if phone.Valid {
			c.Phone = phone.String
		}
		collectors = append(collectors, c)
	}

	if collectors == nil {
		collectors = []domain.WasteCollector{}
	}
	return collectors, nil
}

func (r *wasteAttendanceRepository) GetCollectorByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.WasteCollector, error) {
	table := TenantTable(ctx, "waste_collectors")
	query := fmt.Sprintf(`
		SELECT id, tenant_id, resident_id, name, phone, is_active, created_at, updated_at
		FROM %s
		WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
	`, table)

	var c domain.WasteCollector
	var phone sql.NullString
	err := r.db.QueryRowContext(ctx, query, tenantID, id).Scan(
		&c.ID, &c.TenantID, &c.ResidentID, &c.Name, &phone,
		&c.IsActive, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if phone.Valid {
		c.Phone = phone.String
	}
	return &c, nil
}

func (r *wasteAttendanceRepository) CreateCollector(ctx context.Context, c *domain.WasteCollector) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	table := TenantTable(ctx, "waste_collectors")
	query := fmt.Sprintf(`
		INSERT INTO %s (id, tenant_id, resident_id, name, phone, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
		RETURNING created_at, updated_at
	`, table)

	return r.db.QueryRowContext(
		ctx, query,
		c.ID, c.TenantID, c.ResidentID, c.Name, c.Phone, c.IsActive,
	).Scan(&c.CreatedAt, &c.UpdatedAt)
}

func (r *wasteAttendanceRepository) UpdateCollector(ctx context.Context, c *domain.WasteCollector) error {
	table := TenantTable(ctx, "waste_collectors")
	query := fmt.Sprintf(`
		UPDATE %s
		SET resident_id = $1, name = $2, phone = $3, is_active = $4, updated_at = NOW()
		WHERE tenant_id = $5 AND id = $6 AND deleted_at IS NULL
		RETURNING updated_at
	`, table)

	return r.db.QueryRowContext(
		ctx, query,
		c.ResidentID, c.Name, c.Phone, c.IsActive, c.TenantID, c.ID,
	).Scan(&c.UpdatedAt)
}

func (r *wasteAttendanceRepository) DeleteCollector(ctx context.Context, tenantID, id uuid.UUID) error {
	table := TenantTable(ctx, "waste_collectors")
	query := fmt.Sprintf(`
		UPDATE %s
		SET deleted_at = NOW(), updated_at = NOW()
		WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
	`, table)

	_, err := r.db.ExecContext(ctx, query, tenantID, id)
	return err
}

// ---------- Attendance ----------

func (r *wasteAttendanceRepository) ListAttendance(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]domain.WasteAttendance, int, error) {
	attTable := TenantTable(ctx, "waste_attendance")
	memTable := TenantTable(ctx, "waste_attendance_members")
	colTable := TenantTable(ctx, "waste_collectors")

	// Count
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM %s WHERE tenant_id = $1 AND deleted_at IS NULL`, attTable)
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, tenantID).Scan(&total); err != nil {
		return nil, 0, err
	}

	if limit <= 0 {
		limit = 20
	}

	query := fmt.Sprintf(`
		SELECT id, tenant_id, date, wage_per_person, total_wage, notes, created_by, created_at, updated_at
		FROM %s
		WHERE tenant_id = $1 AND deleted_at IS NULL
		ORDER BY date DESC, created_at DESC
		LIMIT $2 OFFSET $3
	`, attTable)

	rows, err := r.db.QueryContext(ctx, query, tenantID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var list []domain.WasteAttendance
	for rows.Next() {
		var a domain.WasteAttendance
		var d time.Time
		var notes sql.NullString
		if err := rows.Scan(
			&a.ID, &a.TenantID, &d, &a.WagePerPerson, &a.TotalWage,
			&notes, &a.CreatedBy, &a.CreatedAt, &a.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		a.Date = d.Format("2006-01-02")
		if notes.Valid {
			a.Notes = notes.String
		}
		list = append(list, a)
	}

	// Fetch members for each attendance
	for i := range list {
		memQuery := fmt.Sprintf(`
			SELECT m.id, m.attendance_id, m.collector_id, c.name, m.wage_amount, m.created_at
			FROM %s m
			JOIN %s c ON m.collector_id = c.id
			WHERE m.attendance_id = $1
			ORDER BY c.name ASC
		`, memTable, colTable)

		mRows, err := r.db.QueryContext(ctx, memQuery, list[i].ID)
		if err == nil {
			var members []domain.WasteAttendanceMember
			for mRows.Next() {
				var m domain.WasteAttendanceMember
				if err := mRows.Scan(
					&m.ID, &m.AttendanceID, &m.CollectorID, &m.CollectorName,
					&m.WageAmount, &m.CreatedAt,
				); err == nil {
					members = append(members, m)
				}
			}
			mRows.Close()
			if members == nil {
				members = []domain.WasteAttendanceMember{}
			}
			list[i].Members = members
		}
	}

	if list == nil {
		list = []domain.WasteAttendance{}
	}
	return list, total, nil
}

func (r *wasteAttendanceRepository) GetAttendanceByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.WasteAttendance, error) {
	attTable := TenantTable(ctx, "waste_attendance")
	memTable := TenantTable(ctx, "waste_attendance_members")
	colTable := TenantTable(ctx, "waste_collectors")

	query := fmt.Sprintf(`
		SELECT id, tenant_id, date, wage_per_person, total_wage, notes, created_by, created_at, updated_at
		FROM %s
		WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
	`, attTable)

	var a domain.WasteAttendance
	var d time.Time
	var notes sql.NullString
	if err := r.db.QueryRowContext(ctx, query, tenantID, id).Scan(
		&a.ID, &a.TenantID, &d, &a.WagePerPerson, &a.TotalWage,
		&notes, &a.CreatedBy, &a.CreatedAt, &a.UpdatedAt,
	); err != nil {
		return nil, err
	}
	a.Date = d.Format("2006-01-02")
	if notes.Valid {
		a.Notes = notes.String
	}

	// Fetch members
	memQuery := fmt.Sprintf(`
		SELECT m.id, m.attendance_id, m.collector_id, c.name, m.wage_amount, m.created_at
		FROM %s m
		JOIN %s c ON m.collector_id = c.id
		WHERE m.attendance_id = $1
		ORDER BY c.name ASC
	`, memTable, colTable)

	mRows, err := r.db.QueryContext(ctx, memQuery, a.ID)
	if err == nil {
		var members []domain.WasteAttendanceMember
		for mRows.Next() {
			var m domain.WasteAttendanceMember
			if err := mRows.Scan(
				&m.ID, &m.AttendanceID, &m.CollectorID, &m.CollectorName,
				&m.WageAmount, &m.CreatedAt,
			); err == nil {
				members = append(members, m)
			}
		}
		mRows.Close()
		a.Members = members
	}

	return &a, nil
}

func (r *wasteAttendanceRepository) CreateAttendance(ctx context.Context, a *domain.WasteAttendance) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}

	attTable := TenantTable(ctx, "waste_attendance")
	memTable := TenantTable(ctx, "waste_attendance_members")

	query := fmt.Sprintf(`
		INSERT INTO %s (id, tenant_id, date, wage_per_person, total_wage, notes, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
		RETURNING created_at, updated_at
	`, attTable)

	if err := tx.QueryRowContext(
		ctx, query,
		a.ID, a.TenantID, a.Date, a.WagePerPerson, a.TotalWage, a.Notes, a.CreatedBy,
	).Scan(&a.CreatedAt, &a.UpdatedAt); err != nil {
		return err
	}

	for i := range a.Members {
		m := &a.Members[i]
		if m.ID == uuid.Nil {
			m.ID = uuid.New()
		}
		m.AttendanceID = a.ID
		memQuery := fmt.Sprintf(`
			INSERT INTO %s (id, attendance_id, collector_id, wage_amount, created_at)
			VALUES ($1, $2, $3, $4, NOW())
		`, memTable)

		if _, err := tx.ExecContext(ctx, memQuery, m.ID, m.AttendanceID, m.CollectorID, m.WageAmount); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *wasteAttendanceRepository) DeleteAttendance(ctx context.Context, tenantID, id uuid.UUID) error {
	table := TenantTable(ctx, "waste_attendance")
	query := fmt.Sprintf(`
		UPDATE %s
		SET deleted_at = NOW(), updated_at = NOW()
		WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
	`, table)

	_, err := r.db.ExecContext(ctx, query, tenantID, id)
	return err
}
