package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	"backend/internal/domain"

	"github.com/google/uuid"
)

type socialRepository struct {
	db *sql.DB
}

func NewSocialRepository(db *sql.DB) domain.SocialRepository {
	return &socialRepository{db: db}
}

var validReactions = map[string]bool{"support": true, "like": true, "applause": true}


// ---------- Reactions ----------

func (r *socialRepository) SetReaction(ctx context.Context, rx *domain.Reaction) error {
	query := fmt.Sprintf(`
		INSERT INTO %s (target_type, target_id, user_id, reaction)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (target_type, target_id, user_id)
		DO UPDATE SET reaction = EXCLUDED.reaction, created_at = NOW()
	`, TenantTable(ctx, "reactions"))
	_, err := r.db.ExecContext(ctx, query, rx.TargetType, rx.TargetID, rx.UserID, rx.Reaction)
	return err
}

func (r *socialRepository) RemoveReaction(ctx context.Context, targetType string, targetID, userID uuid.UUID) error {
	query := fmt.Sprintf(`DELETE FROM %s WHERE target_type = $1 AND target_id = $2 AND user_id = $3`, TenantTable(ctx, "reactions"))
	_, err := r.db.ExecContext(ctx, query, targetType, targetID, userID)
	return err
}

func (r *socialRepository) ReactionSummary(ctx context.Context, targetType string, targetID, userID uuid.UUID) (*domain.ReactionSummary, error) {
	countQuery := fmt.Sprintf(`
		SELECT reaction, COUNT(*) FROM %s WHERE target_type = $1 AND target_id = $2 GROUP BY reaction
	`, TenantTable(ctx, "reactions"))
	rows, err := r.db.QueryContext(ctx, countQuery, targetType, targetID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	summary := &domain.ReactionSummary{Counts: map[string]int64{}}
	for rows.Next() {
		var name string
		var n int64
		if err := rows.Scan(&name, &n); err != nil {
			return nil, err
		}
		summary.Counts[name] = n
		summary.Total += n
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	mineQuery := fmt.Sprintf(`
		SELECT reaction FROM %s WHERE target_type = $1 AND target_id = $2 AND user_id = $3 LIMIT 1
	`, TenantTable(ctx, "reactions"))
	var mine string
	switch err := r.db.QueryRowContext(ctx, mineQuery, targetType, targetID, userID).Scan(&mine); {
	case err == nil:
		summary.Mine = &mine
	case errors.Is(err, sql.ErrNoRows):
		// belum bereaksi — biarkan Mine nil
	default:
		return nil, err
	}
	return summary, nil
}

// ---------- Polls ----------

func (r *socialRepository) CreatePoll(ctx context.Context, p *domain.Poll) error {
	if len(p.Options) < 2 || len(p.Options) > 6 {
		return errors.New("poll requires 2..6 options")
	}
	opts, err := json.Marshal(p.Options)
	if err != nil {
		return err
	}
	query := fmt.Sprintf(`
		INSERT INTO %s (question, options, created_by)
		VALUES ($1, $2, $3)
		RETURNING id, created_at
	`, TenantTable(ctx, "polls"))
	return r.db.QueryRowContext(ctx, query, p.Question, opts, p.CreatedBy).Scan(&p.ID, &p.CreatedAt)
}

func scanPollRow(scan func(dest ...interface{}) error) (*domain.Poll, error) {
	var p domain.Poll
	var optsRaw []byte
	var closedAt sql.NullTime
	if err := scan(&p.ID, &p.Question, &optsRaw, &p.Status, &p.CreatedBy, &p.CreatedAt, &closedAt); err != nil {
		return nil, err
	}
	if closedAt.Valid {
		t := closedAt.Time
		p.ClosedAt = &t
	}
	if err := json.Unmarshal(optsRaw, &p.Options); err != nil {
		return nil, err
	}
	return &p, nil
}

const pollCols = `id, question, options, status, created_by, created_at, closed_at`

func (r *socialRepository) getPollRow(ctx context.Context, id uuid.UUID) (*domain.Poll, error) {
	query := fmt.Sprintf(`SELECT %s FROM %s WHERE id = $1`, pollCols, TenantTable(ctx, "polls"))
	poll, err := scanPollRow(r.db.QueryRowContext(ctx, query, id).Scan)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return poll, nil
}

func (r *socialRepository) GetPoll(ctx context.Context, id, viewerID uuid.UUID, includeViewer bool) (*domain.Poll, error) {
	poll, err := r.getPollRow(ctx, id)
	if err != nil {
		return nil, err
	}
	if err := r.attachResults(ctx, poll, viewerID, includeViewer); err != nil {
		return nil, err
	}
	return poll, nil
}

func (r *socialRepository) ListOpenPolls(ctx context.Context, viewerID uuid.UUID, includeViewer bool) ([]*domain.Poll, error) {
	query := fmt.Sprintf(`SELECT %s FROM %s WHERE status = 'open' ORDER BY created_at DESC LIMIT 10`, pollCols, TenantTable(ctx, "polls"))
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var polls []*domain.Poll
	for rows.Next() {
		poll, err := scanPollRow(rows.Scan)
		if err != nil {
			return nil, err
		}
		polls = append(polls, poll)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	for _, p := range polls {
		if err := r.attachResults(ctx, p, viewerID, includeViewer); err != nil {
			return nil, err
		}
	}
	return polls, nil
}

// attachResults mengisi hasil AGREGAT + suara viewer sendiri (tidak pernah
// mengekspos identitas voter lain).
func (r *socialRepository) attachResults(ctx context.Context, p *domain.Poll, viewerID uuid.UUID, includeViewer bool) error {
	votesTable := TenantTable(ctx, "poll_votes")

	countQuery := fmt.Sprintf(`SELECT option_index, COUNT(*) FROM %s WHERE poll_id = $1 GROUP BY option_index`, votesTable)
	rows, err := r.db.QueryContext(ctx, countQuery, p.ID)
	if err != nil {
		return err
	}
	defer rows.Close()

	p.Votes = make([]int64, len(p.Options))
	for rows.Next() {
		var idx int
		var n int64
		if err := rows.Scan(&idx, &n); err != nil {
			return err
		}
		if idx >= 0 && idx < len(p.Votes) {
			p.Votes[idx] = n
			p.Total += n
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}

	if includeViewer {
		var idx int
		mineQuery := fmt.Sprintf(`SELECT option_index FROM %s WHERE poll_id = $1 AND user_id = $2`, votesTable)
		switch err := r.db.QueryRowContext(ctx, mineQuery, p.ID, viewerID).Scan(&idx); {
		case err == nil:
			p.MyVote = &idx
		case errors.Is(err, sql.ErrNoRows):
			// belum memilih
		default:
			return err
		}
	}
	return nil
}

func (r *socialRepository) VotePoll(ctx context.Context, pollID, userID uuid.UUID, optionIndex int) error {
	poll, err := r.getPollRow(ctx, pollID)
	if err != nil {
		return err
	}
	if poll.Status != "open" {
		return errors.New("poll is closed")
	}
	if optionIndex < 0 || optionIndex >= len(poll.Options) {
		return errors.New("option_index out of range")
	}
	query := fmt.Sprintf(`
		INSERT INTO %s (poll_id, user_id, option_index)
		VALUES ($1, $2, $3)
		ON CONFLICT (poll_id, user_id) DO UPDATE SET option_index = EXCLUDED.option_index
	`, TenantTable(ctx, "poll_votes"))
	_, err = r.db.ExecContext(ctx, query, pollID, userID, optionIndex)
	return err
}

func (r *socialRepository) ClosePoll(ctx context.Context, id uuid.UUID) error {
	query := fmt.Sprintf(`UPDATE %s SET status = 'closed', closed_at = NOW() WHERE id = $1`, TenantTable(ctx, "polls"))
	res, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

