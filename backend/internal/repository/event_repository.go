package repository

import (
	"context"
	"database/sql"
	"errors"

	"backend/internal/domain"
	"github.com/google/uuid"
)

type eventRepository struct {
	db *sql.DB
}

func NewEventRepository(db *sql.DB) domain.EventRepository {
	return &eventRepository{db: db}
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
	query := `
		INSERT INTO event_budgets (id, event_id, description, estimated_cost, actual_cost, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
		ON CONFLICT (id) DO UPDATE
		SET description = EXCLUDED.description, estimated_cost = EXCLUDED.estimated_cost, actual_cost = EXCLUDED.actual_cost, updated_at = NOW()
		RETURNING created_at, updated_at
	`
	return r.db.QueryRowContext(ctx, query,
		budget.ID,
		budget.EventID,
		budget.Description,
		budget.EstimatedCost,
		budget.ActualCost,
	).Scan(&budget.CreatedAt, &budget.UpdatedAt)
}

func (r *eventRepository) GetBudgetByEventID(ctx context.Context, eventID uuid.UUID) (*domain.EventBudget, error) {
	query := `
		SELECT id, event_id, description, estimated_cost, actual_cost, created_at, updated_at
		FROM event_budgets
		WHERE event_id = $1
		ORDER BY created_at DESC LIMIT 1
	`
	var b domain.EventBudget
	err := r.db.QueryRowContext(ctx, query, eventID).Scan(
		&b.ID,
		&b.EventID,
		&b.Description,
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
