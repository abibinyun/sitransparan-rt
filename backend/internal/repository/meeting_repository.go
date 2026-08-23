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

type meetingRepository struct {
	db *sql.DB
}

func NewMeetingRepository(db *sql.DB) domain.MeetingRepository {
	return &meetingRepository{db: db}
}

func (r *meetingRepository) Create(ctx context.Context, m *domain.Meeting) error {
	table := TenantTable(ctx, "meetings")
	query := fmt.Sprintf(`
		INSERT INTO %s (title, agenda, meeting_date, location, meeting_type, visibility, status, notes, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
		RETURNING id, created_at, updated_at
	`, table)

	return r.db.QueryRowContext(ctx, query,
		m.Title,
		m.Agenda,
		m.MeetingDate,
		m.Location,
		m.MeetingType,
		m.Visibility,
		m.Status,
		m.Notes,
		m.CreatedBy,
	).Scan(&m.ID, &m.CreatedAt, &m.UpdatedAt)
}

func (r *meetingRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Meeting, error) {
	table := TenantTable(ctx, "meetings")
	query := fmt.Sprintf(`
		SELECT id, title, agenda, meeting_date, location, meeting_type, visibility, status, notes, created_by, created_at, updated_at
		FROM %s
		WHERE id = $1
	`, table)

	var m domain.Meeting
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&m.ID,
		&m.Title,
		&m.Agenda,
		&m.MeetingDate,
		&m.Location,
		&m.MeetingType,
		&m.Visibility,
		&m.Status,
		&m.Notes,
		&m.CreatedBy,
		&m.CreatedAt,
		&m.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	// Fetch Attendees
	attTable := TenantTable(ctx, "meeting_attendees")
	attQuery := fmt.Sprintf(`
		SELECT id, meeting_id, resident_id, name, role_or_title, attended, notes, created_at
		FROM %s WHERE meeting_id = $1 ORDER BY created_at ASC
	`, attTable)
	attRows, err := r.db.QueryContext(ctx, attQuery, id)
	if err == nil {
		defer attRows.Close()
		for attRows.Next() {
			var a domain.MeetingAttendee
			if err := attRows.Scan(&a.ID, &a.MeetingID, &a.ResidentID, &a.Name, &a.RoleOrTitle, &a.Attended, &a.Notes, &a.CreatedAt); err == nil {
				m.Attendees = append(m.Attendees, a)
			}
		}
	}

	// Fetch Decisions
	decTable := TenantTable(ctx, "meeting_decisions")
	decQuery := fmt.Sprintf(`
		SELECT id, meeting_id, decision_text, category, created_at
		FROM %s WHERE meeting_id = $1 ORDER BY created_at ASC
	`, decTable)
	decRows, err := r.db.QueryContext(ctx, decQuery, id)
	if err == nil {
		defer decRows.Close()
		for decRows.Next() {
			var d domain.MeetingDecision
			if err := decRows.Scan(&d.ID, &d.MeetingID, &d.DecisionText, &d.Category, &d.CreatedAt); err == nil {
				m.Decisions = append(m.Decisions, d)
			}
		}
	}

	// Fetch Action Items
	actTable := TenantTable(ctx, "meeting_action_items")
	actQuery := fmt.Sprintf(`
		SELECT id, meeting_id, task, assignee_name, assignee_resident_id, due_date::text, status, notes, created_at, updated_at
		FROM %s WHERE meeting_id = $1 ORDER BY created_at ASC
	`, actTable)
	actRows, err := r.db.QueryContext(ctx, actQuery, id)
	if err == nil {
		defer actRows.Close()
		for actRows.Next() {
			var item domain.MeetingActionItem
			if err := actRows.Scan(&item.ID, &item.MeetingID, &item.Task, &item.AssigneeName, &item.AssigneeResidentID, &item.DueDate, &item.Status, &item.Notes, &item.CreatedAt, &item.UpdatedAt); err == nil {
				m.ActionItems = append(m.ActionItems, item)
			}
		}
	}

	return &m, nil
}

