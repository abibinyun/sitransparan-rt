package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"path/filepath"
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

func (r *announcementDocRepository) CreateAnnouncement(ctx context.Context, a *domain.Announcement) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	now := time.Now()
	a.CreatedAt = now
	a.UpdatedAt = now
	if a.Target == "" {
		a.Target = "all"
	}

	if r.db == nil {
		return nil
	}

	query := fmt.Sprintf(`
		INSERT INTO %s (id, tenant_id, title, content, attachment_url, target, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`, TenantTable(ctx, "announcements"))
	_, err := r.db.ExecContext(ctx, query,
		a.ID, a.TenantID, a.Title, a.Content, a.AttachmentURL, a.Target, a.CreatedBy, a.CreatedAt, a.UpdatedAt,
	)
	return err
}

func (r *announcementDocRepository) GetAnnouncementByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Announcement, error) {
	if r.db == nil {
		return nil, ErrNotFound
	}

	query := fmt.Sprintf(`
		SELECT id, tenant_id, title, content, attachment_url, target, created_by, created_at, updated_at
		FROM %s
		WHERE id = $1 AND tenant_id = $2
	`, TenantTable(ctx, "announcements"))
	a := &domain.Announcement{}
	err := r.db.QueryRowContext(ctx, query, id, tenantID).Scan(
		&a.ID, &a.TenantID, &a.Title, &a.Content, &a.AttachmentURL, &a.Target, &a.CreatedBy, &a.CreatedAt, &a.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return a, nil
}

func (r *announcementDocRepository) ListAnnouncements(ctx context.Context, tenantID uuid.UUID, targetFilter *string, limit, offset int) ([]*domain.Announcement, int64, error) {
	if r.db == nil {
		return []*domain.Announcement{}, 0, nil
	}

	annTable := TenantTable(ctx, "announcements")
	var count int64
	var countQuery string
	var query string
	var args []interface{}

	if targetFilter != nil && *targetFilter != "" {
		countQuery = fmt.Sprintf(`SELECT COUNT(*) FROM %s WHERE tenant_id = $1 AND target = $2`, annTable)
		if err := r.db.QueryRowContext(ctx, countQuery, tenantID, *targetFilter).Scan(&count); err != nil {
			return nil, 0, err
		}
		query = fmt.Sprintf(`
			SELECT id, tenant_id, title, content, attachment_url, target, created_by, created_at, updated_at
			FROM %s
			WHERE tenant_id = $1 AND target = $2
			ORDER BY created_at DESC
			LIMIT $3 OFFSET $4
		`, annTable)
		args = []interface{}{tenantID, *targetFilter, limit, offset}
	} else {
		countQuery = fmt.Sprintf(`SELECT COUNT(*) FROM %s WHERE tenant_id = $1`, annTable)
		if err := r.db.QueryRowContext(ctx, countQuery, tenantID).Scan(&count); err != nil {
			return nil, 0, err
		}
		query = fmt.Sprintf(`
			SELECT id, tenant_id, title, content, attachment_url, target, created_by, created_at, updated_at
			FROM %s
			WHERE tenant_id = $1
			ORDER BY created_at DESC
			LIMIT $2 OFFSET $3
		`, annTable)
		args = []interface{}{tenantID, limit, offset}
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	list := []*domain.Announcement{}
	for rows.Next() {
		a := &domain.Announcement{}
		if err := rows.Scan(&a.ID, &a.TenantID, &a.Title, &a.Content, &a.AttachmentURL, &a.Target, &a.CreatedBy, &a.CreatedAt, &a.UpdatedAt); err != nil {
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

	query := fmt.Sprintf(`
		UPDATE %s
		SET title = $1, content = $2, attachment_url = $3, target = $4, updated_at = $5
		WHERE id = $6 AND tenant_id = $7
	`, TenantTable(ctx, "announcements"))
	res, err := r.db.ExecContext(ctx, query,
		a.Title, a.Content, a.AttachmentURL, a.Target, a.UpdatedAt, a.ID, a.TenantID,
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

	query := fmt.Sprintf(`DELETE FROM %s WHERE id = $1 AND tenant_id = $2`, TenantTable(ctx, "announcements"))
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
		WHERE id = $1 AND tenant_id = $2
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
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM %s WHERE tenant_id = $1`, docTable)
	if err := r.db.QueryRowContext(ctx, countQuery, tenantID).Scan(&count); err != nil {
		return nil, 0, err
	}

	query := fmt.Sprintf(`
		SELECT id, tenant_id, title, category, file_url, uploaded_by, created_at, updated_at
		FROM %s
		WHERE tenant_id = $1
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

func (r *announcementDocRepository) DeleteDocument(ctx context.Context, tenantID, id uuid.UUID) error {
	if r.db == nil {
		return nil
	}

	query := fmt.Sprintf(`DELETE FROM %s WHERE id = $1 AND tenant_id = $2`, TenantTable(ctx, "documents"))
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
	uniqueName := fmt.Sprintf("documents/%d_%s%s", time.Now().UnixNano(), uuid.New().String()[:8], filepath.Ext(filename))
	url := fmt.Sprintf("/uploads/%s", uniqueName)
	return url, nil
}
