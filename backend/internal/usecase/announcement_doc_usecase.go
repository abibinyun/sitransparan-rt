package usecase

import (
	"context"
	"errors"
	"io"
	"net/url"
	"strings"
	"time"

	"backend/internal/domain"
	"github.com/google/uuid"
)

type announcementDocUsecase struct {
	repo domain.AnnouncementDocRepository
}

func NewAnnouncementDocUsecase(repo domain.AnnouncementDocRepository) domain.AnnouncementDocUsecase {
	return &announcementDocUsecase{repo: repo}
}

func validateMediaURLs(urls []string) error {
	if len(urls) > 10 {
		return errors.New("media_urls exceeds 10 items")
	}
	for _, s := range urls {
		if strings.HasPrefix(s, "/api/v1/files/") || strings.HasPrefix(s, "/uploads/") {
			continue
		}
		u, err := url.Parse(s)
		if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
			return errors.New("media_urls must be valid URLs")
		}
	}
	return nil
}

func validateFileURLs(urls []string) error {
	if len(urls) > 10 {
		return errors.New("file_urls exceeds 10 items")
	}
	for _, s := range urls {
		if strings.HasPrefix(s, "/api/v1/files/") || strings.HasPrefix(s, "/uploads/") {
			continue
		}
		u, err := url.Parse(s)
		if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
			return errors.New("file_urls must be valid URLs")
		}
	}
	return nil
}

func (u *announcementDocUsecase) CreateAnnouncement(ctx context.Context, tenantID uuid.UUID, a *domain.Announcement) error {
	if tenantID == uuid.Nil {
		return errors.New("tenant_id is required")
	}
	if a.Title == "" {
		return errors.New("title is required")
	}
	if a.Content == "" {
		return errors.New("content is required")
	}
	if err := validateMediaURLs(a.MediaURLs); err != nil {
		return err
	}
	if err := validateFileURLs(a.FileURLs); err != nil {
		return err
	}

	a.TenantID = tenantID
	if a.Target == "" {
		a.Target = "all"
	}
	return u.repo.CreateAnnouncement(ctx, a)
}

func (u *announcementDocUsecase) GetAnnouncement(ctx context.Context, tenantID, id uuid.UUID) (*domain.Announcement, error) {
	if tenantID == uuid.Nil || id == uuid.Nil {
		return nil, errors.New("tenant_id and id are required")
	}
	return u.repo.GetAnnouncementByID(ctx, tenantID, id)
}

func (u *announcementDocUsecase) ListAnnouncements(ctx context.Context, tenantID uuid.UUID, targetFilter *string, limit, offset int) ([]*domain.Announcement, int64, error) {
	if tenantID == uuid.Nil {
		return nil, 0, errors.New("tenant_id is required")
	}
	if limit <= 0 {
		limit = 10
	}
	if offset < 0 {
		offset = 0
	}
	return u.repo.ListAnnouncements(ctx, tenantID, targetFilter, limit, offset)
}

func (u *announcementDocUsecase) UpdateAnnouncement(ctx context.Context, tenantID uuid.UUID, a *domain.Announcement) error {
	if tenantID == uuid.Nil || a.ID == uuid.Nil {
		return errors.New("tenant_id and announcement id are required")
	}
	if a.Title == "" {
		return errors.New("title is required")
	}
	if a.Content == "" {
		return errors.New("content is required")
	}
	if err := validateMediaURLs(a.MediaURLs); err != nil {
		return err
	}
	if err := validateFileURLs(a.FileURLs); err != nil {
		return err
	}

	a.TenantID = tenantID
	if a.Target == "" {
		a.Target = "all"
	}
	return u.repo.UpdateAnnouncement(ctx, a)
}

func (u *announcementDocUsecase) DeleteAnnouncement(ctx context.Context, tenantID, id uuid.UUID) error {
	if tenantID == uuid.Nil || id == uuid.Nil {
		return errors.New("tenant_id and id are required")
	}
	return u.repo.DeleteAnnouncement(ctx, tenantID, id)
}

