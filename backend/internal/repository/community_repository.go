package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"backend/internal/domain"
)

type postgresCommunityRepository struct {
	db *sql.DB
}

func NewCommunityRepository(db *sql.DB) domain.CommunityRepository {
	return &postgresCommunityRepository{db: db}
}

func (r *postgresCommunityRepository) CreatePost(ctx context.Context, p *domain.CommunityPost) error {
	table := TenantTable(ctx, "community_posts")
	query := fmt.Sprintf(`
		INSERT INTO %s (id, user_id, resident_id, house_id, author_name, house_number, post_type, category, title, content, price, contact_phone, media_urls, is_solved, is_anonymous, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
	`, table)

	_, err := r.db.ExecContext(ctx, query,
		p.ID, p.UserID, p.ResidentID, p.HouseID, p.AuthorName, p.HouseNumber,
		p.PostType, p.Category, p.Title, p.Content, p.Price, p.ContactPhone,
		pq.Array(p.MediaURLs), p.IsSolved, p.IsAnonymous, p.CreatedAt, p.UpdatedAt,
	)
	return err
}

func (r *postgresCommunityRepository) GetPostByID(ctx context.Context, id uuid.UUID) (*domain.CommunityPost, error) {
	table := TenantTable(ctx, "community_posts")
	query := fmt.Sprintf(`
		SELECT id, user_id, resident_id, house_id, author_name, house_number, post_type, category, title, content, price, contact_phone, media_urls, is_solved, solved_by_user_id, is_anonymous, created_at, updated_at, deleted_at
		FROM %s WHERE id = $1 AND deleted_at IS NULL
	`, table)

	var p domain.CommunityPost
	var mediaUrls []string
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&p.ID, &p.UserID, &p.ResidentID, &p.HouseID, &p.AuthorName, &p.HouseNumber,
		&p.PostType, &p.Category, &p.Title, &p.Content, &p.Price, &p.ContactPhone,
		pq.Array(&mediaUrls), &p.IsSolved, &p.SolvedByUserID, &p.IsAnonymous,
		&p.CreatedAt, &p.UpdatedAt, &p.DeletedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	p.MediaURLs = mediaUrls
	return &p, nil
}

