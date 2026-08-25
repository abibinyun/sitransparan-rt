package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"backend/internal/domain"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type pushRepository struct {
	db *sql.DB
}

func NewPushRepository(db *sql.DB) domain.PushRepository {
	return &pushRepository{db: db}
}

// quoteSchema membungkus nama schema tenant dengan aman.
func quoteSchema(schema string) string {
	return pq.QuoteIdentifier(schema)
}

func (r *pushRepository) Upsert(ctx context.Context, sub *domain.PushSubscription) error {
	query := `
		INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (endpoint) DO UPDATE
		SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, user_agent = EXCLUDED.user_agent
		RETURNING id, created_at
	`
	return r.db.QueryRowContext(ctx, query, sub.UserID, sub.Endpoint, sub.P256DH, sub.Auth, sub.UserAgent).
		Scan(&sub.ID, &sub.CreatedAt)
}

func (r *pushRepository) Delete(ctx context.Context, endpoint string, userID uuid.UUID) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2`, endpoint, userID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *pushRepository) DeleteByEndpoint(ctx context.Context, endpoint string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM push_subscriptions WHERE endpoint = $1`, endpoint)
	return err
}

func (r *pushRepository) ListByUser(ctx context.Context, userID uuid.UUID) ([]*domain.PushSubscription, error) {
	return r.list(ctx, `SELECT id, user_id, endpoint, p256dh, auth, COALESCE(user_agent, ''), created_at FROM push_subscriptions WHERE user_id = $1`, userID)
}

// ListByTenant mengembalikan langganan semua user yang ter-mapping aktif
// ke tenant tertentu (broadcast pengumuman).
func (r *pushRepository) ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]*domain.PushSubscription, error) {
	query := `
		SELECT ps.id, ps.user_id, ps.endpoint, ps.p256dh, ps.auth, COALESCE(ps.user_agent, ''), ps.created_at
		FROM push_subscriptions ps
		JOIN tenant_users tu ON tu.user_id = ps.user_id AND tu.tenant_id = $1 AND tu.status = 'active'
	`
	return r.list(ctx, query, tenantID)
}

func (r *pushRepository) list(ctx context.Context, query string, args ...interface{}) ([]*domain.PushSubscription, error) {
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*domain.PushSubscription
	for rows.Next() {
		s := &domain.PushSubscription{}
		if err := rows.Scan(&s.ID, &s.UserID, &s.Endpoint, &s.P256DH, &s.Auth, &s.UserAgent, &s.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r *pushRepository) CountReactionsGiven(ctx context.Context, userID uuid.UUID) (int64, error) {
	var count int64
	// Reaksi tersebar di schema tenant; hitung dari semua schema yang memuat user.
	rows, err := r.db.QueryContext(ctx, `
		SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'
	`)
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	var schemas []string
	for rows.Next() {
		var s string
		if err := rows.Scan(&s); err != nil {
			return 0, err
		}
		schemas = append(schemas, s)
	}
	if err := rows.Err(); err != nil {
		return 0, err
	}
	for _, s := range schemas {
		q := fmt.Sprintf(`SELECT COUNT(*) FROM %s.reactions WHERE user_id = $1`, quoteSchema(s))
		var c int64
		if err := r.db.QueryRowContext(ctx, q, userID).Scan(&c); err != nil && !errors.Is(err, sql.ErrNoRows) {
			continue // schema tanpa tabel reactions (belum dimigrasi) — abaikan
		}
		count += c
	}
	return count, nil
}

func (r *pushRepository) CountVotesCast(ctx context.Context, userID uuid.UUID) (int64, error) {
	var count int64
	rows, err := r.db.QueryContext(ctx, `
		SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'
	`)
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	var schemas []string
	for rows.Next() {
		var s string
		if err := rows.Scan(&s); err != nil {
			return 0, err
		}
		schemas = append(schemas, s)
	}
	if err := rows.Err(); err != nil {
		return 0, err
	}
	for _, s := range schemas {
		q := fmt.Sprintf(`SELECT COUNT(*) FROM %s.poll_votes WHERE user_id = $1`, quoteSchema(s))
		var c int64
		if err := r.db.QueryRowContext(ctx, q, userID).Scan(&c); err != nil {
			continue
		}
		count += c
	}
	return count, nil
}
