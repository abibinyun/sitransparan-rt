package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"path/filepath"

	"backend/internal/domain"
	"backend/pkg/storage/minio"
	"github.com/google/uuid"
)

type eventRepository struct {
	db          *sql.DB
	minioClient *minio.Client
}

func NewEventRepository(db *sql.DB, minioClient *minio.Client) domain.EventRepository {
	return &eventRepository{
		db:          db,
		minioClient: minioClient,
	}
}

func (r *eventRepository) CreateEvent(ctx context.Context, event *domain.Event) error {
	if event.ID == uuid.Nil {
		event.ID = uuid.New()
	}
	if event.Status == "" {
		event.Status = "planned"
	}
	query := `
		INSERT INTO events (id, tenant_id, title, description, event_date, location, status, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
		RETURNING created_at, updated_at
	`
	return r.db.QueryRowContext(ctx, query,
		event.ID,
		event.TenantID,
		event.Title,
		event.Description,
		event.EventDate,
		event.Location,
		event.Status,
		event.CreatedBy,
	).Scan(&event.CreatedAt, &event.UpdatedAt)
}

func (r *eventRepository) GetEventByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Event, error) {
	query := `
		SELECT id, tenant_id, title, description, event_date, location, status, created_by, created_at, updated_at
		FROM events
		WHERE tenant_id = $1 AND id = $2
	`
	var e domain.Event
	err := r.db.QueryRowContext(ctx, query, tenantID, id).Scan(
		&e.ID,
		&e.TenantID,
		&e.Title,
		&e.Description,
		&e.EventDate,
		&e.Location,
		&e.Status,
		&e.CreatedBy,
		&e.CreatedAt,
		&e.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &e, nil
}

func (r *eventRepository) UpdateEvent(ctx context.Context, event *domain.Event) error {
	query := `
		UPDATE events
		SET title = $1, description = $2, event_date = $3, location = $4, status = $5, updated_at = NOW()
		WHERE tenant_id = $6 AND id = $7
		RETURNING updated_at
	`
	err := r.db.QueryRowContext(ctx, query,
		event.Title,
		event.Description,
		event.EventDate,
		event.Location,
		event.Status,
		event.TenantID,
		event.ID,
	).Scan(&event.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

func (r *eventRepository) DeleteEvent(ctx context.Context, tenantID, id uuid.UUID) error {
	query := `DELETE FROM events WHERE tenant_id = $1 AND id = $2`
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

func (r *eventRepository) ListEvents(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.Event, int64, error) {
	var count int64
	countQuery := `SELECT COUNT(*) FROM events WHERE tenant_id = $1`
	if err := r.db.QueryRowContext(ctx, countQuery, tenantID).Scan(&count); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, tenant_id, title, description, event_date, location, status, created_by, created_at, updated_at
		FROM events
		WHERE tenant_id = $1
		ORDER BY created_at DESC LIMIT $2 OFFSET $3
	`
	rows, err := r.db.QueryContext(ctx, query, tenantID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var events []*domain.Event
	for rows.Next() {
		var e domain.Event
		if err := rows.Scan(
			&e.ID,
			&e.TenantID,
			&e.Title,
			&e.Description,
			&e.EventDate,
			&e.Location,
			&e.Status,
			&e.CreatedBy,
			&e.CreatedAt,
			&e.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		events = append(events, &e)
	}
	return events, count, rows.Err()
}

func (r *eventRepository) AddOrUpdateBudget(ctx context.Context, budget *domain.EventBudget) error {
	if budget.ID == uuid.Nil {
		budget.ID = uuid.New()
	}
	if budget.PlannedAmount == 0 && budget.EstimatedCost > 0 {
		budget.PlannedAmount = budget.EstimatedCost
	}
	if budget.ActualAmount == 0 && budget.ActualCost > 0 {
		budget.ActualAmount = budget.ActualCost
	}
	budget.EstimatedCost = budget.PlannedAmount
	budget.ActualCost = budget.ActualAmount

	query := `
		INSERT INTO event_budgets (id, event_id, item, category, description, planned_amount, actual_amount, estimated_cost, actual_cost, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
		ON CONFLICT (id) DO UPDATE
		SET item = EXCLUDED.item, category = EXCLUDED.category, description = EXCLUDED.description,
		    planned_amount = EXCLUDED.planned_amount, actual_amount = EXCLUDED.actual_amount,
		    estimated_cost = EXCLUDED.estimated_cost, actual_cost = EXCLUDED.actual_cost, updated_at = NOW()
		RETURNING created_at, updated_at
	`
	return r.db.QueryRowContext(ctx, query,
		budget.ID,
		budget.EventID,
		budget.Item,
		budget.Category,
		budget.Description,
		budget.PlannedAmount,
		budget.ActualAmount,
		budget.PlannedAmount,
		budget.ActualAmount,
	).Scan(&budget.CreatedAt, &budget.UpdatedAt)
}

func (r *eventRepository) GetBudgetByEventID(ctx context.Context, eventID uuid.UUID) (*domain.EventBudget, error) {
	query := `
		SELECT id, event_id, item, category, description, planned_amount, actual_amount, estimated_cost, actual_cost, created_at, updated_at
		FROM event_budgets
		WHERE event_id = $1
		ORDER BY created_at DESC LIMIT 1
	`
	var b domain.EventBudget
	err := r.db.QueryRowContext(ctx, query, eventID).Scan(
		&b.ID,
		&b.EventID,
		&b.Item,
		&b.Category,
		&b.Description,
		&b.PlannedAmount,
		&b.ActualAmount,
		&b.EstimatedCost,
		&b.ActualCost,
		&b.CreatedAt,
		&b.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &b, nil
}

func (r *eventRepository) ListBudgetsByEventID(ctx context.Context, eventID uuid.UUID) ([]*domain.EventBudget, error) {
	query := `
		SELECT id, event_id, item, category, description, planned_amount, actual_amount, estimated_cost, actual_cost, created_at, updated_at
		FROM event_budgets
		WHERE event_id = $1
		ORDER BY created_at ASC
	`
	rows, err := r.db.QueryContext(ctx, query, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.EventBudget
	for rows.Next() {
		var b domain.EventBudget
		if err := rows.Scan(
			&b.ID,
			&b.EventID,
			&b.Item,
			&b.Category,
			&b.Description,
			&b.PlannedAmount,
			&b.ActualAmount,
			&b.EstimatedCost,
			&b.ActualCost,
			&b.CreatedAt,
			&b.UpdatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, &b)
	}
	return list, rows.Err()
}

func (r *eventRepository) AddOrUpdateParticipant(ctx context.Context, participant *domain.EventParticipant) error {
	if participant.ID == uuid.Nil {
		participant.ID = uuid.New()
	}
	if participant.Status == "" {
		participant.Status = "attending"
	}
	query := `
		INSERT INTO event_participants (id, event_id, resident_id, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
		ON CONFLICT (event_id, resident_id) DO UPDATE
		SET status = EXCLUDED.status, updated_at = NOW()
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRowContext(ctx, query,
		participant.ID,
		participant.EventID,
		participant.ResidentID,
		participant.Status,
	).Scan(&participant.ID, &participant.CreatedAt, &participant.UpdatedAt)
}

func (r *eventRepository) ListParticipantsByEventID(ctx context.Context, eventID uuid.UUID) ([]*domain.EventParticipant, error) {
	query := `
		SELECT id, event_id, resident_id, status, created_at, updated_at
		FROM event_participants
		WHERE event_id = $1
		ORDER BY created_at ASC
	`
	rows, err := r.db.QueryContext(ctx, query, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.EventParticipant
	for rows.Next() {
		var p domain.EventParticipant
		if err := rows.Scan(
			&p.ID,
			&p.EventID,
			&p.ResidentID,
			&p.Status,
			&p.CreatedAt,
			&p.UpdatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, &p)
	}
	return list, rows.Err()
}

func (r *eventRepository) AssignRole(ctx context.Context, role *domain.EventRole) error {
	if role.ID == uuid.Nil {
		role.ID = uuid.New()
	}
	query := `
		INSERT INTO event_roles (id, event_id, resident_id, role, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
		ON CONFLICT (event_id, resident_id, role) DO UPDATE
		SET updated_at = NOW()
		RETURNING created_at, updated_at
	`
	return r.db.QueryRowContext(ctx, query,
		role.ID,
		role.EventID,
		role.ResidentID,
		role.Role,
	).Scan(&role.CreatedAt, &role.UpdatedAt)
}

func (r *eventRepository) ListRolesByEventID(ctx context.Context, eventID uuid.UUID) ([]*domain.EventRole, error) {
	query := `
		SELECT id, event_id, resident_id, role, created_at, updated_at
		FROM event_roles
		WHERE event_id = $1
		ORDER BY created_at ASC
	`
	rows, err := r.db.QueryContext(ctx, query, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.EventRole
	for rows.Next() {
		var er domain.EventRole
		if err := rows.Scan(
			&er.ID,
			&er.EventID,
			&er.ResidentID,
			&er.Role,
			&er.CreatedAt,
			&er.UpdatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, &er)
	}
	return list, rows.Err()
}

func (r *eventRepository) RemoveRole(ctx context.Context, eventID, roleID uuid.UUID) error {
	query := `DELETE FROM event_roles WHERE event_id = $1 AND id = $2`
	res, err := r.db.ExecContext(ctx, query, eventID, roleID)
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

func (r *eventRepository) CreateReceipt(ctx context.Context, receipt *domain.EventReceipt) error {
	if receipt.ID == uuid.Nil {
		receipt.ID = uuid.New()
	}
	query := `
		INSERT INTO event_receipts (id, event_id, resident_id, receipt_url, amount, description, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
		RETURNING created_at, updated_at
	`
	return r.db.QueryRowContext(ctx, query,
		receipt.ID,
		receipt.EventID,
		receipt.ResidentID,
		receipt.ReceiptURL,
		receipt.Amount,
		receipt.Description,
	).Scan(&receipt.CreatedAt, &receipt.UpdatedAt)
}

func (r *eventRepository) ListReceiptsByEventID(ctx context.Context, eventID uuid.UUID) ([]*domain.EventReceipt, error) {
	query := `
		SELECT id, event_id, resident_id, receipt_url, amount, description, created_at, updated_at
		FROM event_receipts
		WHERE event_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.EventReceipt
	for rows.Next() {
		var rec domain.EventReceipt
		if err := rows.Scan(
			&rec.ID,
			&rec.EventID,
			&rec.ResidentID,
			&rec.ReceiptURL,
			&rec.Amount,
			&rec.Description,
			&rec.CreatedAt,
			&rec.UpdatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, &rec)
	}
	return list, rows.Err()
}

func (r *eventRepository) UploadReceiptFile(ctx context.Context, filename string, content io.Reader, contentType string) (string, error) {
	ext := filepath.Ext(filename)
	objectName := fmt.Sprintf("events/receipts/%s%s", uuid.New().String(), ext)
	fileURL := fmt.Sprintf("/storage/%s", objectName)
	return fileURL, nil
}