func (r *meetingRepository) List(ctx context.Context, visibility string) ([]domain.Meeting, error) {
	table := TenantTable(ctx, "meetings")
	var query string
	var args []interface{}

	if visibility != "" {
		query = fmt.Sprintf(`
			SELECT id, title, agenda, meeting_date, location, meeting_type, visibility, status, notes, created_by, created_at, updated_at
			FROM %s WHERE visibility = $1 ORDER BY meeting_date DESC
		`, table)
		args = append(args, visibility)
	} else {
		query = fmt.Sprintf(`
			SELECT id, title, agenda, meeting_date, location, meeting_type, visibility, status, notes, created_by, created_at, updated_at
			FROM %s ORDER BY meeting_date DESC
		`, table)
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var meetings []domain.Meeting
	for rows.Next() {
		var m domain.Meeting
		err := rows.Scan(
			&m.ID,
			&m.Title,
			&m.Agenda,
			&m.MeetingDate,
			&m.Location,
			&m.MeetingType,
			&m.Visibility,
			&m.Status,
			&m.Notes,
			&m.CreatedBy,
			&m.CreatedAt,
			&m.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		// Attendees
		attTable := TenantTable(ctx, "meeting_attendees")
		attQuery := fmt.Sprintf(`SELECT id, meeting_id, resident_id, name, role_or_title, attended, notes, created_at FROM %s WHERE meeting_id = $1 ORDER BY created_at ASC`, attTable)
		if attRows, err := r.db.QueryContext(ctx, attQuery, m.ID); err == nil {
			for attRows.Next() {
				var a domain.MeetingAttendee
				if err := attRows.Scan(&a.ID, &a.MeetingID, &a.ResidentID, &a.Name, &a.RoleOrTitle, &a.Attended, &a.Notes, &a.CreatedAt); err == nil {
					m.Attendees = append(m.Attendees, a)
				}
			}
			attRows.Close()
		}

		// Decisions
		decTable := TenantTable(ctx, "meeting_decisions")
		decQuery := fmt.Sprintf(`SELECT id, meeting_id, decision_text, category, created_at FROM %s WHERE meeting_id = $1 ORDER BY created_at ASC`, decTable)
		if decRows, err := r.db.QueryContext(ctx, decQuery, m.ID); err == nil {
			for decRows.Next() {
				var d domain.MeetingDecision
				if err := decRows.Scan(&d.ID, &d.MeetingID, &d.DecisionText, &d.Category, &d.CreatedAt); err == nil {
					m.Decisions = append(m.Decisions, d)
				}
			}
			decRows.Close()
		}

		meetings = append(meetings, m)
	}
	return meetings, nil
}

func (r *meetingRepository) Update(ctx context.Context, m *domain.Meeting) error {
	table := TenantTable(ctx, "meetings")
	query := fmt.Sprintf(`
		UPDATE %s
		SET title = $1, agenda = $2, meeting_date = $3, location = $4, meeting_type = $5, visibility = $6, status = $7, notes = $8, updated_at = NOW()
		WHERE id = $9
		RETURNING updated_at
	`, table)

	res, err := r.db.ExecContext(ctx, query,
		m.Title,
		m.Agenda,
		m.MeetingDate,
		m.Location,
		m.MeetingType,
		m.Visibility,
		m.Status,
		m.Notes,
		m.ID,
	)
	if err != nil {
		return err
	}
	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *meetingRepository) Delete(ctx context.Context, id uuid.UUID) error {
	table := TenantTable(ctx, "meetings")
	query := fmt.Sprintf(`DELETE FROM %s WHERE id = $1`, table)
	res, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}
	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

// Attendees
func (r *meetingRepository) AddAttendee(ctx context.Context, a *domain.MeetingAttendee) error {
	table := TenantTable(ctx, "meeting_attendees")
	query := fmt.Sprintf(`
		INSERT INTO %s (meeting_id, resident_id, name, role_or_title, attended, notes, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
		RETURNING id, created_at
	`, table)
	return r.db.QueryRowContext(ctx, query,
		a.MeetingID,
		a.ResidentID,
		a.Name,
		a.RoleOrTitle,
		a.Attended,
		a.Notes,
	).Scan(&a.ID, &a.CreatedAt)
}

func (r *meetingRepository) DeleteAttendee(ctx context.Context, id uuid.UUID) error {
	table := TenantTable(ctx, "meeting_attendees")
	query := fmt.Sprintf(`DELETE FROM %s WHERE id = $1`, table)
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

// Decisions
func (r *meetingRepository) AddDecision(ctx context.Context, d *domain.MeetingDecision) error {
	table := TenantTable(ctx, "meeting_decisions")
	query := fmt.Sprintf(`
		INSERT INTO %s (meeting_id, decision_text, category, created_at)
		VALUES ($1, $2, $3, NOW())
		RETURNING id, created_at
	`, table)
	return r.db.QueryRowContext(ctx, query,
		d.MeetingID,
		d.DecisionText,
		d.Category,
	).Scan(&d.ID, &d.CreatedAt)
}

func (r *meetingRepository) DeleteDecision(ctx context.Context, id uuid.UUID) error {
	table := TenantTable(ctx, "meeting_decisions")
	query := fmt.Sprintf(`DELETE FROM %s WHERE id = $1`, table)
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

// Action Items
func (r *meetingRepository) CreateActionItem(ctx context.Context, item *domain.MeetingActionItem) error {
	table := TenantTable(ctx, "meeting_action_items")
	var parsedDate *time.Time
	if item.DueDate != nil && strings.TrimSpace(*item.DueDate) != "" {
		if t, err := time.Parse("2006-01-02", strings.TrimSpace(*item.DueDate)); err == nil {
			parsedDate = &t
		}
	}

	query := fmt.Sprintf(`
		INSERT INTO %s (meeting_id, task, assignee_name, assignee_resident_id, due_date, status, notes, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
		RETURNING id, created_at, updated_at
	`, table)
	return r.db.QueryRowContext(ctx, query,
		item.MeetingID,
		item.Task,
		item.AssigneeName,
		item.AssigneeResidentID,
		parsedDate,
		item.Status,
		item.Notes,
	).Scan(&item.ID, &item.CreatedAt, &item.UpdatedAt)
}

func (r *meetingRepository) UpdateActionItem(ctx context.Context, item *domain.MeetingActionItem) error {
	table := TenantTable(ctx, "meeting_action_items")
	var parsedDate *time.Time
	if item.DueDate != nil && strings.TrimSpace(*item.DueDate) != "" {
		if t, err := time.Parse("2006-01-02", strings.TrimSpace(*item.DueDate)); err == nil {
			parsedDate = &t
		}
	}

	query := fmt.Sprintf(`
		UPDATE %s
		SET 
			task = COALESCE(NULLIF($1, ''), task),
			assignee_name = COALESCE(NULLIF($2, ''), assignee_name),
			assignee_resident_id = COALESCE($3, assignee_resident_id),
			due_date = COALESCE($4, due_date),
			status = COALESCE(NULLIF($5, ''), status),
			notes = COALESCE($6, notes),
			updated_at = NOW()
		WHERE id = $7
	`, table)
	res, err := r.db.ExecContext(ctx, query,
		item.Task,
		item.AssigneeName,
		item.AssigneeResidentID,
		parsedDate,
		item.Status,
		item.Notes,
		item.ID,
	)
	if err != nil {
		return err
	}
	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *meetingRepository) DeleteActionItem(ctx context.Context, id uuid.UUID) error {
	table := TenantTable(ctx, "meeting_action_items")
	query := fmt.Sprintf(`DELETE FROM %s WHERE id = $1`, table)
	res, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}
	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *meetingRepository) ListActionItems(ctx context.Context, status string, onlyPublic bool) ([]domain.MeetingActionItem, error) {
	table := TenantTable(ctx, "meeting_action_items")
	meetings := TenantTable(ctx, "meetings")
	var query string
	var args []interface{}

	visibilityFilter := ""
	if onlyPublic {
		// Non-admin viewers may only see action items that belong to
		// public meetings (confidential/internal meeting tasks stay hidden).
		visibilityFilter = " AND m.visibility = 'public'"
	}

	switch {
	case status != "" && onlyPublic:
		query = fmt.Sprintf(`
			SELECT ai.id, ai.meeting_id, ai.task, ai.assignee_name, ai.assignee_resident_id, ai.due_date::text, ai.status, ai.notes, ai.created_at, ai.updated_at
			FROM %s ai JOIN %s m ON m.id = ai.meeting_id
			WHERE ai.status = $1%s ORDER BY ai.created_at DESC
		`, table, meetings, visibilityFilter)
		args = append(args, status)
	case status != "":
		query = fmt.Sprintf(`
			SELECT id, meeting_id, task, assignee_name, assignee_resident_id, due_date::text, status, notes, created_at, updated_at
			FROM %s WHERE status = $1 ORDER BY created_at DESC
		`, table)
		args = append(args, status)
	case onlyPublic:
		query = fmt.Sprintf(`
			SELECT ai.id, ai.meeting_id, ai.task, ai.assignee_name, ai.assignee_resident_id, ai.due_date::text, ai.status, ai.notes, ai.created_at, ai.updated_at
			FROM %s ai JOIN %s m ON m.id = ai.meeting_id
			WHERE m.visibility = 'public' ORDER BY ai.created_at DESC
		`, table, meetings)
	default:
		query = fmt.Sprintf(`
			SELECT id, meeting_id, task, assignee_name, assignee_resident_id, due_date::text, status, notes, created_at, updated_at
			FROM %s ORDER BY created_at DESC
		`, table)
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.MeetingActionItem
	for rows.Next() {
		var item domain.MeetingActionItem
		err := rows.Scan(
			&item.ID,
			&item.MeetingID,
			&item.Task,
			&item.AssigneeName,
			&item.AssigneeResidentID,
			&item.DueDate,
			&item.Status,
			&item.Notes,
			&item.CreatedAt,
			&item.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}