func (u *announcementDocUsecase) CreateDocument(ctx context.Context, tenantID uuid.UUID, doc *domain.Document, filename string, content io.Reader, contentType string) error {
	if tenantID == uuid.Nil {
		return errors.New("tenant_id is required")
	}
	if doc.Title == "" {
		return errors.New("title is required")
	}
	if doc.Category == "" {
		return errors.New("category is required")
	}

	doc.TenantID = tenantID

	if content != nil && filename != "" {
		fileURL, err := u.repo.UploadFile(ctx, filename, content, contentType)
		if err != nil {
			return err
		}
		doc.FileURL = fileURL
	} else if doc.FileURL == "" {
		return errors.New("file is required")
	}

	return u.repo.CreateDocument(ctx, doc)
}

func (u *announcementDocUsecase) GetDocument(ctx context.Context, tenantID, id uuid.UUID) (*domain.Document, error) {
	if tenantID == uuid.Nil || id == uuid.Nil {
		return nil, errors.New("tenant_id and id are required")
	}
	return u.repo.GetDocumentByID(ctx, tenantID, id)
}

func (u *announcementDocUsecase) ListDocuments(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.Document, int64, error) {
	if tenantID == uuid.Nil {
		return nil, 0, errors.New("tenant_id is required")
	}
	if limit <= 0 {
		limit = 10
	}
	if offset < 0 {
		offset = 0
	}
	return u.repo.ListDocuments(ctx, tenantID, limit, offset)
}

func (u *announcementDocUsecase) UpdateDocument(ctx context.Context, tenantID uuid.UUID, doc *domain.Document) error {
	if tenantID == uuid.Nil || doc.ID == uuid.Nil {
		return errors.New("tenant_id and document id are required")
	}
	if doc.Title == "" {
		return errors.New("title is required")
	}
	if doc.Category == "" {
		return errors.New("category is required")
	}
	doc.TenantID = tenantID
	return u.repo.UpdateDocument(ctx, doc)
}

func (u *announcementDocUsecase) DeleteDocument(ctx context.Context, tenantID, id uuid.UUID) error {
	if tenantID == uuid.Nil || id == uuid.Nil {
		return errors.New("tenant_id and id are required")
	}
	return u.repo.DeleteDocument(ctx, tenantID, id)
}

func (u *announcementDocUsecase) CreateComment(ctx context.Context, tenantID uuid.UUID, c *domain.AnnouncementComment) error {
	if tenantID == uuid.Nil || c.AnnouncementID == uuid.Nil || c.UserID == uuid.Nil {
		return errors.New("identitas pengumuman dan pengguna diperlukan")
	}

	// 1. Cek apakah pengumuman ada dan mengizinkan komentar
	ann, err := u.repo.GetAnnouncementByID(ctx, tenantID, c.AnnouncementID)
	if err != nil || ann == nil {
		return errors.New("pengumuman tidak ditemukan")
	}
	if !ann.AllowComments {
		return errors.New("kolom komentar dinonaktifkan untuk pengumuman ini")
	}

	// 2. Validasi konten komentar (maks 250 karakter, tidak kosong)
	content := strings.TrimSpace(c.Content)
	if content == "" {
		return errors.New("isi komentar tidak boleh kosong")
	}
	if len([]rune(content)) > 250 {
		return errors.New("komentar maksimal 250 karakter")
	}
	c.Content = content

	// 3. Rate limiting per-user per-announcement: 1 menit cooldown untuk anti spam
	lastTime, err := u.repo.GetLastCommentTime(ctx, c.AnnouncementID, c.UserID)
	if err == nil && lastTime != nil {
		if time.Since(*lastTime) < 1*time.Minute {
			return errors.New("harap tunggu 1 menit sebelum mengirim komentar berikutnya")
		}
	}

	return u.repo.CreateComment(ctx, c)
}

func (u *announcementDocUsecase) ListComments(ctx context.Context, tenantID, announcementID uuid.UUID) ([]*domain.AnnouncementComment, error) {
	if tenantID == uuid.Nil || announcementID == uuid.Nil {
		return nil, errors.New("tenant_id dan announcement_id diperlukan")
	}
	return u.repo.ListComments(ctx, announcementID)
}

func (u *announcementDocUsecase) DeleteComment(ctx context.Context, tenantID, id uuid.UUID) error {
	if tenantID == uuid.Nil || id == uuid.Nil {
		return errors.New("id komentar diperlukan")
	}
	return u.repo.DeleteComment(ctx, id)
}
