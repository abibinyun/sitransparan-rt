package repository

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"path/filepath"
	"strings"
	"time"

	"backend/internal/domain"
	"backend/pkg/storage/minio"
	"github.com/google/uuid"
)

type announcementDocRepository struct {
	db          *sql.DB
	minioClient *minio.Client
}

func NewAnnouncementDocRepository(db *sql.DB, minioClient *minio.Client) domain.AnnouncementDocRepository {
	return &announcementDocRepository{
		db:          db,
		minioClient: minioClient,
	}
}

// ---------- helpers media_urls (JSONB <-> []string) ----------

func mediaJSON(urls []string) []byte {
	if len(urls) == 0 {
		return []byte("[]")
	}
	b, err := json.Marshal(urls)
	if err != nil {
		return []byte("[]")
	}
	return b
}

func scanMedia(dest interface{}) ([]string, error) {
	raw, ok := dest.([]byte)
	if !ok {
		return []string{}, nil
	}
	var urls []string
	if err := json.Unmarshal(raw, &urls); err != nil {
		return []string{}, nil
	}
	return urls, nil
}

const announcementCols = `id, tenant_id, title, content, attachment_url, media_urls, file_urls, target, allow_comments, category, created_by, created_at, updated_at`

func scanAnnouncement(scan func(dest ...interface{}) error) (*domain.Announcement, error) {
	a := &domain.Announcement{}
	var mediaRaw []byte
	var fileRaw []byte
	if err := scan(&a.ID, &a.TenantID, &a.Title, &a.Content, &a.AttachmentURL, &mediaRaw, &fileRaw, &a.Target, &a.AllowComments, &a.Category, &a.CreatedBy, &a.CreatedAt, &a.UpdatedAt); err != nil {
		return nil, err
	}
	a.MediaURLs, _ = scanMedia(mediaRaw)
	a.FileURLs, _ = scanMedia(fileRaw)
	return a, nil
}

func scanAnnouncementWithCount(scan func(dest ...interface{}) error) (*domain.Announcement, error) {
	a := &domain.Announcement{}
	var mediaRaw []byte
	var fileRaw []byte
	if err := scan(&a.ID, &a.TenantID, &a.Title, &a.Content, &a.AttachmentURL, &mediaRaw, &fileRaw, &a.Target, &a.AllowComments, &a.Category, &a.CreatedBy, &a.CreatedAt, &a.UpdatedAt, &a.CommentsCount); err != nil {
		return nil, err
	}
	a.MediaURLs, _ = scanMedia(mediaRaw)
	a.FileURLs, _ = scanMedia(fileRaw)
	return a, nil
}

func (r *announcementDocRepository) CreateAnnouncement(ctx context.Context, a *domain.Announcement) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	now := time.Now()
	if a.CreatedAt.IsZero() {
		a.CreatedAt = now
	}
	a.UpdatedAt = now
	if a.Target == "" {
		a.Target = "all"
	}
	if a.Category == "" {
		a.Category = "pengumuman"
	}

	if r.db == nil {
		return nil
	}

	query := fmt.Sprintf(`
		INSERT INTO %s (id, tenant_id, title, content, attachment_url, media_urls, file_urls, target, allow_comments, category, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`, TenantTable(ctx, "announcements"))
	_, err := r.db.ExecContext(ctx, query,
		a.ID, a.TenantID, a.Title, a.Content, a.AttachmentURL, mediaJSON(a.MediaURLs), mediaJSON(a.FileURLs), a.Target, a.AllowComments, a.Category, a.CreatedBy, a.CreatedAt, a.UpdatedAt,
	)
	return err
}

