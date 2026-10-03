package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"backend/internal/domain"
)

type postgresNotificationRepository struct {
	db *sql.DB
}

func NewNotificationRepository(db *sql.DB) domain.NotificationRepository {
	return &postgresNotificationRepository{db: db}
}

func (r *postgresNotificationRepository) Create(ctx context.Context, n *domain.Notification) error {
	table := TenantTable(ctx, "notifications")
	query := fmt.Sprintf(`
		INSERT INTO %s (id, user_id, title, body, category, action_url, is_read, metadata, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`, table)

	_, err := r.db.ExecContext(ctx, query,
		n.ID,
		n.UserID,
		n.Title,
		n.Body,
		n.Category,
		n.ActionURL,
		n.IsRead,
		n.Metadata,
		n.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to create notification: %w", err)
	}
	return nil
}

func (r *postgresNotificationRepository) ListByUser(ctx context.Context, userID uuid.UUID, unreadOnly bool, limit, offset int) ([]*domain.Notification, int64, error) {
	table := TenantTable(ctx, "notifications")
	queryWhere := "WHERE (user_id = $1 OR user_id IS NULL)"
	if unreadOnly {
		queryWhere += " AND is_read = false"
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM %s %s", table, queryWhere)
	var total int64
	if err := r.db.QueryRowContext(ctx, countQuery, userID).Scan(&total); err != nil {
		return nil, 0, err
	}

	selectQuery := fmt.Sprintf(`
		SELECT id, user_id, title, body, category, action_url, is_read, read_at, metadata, created_at
		FROM %s
		%s
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`, table, queryWhere)

	rows, err := r.db.QueryContext(ctx, selectQuery, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var list []*domain.Notification
	for rows.Next() {
		var n domain.Notification
		if err := rows.Scan(
			&n.ID,
			&n.UserID,
			&n.Title,
			&n.Body,
			&n.Category,
			&n.ActionURL,
			&n.IsRead,
			&n.ReadAt,
			&n.Metadata,
			&n.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		list = append(list, &n)
	}

	return list, total, nil
}

func (r *postgresNotificationRepository) MarkAsRead(ctx context.Context, id, userID uuid.UUID) error {
	table := TenantTable(ctx, "notifications")
	query := fmt.Sprintf(`
		UPDATE %s
		SET is_read = true, read_at = NOW()
		WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)
	`, table)

	_, err := r.db.ExecContext(ctx, query, id, userID)
	return err
}

func (r *postgresNotificationRepository) MarkAllAsRead(ctx context.Context, userID uuid.UUID) error {
	table := TenantTable(ctx, "notifications")
	query := fmt.Sprintf(`
		UPDATE %s
		SET is_read = true, read_at = NOW()
		WHERE (user_id = $1 OR user_id IS NULL) AND is_read = false
	`, table)

	_, err := r.db.ExecContext(ctx, query, userID)
	return err
}

func (r *postgresNotificationRepository) GetUnreadCount(ctx context.Context, userID uuid.UUID) (int64, error) {
	table := TenantTable(ctx, "notifications")
	query := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM %s
		WHERE (user_id = $1 OR user_id IS NULL) AND is_read = false
	`, table)

	var count int64
	err := r.db.QueryRowContext(ctx, query, userID).Scan(&count)
	return count, err
}

// Memory implementation untuk unit testing terisolasi
type memoryNotificationRepository struct {
	notifications map[uuid.UUID]*domain.Notification
}

func NewMemoryNotificationRepository() domain.NotificationRepository {
	return &memoryNotificationRepository{
		notifications: make(map[uuid.UUID]*domain.Notification),
	}
}

func (m *memoryNotificationRepository) Create(ctx context.Context, n *domain.Notification) error {
	m.notifications[n.ID] = n
	return nil
}

func (m *memoryNotificationRepository) ListByUser(ctx context.Context, userID uuid.UUID, unreadOnly bool, limit, offset int) ([]*domain.Notification, int64, error) {
	var list []*domain.Notification
	for _, n := range m.notifications {
		if n.UserID != nil && *n.UserID != userID {
			continue
		}
		if unreadOnly && n.IsRead {
			continue
		}
		list = append(list, n)
	}
	return list, int64(len(list)), nil
}

func (m *memoryNotificationRepository) MarkAsRead(ctx context.Context, id, userID uuid.UUID) error {
	if n, ok := m.notifications[id]; ok {
		now := time.Now()
		n.IsRead = true
		n.ReadAt = &now
	}
	return nil
}

func (m *memoryNotificationRepository) MarkAllAsRead(ctx context.Context, userID uuid.UUID) error {
	now := time.Now()
	for _, n := range m.notifications {
		if n.UserID == nil || *n.UserID == userID {
			n.IsRead = true
			n.ReadAt = &now
		}
	}
	return nil
}

func (m *memoryNotificationRepository) GetUnreadCount(ctx context.Context, userID uuid.UUID) (int64, error) {
	var count int64
	for _, n := range m.notifications {
		if (n.UserID == nil || *n.UserID == userID) && !n.IsRead {
			count++
		}
	}
	return count, nil
}
