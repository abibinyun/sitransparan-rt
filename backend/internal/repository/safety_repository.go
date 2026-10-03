package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"backend/internal/domain"
)

type postgresSafetyRepository struct {
	db *sql.DB
}

func NewSafetyRepository(db *sql.DB) domain.SafetyRepository {
	return &postgresSafetyRepository{db: db}
}

func (r *postgresSafetyRepository) CreateAlert(ctx context.Context, a *domain.EmergencyAlert) error {
	table := TenantTable(ctx, "emergency_alerts")
	query := fmt.Sprintf(`
		INSERT INTO %s (id, user_id, house_id, reporter_name, house_number, alert_type, description, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`, table)

	_, err := r.db.ExecContext(ctx, query,
		a.ID, a.UserID, a.HouseID, a.ReporterName, a.HouseNumber,
		a.AlertType, a.Description, a.Status, a.CreatedAt,
	)
	return err
}

func (r *postgresSafetyRepository) GetAlertByID(ctx context.Context, id uuid.UUID) (*domain.EmergencyAlert, error) {
	table := TenantTable(ctx, "emergency_alerts")
	query := fmt.Sprintf(`
		SELECT id, user_id, house_id, reporter_name, house_number, alert_type, description, status, resolved_by, resolved_at, created_at
		FROM %s WHERE id = $1
	`, table)

	var a domain.EmergencyAlert
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&a.ID, &a.UserID, &a.HouseID, &a.ReporterName, &a.HouseNumber,
		&a.AlertType, &a.Description, &a.Status, &a.ResolvedBy, &a.ResolvedAt, &a.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &a, nil
}

func (r *postgresSafetyRepository) ListActiveAlerts(ctx context.Context) ([]*domain.EmergencyAlert, error) {
	table := TenantTable(ctx, "emergency_alerts")
	query := fmt.Sprintf(`
		SELECT id, user_id, house_id, reporter_name, house_number, alert_type, description, status, resolved_by, resolved_at, created_at
		FROM %s WHERE status = 'active' ORDER BY created_at DESC
	`, table)

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.EmergencyAlert
	for rows.Next() {
		var a domain.EmergencyAlert
		if err := rows.Scan(
			&a.ID, &a.UserID, &a.HouseID, &a.ReporterName, &a.HouseNumber,
			&a.AlertType, &a.Description, &a.Status, &a.ResolvedBy, &a.ResolvedAt, &a.CreatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, &a)
	}
	return list, nil
}

func (r *postgresSafetyRepository) ResolveAlert(ctx context.Context, id, resolverUserID uuid.UUID) error {
	table := TenantTable(ctx, "emergency_alerts")
	query := fmt.Sprintf(`
		UPDATE %s
		SET status = 'resolved', resolved_by = $2, resolved_at = NOW()
		WHERE id = $1 AND status = 'active'
	`, table)
	_, err := r.db.ExecContext(ctx, query, id, resolverUserID)
	return err
}

func (r *postgresSafetyRepository) CreateVacancy(ctx context.Context, v *domain.HouseVacancy) error {
	table := TenantTable(ctx, "house_vacancies")
	query := fmt.Sprintf(`
		INSERT INTO %s (id, house_id, user_id, start_date, end_date, emergency_contact, notes, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`, table)
	_, err := r.db.ExecContext(ctx, query,
		v.ID, v.HouseID, v.UserID, v.StartDate, v.EndDate,
		v.EmergencyContact, v.Notes, v.Status, v.CreatedAt,
	)
	return err
}

func (r *postgresSafetyRepository) ListVacancies(ctx context.Context, onlyActive bool) ([]*domain.HouseVacancy, error) {
	table := TenantTable(ctx, "house_vacancies")
	query := fmt.Sprintf(`
		SELECT id, house_id, user_id, start_date::text, end_date::text, emergency_contact, notes, status, created_at
		FROM %s
	`, table)
	if onlyActive {
		query += " WHERE status = 'active'"
	}
	query += " ORDER BY start_date ASC"

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.HouseVacancy
	for rows.Next() {
		var v domain.HouseVacancy
		if err := rows.Scan(
			&v.ID, &v.HouseID, &v.UserID, &v.StartDate, &v.EndDate,
			&v.EmergencyContact, &v.Notes, &v.Status, &v.CreatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, &v)
	}
	return list, nil
}

func (r *postgresSafetyRepository) ListVacanciesByUser(ctx context.Context, userID uuid.UUID) ([]*domain.HouseVacancy, error) {
	table := TenantTable(ctx, "house_vacancies")
	query := fmt.Sprintf(`
		SELECT id, house_id, user_id, start_date::text, end_date::text, emergency_contact, notes, status, created_at
		FROM %s WHERE user_id = $1 ORDER BY created_at DESC
	`, table)

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.HouseVacancy
	for rows.Next() {
		var v domain.HouseVacancy
		if err := rows.Scan(
			&v.ID, &v.HouseID, &v.UserID, &v.StartDate, &v.EndDate,
			&v.EmergencyContact, &v.Notes, &v.Status, &v.CreatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, &v)
	}
	return list, nil
}