func (r *announcementDocRepository) GetAnnouncementByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Announcement, error) {
	if r.db == nil {
		return nil, ErrNotFound
	}

	query := fmt.Sprintf(`
		SELECT `+announcementCols+`
		FROM %s
		WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
	`, TenantTable(ctx, "announcements"))
	a, err := scanAnnouncement(r.db.QueryRowContext(ctx, query, id, tenantID).Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return a, nil
}

func (r *announcementDocRepository) ListAnnouncements(ctx context.Context, tenantID uuid.UUID, targetFilter *string, categoryFilter *string, limit, offset int) ([]*domain.Announcement, int64, error) {
	if r.db == nil {
		return []*domain.Announcement{}, 0, nil
	}

	annTable := TenantTable(ctx, "announcements")
	var count int64
	var args []interface{}
	whereClauses := []string{fmt.Sprintf("%s.tenant_id = $1", "a"), fmt.Sprintf("%s.deleted_at IS NULL", "a")}
	args = append(args, tenantID)

	if targetFilter != nil && *targetFilter != "" {
		args = append(args, *targetFilter)
		whereClauses = append(whereClauses, fmt.Sprintf("a.target = $%d", len(args)))
	}
	if categoryFilter != nil && *categoryFilter != "" && *categoryFilter != "all" {
		args = append(args, *categoryFilter)
		whereClauses = append(whereClauses, fmt.Sprintf("a.category = $%d", len(args)))
	}

	whereSQL := strings.Join(whereClauses, " AND ")

	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM %s a WHERE %s`, annTable, whereSQL)
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&count); err != nil {
		return nil, 0, err
	}

	queryCols := `a.id, a.tenant_id, a.title, a.content, a.attachment_url, a.media_urls, a.file_urls, a.target, a.allow_comments, a.category, a.created_by, a.created_at, a.updated_at,
		COALESCE((SELECT COUNT(*) FROM ` + TenantTable(ctx, "announcement_comments") + ` c WHERE c.announcement_id = a.id AND c.deleted_at IS NULL), 0)`

	queryArgs := append([]interface{}{}, args...)
	queryArgs = append(queryArgs, limit, offset)
	query := fmt.Sprintf(`
		SELECT %s
		FROM %s a
		WHERE %s
		ORDER BY a.created_at DESC
		LIMIT $%d OFFSET $%d
	`, queryCols, annTable, whereSQL, len(queryArgs)-1, len(queryArgs))

	rows, err := r.db.QueryContext(ctx, query, queryArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	list := []*domain.Announcement{}
	for rows.Next() {
		a, err := scanAnnouncementWithCount(rows.Scan)
		if err != nil {
			return nil, 0, err
		}
		list = append(list, a)
	}

	return list, count, nil
}

func (r *announcementDocRepository) UpdateAnnouncement(ctx context.Context, a *domain.Announcement) error {
	a.UpdatedAt = time.Now()
	if r.db == nil {
		return nil
	}

	if a.Category == "" {
		a.Category = "pengumuman"
	}

	query := fmt.Sprintf(`
		UPDATE %s
		SET title = $1, content = $2, attachment_url = $3, media_urls = $4, file_urls = $5, target = $6, allow_comments = $7, category = $8, updated_at = $9,
		    created_at = CASE WHEN $12::timestamptz IS NOT NULL THEN $12::timestamptz ELSE created_at END
		WHERE id = $10 AND tenant_id = $11 AND deleted_at IS NULL
	`, TenantTable(ctx, "announcements"))
	var customCreatedAt *time.Time
	if !a.CreatedAt.IsZero() {
		customCreatedAt = &a.CreatedAt
	}
	res, err := r.db.ExecContext(ctx, query,
		a.Title, a.Content, a.AttachmentURL, mediaJSON(a.MediaURLs), mediaJSON(a.FileURLs), a.Target, a.AllowComments, a.Category, a.UpdatedAt, a.ID, a.TenantID, customCreatedAt,
	)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err == nil && rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *announcementDocRepository) DeleteAnnouncement(ctx context.Context, tenantID, id uuid.UUID) error {
	if r.db == nil {
		return nil
	}

	query := fmt.Sprintf(`UPDATE %s SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`, TenantTable(ctx, "announcements"))
	res, err := r.db.ExecContext(ctx, query, id, tenantID)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err == nil && rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *announcementDocRepository) CreateDocument(ctx context.Context, doc *domain.Document) error {
	if doc.ID == uuid.Nil {
		doc.ID = uuid.New()
	}
	now := time.Now()
	doc.CreatedAt = now
	doc.UpdatedAt = now

	if r.db == nil {
		return nil
	}

	query := fmt.Sprintf(`
		INSERT INTO %s (id, tenant_id, title, category, file_url, uploaded_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, TenantTable(ctx, "documents"))
	_, err := r.db.ExecContext(ctx, query,
		doc.ID, doc.TenantID, doc.Title, doc.Category, doc.FileURL, doc.UploadedBy, doc.CreatedAt, doc.UpdatedAt,
	)
	return err
}

func (r *announcementDocRepository) GetDocumentByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Document, error) {
	if r.db == nil {
		return nil, ErrNotFound
	}

	query := fmt.Sprintf(`
		SELECT id, tenant_id, title, category, file_url, uploaded_by, created_at, updated_at
		FROM %s
		WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
	`, TenantTable(ctx, "documents"))
	doc := &domain.Document{}
	err := r.db.QueryRowContext(ctx, query, id, tenantID).Scan(
		&doc.ID, &doc.TenantID, &doc.Title, &doc.Category, &doc.FileURL, &doc.UploadedBy, &doc.CreatedAt, &doc.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return doc, nil
}

func (r *announcementDocRepository) ListDocuments(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.Document, int64, error) {
	if r.db == nil {
		return []*domain.Document{}, 0, nil
	}

	docTable := TenantTable(ctx, "documents")
	var count int64
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM %s WHERE tenant_id = $1 AND deleted_at IS NULL`, docTable)
	if err := r.db.QueryRowContext(ctx, countQuery, tenantID).Scan(&count); err != nil {
		return nil, 0, err
	}

	query := fmt.Sprintf(`
		SELECT id, tenant_id, title, category, file_url, uploaded_by, created_at, updated_at
		FROM %s
		WHERE tenant_id = $1 AND deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`, docTable)
	rows, err := r.db.QueryContext(ctx, query, tenantID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	list := []*domain.Document{}
	for rows.Next() {
		doc := &domain.Document{}
		if err := rows.Scan(&doc.ID, &doc.TenantID, &doc.Title, &doc.Category, &doc.FileURL, &doc.UploadedBy, &doc.CreatedAt, &doc.UpdatedAt); err != nil {
			return nil, 0, err
		}
		list = append(list, doc)
	}

	return list, count, nil
}

func (r *announcementDocRepository) UpdateDocument(ctx context.Context, doc *domain.Document) error {
	if r.db == nil {
		return nil
	}
	doc.UpdatedAt = time.Now()
	query := fmt.Sprintf(`
		UPDATE %s
		SET title = $1, category = $2, file_url = $3, updated_at = $4
		WHERE id = $5 AND tenant_id = $6 AND deleted_at IS NULL
	`, TenantTable(ctx, "documents"))
	res, err := r.db.ExecContext(ctx, query,
		doc.Title, doc.Category, doc.FileURL, doc.UpdatedAt, doc.ID, doc.TenantID,
	)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err == nil && rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *announcementDocRepository) DeleteDocument(ctx context.Context, tenantID, id uuid.UUID) error {
	if r.db == nil {
		return nil
	}

	query := fmt.Sprintf(`UPDATE %s SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`, TenantTable(ctx, "documents"))
	res, err := r.db.ExecContext(ctx, query, id, tenantID)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err == nil && rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *announcementDocRepository) UploadFile(ctx context.Context, filename string, content io.Reader, contentType string) (string, error) {
	objectKey := minio.ObjectKey(TenantSlug(ctx), "documents", fmt.Sprintf("%d_%s", time.Now().UnixNano(), uuid.New().String()[:8]), filepath.Ext(filename))
	if size, ok := contentSize(content); ok {
		return r.minioClient.Upload(ctx, objectKey, content, size, contentType)
	}
	data, err := io.ReadAll(content)
	if err != nil {
		return "", err
	}
	return r.minioClient.Upload(ctx, objectKey, bytes.NewReader(data), int64(len(data)), contentType)
}

func (r *announcementDocRepository) CreateComment(ctx context.Context, c *domain.AnnouncementComment) error {
	if r.db == nil {
		return nil
	}
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	now := time.Now()
	c.CreatedAt = now
	c.UpdatedAt = now

	query := fmt.Sprintf(`
		INSERT INTO %s (id, announcement_id, user_id, author_name, house_block, content, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, TenantTable(ctx, "announcement_comments"))
	_, err := r.db.ExecContext(ctx, query,
		c.ID, c.AnnouncementID, c.UserID, c.AuthorName, c.HouseBlock, c.Content, c.CreatedAt, c.UpdatedAt,
	)
	return err
}

func (r *announcementDocRepository) ListComments(ctx context.Context, announcementID uuid.UUID) ([]*domain.AnnouncementComment, error) {
	if r.db == nil {
		return []*domain.AnnouncementComment{}, nil
	}

	query := fmt.Sprintf(`
		SELECT id, announcement_id, user_id, author_name, house_block, content, created_at, updated_at
		FROM %s
		WHERE announcement_id = $1 AND deleted_at IS NULL
		ORDER BY created_at ASC
	`, TenantTable(ctx, "announcement_comments"))

	rows, err := r.db.QueryContext(ctx, query, announcementID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []*domain.AnnouncementComment
	for rows.Next() {
		var c domain.AnnouncementComment
		if err := rows.Scan(
			&c.ID, &c.AnnouncementID, &c.UserID, &c.AuthorName, &c.HouseBlock, &c.Content, &c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, err
		}
		comments = append(comments, &c)
	}
	if comments == nil {
		comments = []*domain.AnnouncementComment{}
	}
	return comments, nil
}

func (r *announcementDocRepository) DeleteComment(ctx context.Context, id uuid.UUID) error {
	if r.db == nil {
		return nil
	}

	query := fmt.Sprintf(`
		UPDATE %s SET deleted_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
	`, TenantTable(ctx, "announcement_comments"))
	res, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err == nil && rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *announcementDocRepository) GetLastCommentTime(ctx context.Context, announcementID, userID uuid.UUID) (*time.Time, error) {
	if r.db == nil {
		return nil, nil
	}

	query := fmt.Sprintf(`
		SELECT created_at
		FROM %s
		WHERE announcement_id = $1 AND user_id = $2 AND deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT 1
	`, TenantTable(ctx, "announcement_comments"))

	var t time.Time
	err := r.db.QueryRowContext(ctx, query, announcementID, userID).Scan(&t)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}