func (r *postgresCommunityRepository) ListPosts(ctx context.Context, postType, category string, limit, offset int) ([]*domain.CommunityPost, int64, error) {
	table := TenantTable(ctx, "community_posts")
	queryWhere := "WHERE deleted_at IS NULL"
	args := []interface{}{}
	argIdx := 1

	if postType != "" && postType != "all" {
		queryWhere += fmt.Sprintf(" AND post_type = $%d", argIdx)
		args = append(args, postType)
		argIdx++
	}
	if category != "" && category != "all" {
		queryWhere += fmt.Sprintf(" AND category = $%d", argIdx)
		args = append(args, category)
		argIdx++
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM %s %s", table, queryWhere)
	var total int64
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	selectQuery := fmt.Sprintf(`
		SELECT id, user_id, resident_id, house_id, author_name, house_number, post_type, category, title, content, price, contact_phone, media_urls, is_solved, solved_by_user_id, is_anonymous, created_at, updated_at, deleted_at
		FROM %s %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d
	`, table, queryWhere, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, selectQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var list []*domain.CommunityPost
	for rows.Next() {
		var p domain.CommunityPost
		var mediaUrls []string
		if err := rows.Scan(
			&p.ID, &p.UserID, &p.ResidentID, &p.HouseID, &p.AuthorName, &p.HouseNumber,
			&p.PostType, &p.Category, &p.Title, &p.Content, &p.Price, &p.ContactPhone,
			pq.Array(&mediaUrls), &p.IsSolved, &p.SolvedByUserID, &p.IsAnonymous,
			&p.CreatedAt, &p.UpdatedAt, &p.DeletedAt,
		); err != nil {
			return nil, 0, err
		}
		p.MediaURLs = mediaUrls
		list = append(list, &p)
	}

	return list, total, nil
}

func (r *postgresCommunityRepository) MarkPostSolved(ctx context.Context, postID, helperUserID uuid.UUID) error {
	table := TenantTable(ctx, "community_posts")
	query := fmt.Sprintf(`
		UPDATE %s SET is_solved = true, solved_by_user_id = $2, updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
	`, table)
	_, err := r.db.ExecContext(ctx, query, postID, helperUserID)
	return err
}

func (r *postgresCommunityRepository) DeletePost(ctx context.Context, id, userID uuid.UUID) error {
	table := TenantTable(ctx, "community_posts")
	query := fmt.Sprintf("UPDATE %s SET deleted_at = NOW() WHERE id = $1", table)
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *postgresCommunityRepository) CreateComment(ctx context.Context, c *domain.CommunityComment) error {
	table := TenantTable(ctx, "community_comments")
	query := fmt.Sprintf(`
		INSERT INTO %s (id, post_id, parent_comment_id, user_id, author_name, content, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, table)
	_, err := r.db.ExecContext(ctx, query,
		c.ID, c.PostID, c.ParentCommentID, c.UserID, c.AuthorName, c.Content, c.CreatedAt,
	)
	return err
}

func (r *postgresCommunityRepository) ListCommentsByPost(ctx context.Context, postID uuid.UUID) ([]*domain.CommunityComment, error) {
	table := TenantTable(ctx, "community_comments")
	query := fmt.Sprintf(`
		SELECT id, post_id, parent_comment_id, user_id, author_name, content, created_at, deleted_at
		FROM %s WHERE post_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC
	`, table)

	rows, err := r.db.QueryContext(ctx, query, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.CommunityComment
	for rows.Next() {
		var c domain.CommunityComment
		if err := rows.Scan(
			&c.ID, &c.PostID, &c.ParentCommentID, &c.UserID, &c.AuthorName, &c.Content, &c.CreatedAt, &c.DeletedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, &c)
	}
	return list, nil
}

func (r *postgresCommunityRepository) DeleteComment(ctx context.Context, id, userID uuid.UUID) error {
	table := TenantTable(ctx, "community_comments")
	query := fmt.Sprintf("UPDATE %s SET deleted_at = NOW() WHERE id = $1", table)
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *postgresCommunityRepository) ToggleReaction(ctx context.Context, postID, userID uuid.UUID, reactionType string) error {
	table := TenantTable(ctx, "community_reactions")
	// Jika sudah ada, hapus (toggle off), jika belum ada, simpan (toggle on)
	deleteQuery := fmt.Sprintf("DELETE FROM %s WHERE post_id = $1 AND user_id = $2 AND reaction_type = $3", table)
	res, err := r.db.ExecContext(ctx, deleteQuery, postID, userID, reactionType)
	if err != nil {
		return err
	}
	affected, _ := res.RowsAffected()
	if affected > 0 {
		return nil
	}

	insertQuery := fmt.Sprintf(`
		INSERT INTO %s (id, post_id, user_id, reaction_type, created_at)
		VALUES (gen_random_uuid(), $1, $2, $3, NOW())
		ON CONFLICT (post_id, user_id, reaction_type) DO NOTHING
	`, table)
	_, err = r.db.ExecContext(ctx, insertQuery, postID, userID, reactionType)
	return err
}

func (r *postgresCommunityRepository) GetPostReactionsCount(ctx context.Context, postID uuid.UUID) (map[string]int, error) {
	table := TenantTable(ctx, "community_reactions")
	query := fmt.Sprintf(`
		SELECT reaction_type, COUNT(*) FROM %s WHERE post_id = $1 GROUP BY reaction_type
	`, table)

	rows, err := r.db.QueryContext(ctx, query, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	counts := make(map[string]int)
	for rows.Next() {
		var rType string
		var count int
		if err := rows.Scan(&rType, &count); err != nil {
			return nil, err
		}
		counts[rType] = count
	}
	return counts, nil
}
