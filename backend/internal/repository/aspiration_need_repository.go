package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"backend/internal/domain"
	"github.com/google/uuid"
)

type aspirationNeedRepository struct {
	db *sql.DB
}

func NewAspirationNeedRepository(db *sql.DB) domain.AspirationNeedRepository {
	return &aspirationNeedRepository{db: db}
}

func (r *aspirationNeedRepository) CreateAspiration(ctx context.Context, asp *domain.Aspiration) error {
	if asp.ID == uuid.Nil {
		asp.ID = uuid.New()
	}
	now := time.Now()
	asp.CreatedAt = now
	asp.UpdatedAt = now
	if asp.Status == "" {
		asp.Status = "submitted"
	}

	if r.db == nil {
		return nil
	}

	query := `
		INSERT INTO aspirations (id, tenant_id, resident_id, title, content, category, status, is_anonymous, response, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`
	_, err := r.db.ExecContext(ctx, query,
		asp.ID, asp.TenantID, asp.ResidentID, asp.Title, asp.Content, asp.Category, asp.Status, asp.IsAnonymous, asp.Response, asp.CreatedAt, asp.UpdatedAt,
	)
	return err
}

func (r *aspirationNeedRepository) GetAspirationByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Aspiration, error) {
	if r.db == nil {
		return nil, errors.New("sql: no rows in result set")
	}

	query := `
		SELECT id, tenant_id, resident_id, title, content, category, status, is_anonymous, response, created_at, updated_at
		FROM aspirations
		WHERE id = $1 AND tenant_id = $2
	`
	asp := &domain.Aspiration{}
	err := r.db.QueryRowContext(ctx, query, id, tenantID).Scan(
		&asp.ID, &asp.TenantID, &asp.ResidentID, &asp.Title, &asp.Content, &asp.Category, &asp.Status, &asp.IsAnonymous, &asp.Response, &asp.CreatedAt, &asp.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return asp, nil
}

func (r *aspirationNeedRepository) ListAspirations(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.Aspiration, int64, error) {
	if r.db == nil {
		return []*domain.Aspiration{}, 0, nil
	}

	var total int64
	countQuery := `SELECT COUNT(*) FROM aspirations WHERE tenant_id = $1`
	if err := r.db.QueryRowContext(ctx, countQuery, tenantID).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, tenant_id, resident_id, title, content, category, status, is_anonymous, response, created_at, updated_at
		FROM aspirations
		WHERE tenant_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.db.QueryContext(ctx, query, tenantID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	list := []*domain.Aspiration{}
	for rows.Next() {
		asp := &domain.Aspiration{}
		if err := rows.Scan(&asp.ID, &asp.TenantID, &asp.ResidentID, &asp.Title, &asp.Content, &asp.Category, &asp.Status, &asp.IsAnonymous, &asp.Response, &asp.CreatedAt, &asp.UpdatedAt); err != nil {
			return nil, 0, err
		}
		list = append(list, asp)
	}

	return list, total, nil
}

func (r *aspirationNeedRepository) UpdateAspiration(ctx context.Context, asp *domain.Aspiration) error {
	asp.UpdatedAt = time.Now()
	if r.db == nil {
		return nil
	}

	query := `
		UPDATE aspirations
		SET resident_id = $1, title = $2, content = $3, category = $4, status = $5, is_anonymous = $6, response = $7, updated_at = $8
		WHERE id = $9 AND tenant_id = $10
	`
	res, err := r.db.ExecContext(ctx, query,
		asp.ResidentID, asp.Title, asp.Content, asp.Category, asp.Status, asp.IsAnonymous, asp.Response, asp.UpdatedAt, asp.ID, asp.TenantID,
	)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err == nil && rows == 0 {
		return errors.New("aspiration not found")
	}
	return nil
}

func (r *aspirationNeedRepository) CreateCommunityNeed(ctx context.Context, need *domain.CommunityNeed) error {
	if need.ID == uuid.Nil {
		need.ID = uuid.New()
	}
	now := time.Now()
	need.CreatedAt = now
	need.UpdatedAt = now
	if need.Status == "" {
		need.Status = "proposed"
	}

	if r.db == nil {
		return nil
	}

	query := `
		INSERT INTO community_needs (id, tenant_id, title, description, estimated_cost, status, progress_notes, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := r.db.ExecContext(ctx, query,
		need.ID, need.TenantID, need.Title, need.Description, need.EstimatedCost, need.Status, need.ProgressNotes, need.CreatedAt, need.UpdatedAt,
	)
	return err
}

func (r *aspirationNeedRepository) GetCommunityNeedByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.CommunityNeed, error) {
	if r.db == nil {
		return nil, errors.New("sql: no rows in result set")
	}

	query := `
		SELECT id, tenant_id, title, description, estimated_cost, status, progress_notes, created_at, updated_at
		FROM community_needs
		WHERE id = $1 AND tenant_id = $2
	`
	need := &domain.CommunityNeed{}
	err := r.db.QueryRowContext(ctx, query, id, tenantID).Scan(
		&need.ID, &need.TenantID, &need.Title, &need.Description, &need.EstimatedCost, &need.Status, &need.ProgressNotes, &need.CreatedAt, &need.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return need, nil
}

func (r *aspirationNeedRepository) ListCommunityNeeds(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.CommunityNeed, int64, error) {
	if r.db == nil {
		return []*domain.CommunityNeed{}, 0, nil
	}

	var total int64
	countQuery := `SELECT COUNT(*) FROM community_needs WHERE tenant_id = $1`
	if err := r.db.QueryRowContext(ctx, countQuery, tenantID).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, tenant_id, title, description, estimated_cost, status, progress_notes, created_at, updated_at
		FROM community_needs
		WHERE tenant_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.db.QueryContext(ctx, query, tenantID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	list := []*domain.CommunityNeed{}
	for rows.Next() {
		need := &domain.CommunityNeed{}
		if err := rows.Scan(&need.ID, &need.TenantID, &need.Title, &need.Description, &need.EstimatedCost, &need.Status, &need.ProgressNotes, &need.CreatedAt, &need.UpdatedAt); err != nil {
			return nil, 0, err
		}
		list = append(list, need)
	}

	return list, total, nil
}

func (r *aspirationNeedRepository) UpdateCommunityNeed(ctx context.Context, need *domain.CommunityNeed) error {
	need.UpdatedAt = time.Now()
	if r.db == nil {
		return nil
	}

	query := `
		UPDATE community_needs
		SET title = $1, description = $2, estimated_cost = $3, status = $4, progress_notes = $5, updated_at = $6
		WHERE id = $7 AND tenant_id = $8
	`
	res, err := r.db.ExecContext(ctx, query,
		need.Title, need.Description, need.EstimatedCost, need.Status, need.ProgressNotes, need.UpdatedAt, need.ID, need.TenantID,
	)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err == nil && rows == 0 {
		return errors.New("community need not found")
	}
	return nil
}

func (r *aspirationNeedRepository) CreateEventSponsor(ctx context.Context, sponsor *domain.EventSponsor) error {
	if sponsor.ID == uuid.Nil {
		sponsor.ID = uuid.New()
	}
	now := time.Now()
	sponsor.CreatedAt = now
	sponsor.UpdatedAt = now

	if r.db == nil {
		return nil
	}

	query := `
		INSERT INTO event_sponsors (id, event_id, name, amount, type, notes, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.db.ExecContext(ctx, query,
		sponsor.ID, sponsor.EventID, sponsor.Name, sponsor.Amount, sponsor.Type, sponsor.Notes, sponsor.CreatedAt, sponsor.UpdatedAt,
	)
	return err
}

func (r *aspirationNeedRepository) ListEventSponsorsByEventID(ctx context.Context, tenantID, eventID uuid.UUID) ([]*domain.EventSponsor, error) {
	if r.db == nil {
		return []*domain.EventSponsor{}, nil
	}

	query := `
		SELECT es.id, es.event_id, es.name, es.amount, es.type, es.notes, es.created_at, es.updated_at
		FROM event_sponsors es
		JOIN events e ON es.event_id = e.id
		WHERE es.event_id = $1 AND e.tenant_id = $2
		ORDER BY es.created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, eventID, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []*domain.EventSponsor{}
	for rows.Next() {
		sponsor := &domain.EventSponsor{}
		if err := rows.Scan(&sponsor.ID, &sponsor.EventID, &sponsor.Name, &sponsor.Amount, &sponsor.Type, &sponsor.Notes, &sponsor.CreatedAt, &sponsor.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, sponsor)
	}

	return list, nil
}

func (r *aspirationNeedRepository) DeleteEventSponsor(ctx context.Context, tenantID, sponsorID uuid.UUID) error {
	if r.db == nil {
		return nil
	}

	query := `
		DELETE FROM event_sponsors
		WHERE id = $1 AND event_id IN (SELECT id FROM events WHERE tenant_id = $2)
	`
	res, err := r.db.ExecContext(ctx, query, sponsorID, tenantID)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err == nil && rows == 0 {
		return errors.New("event sponsor not found")
	}
	return nil
}
