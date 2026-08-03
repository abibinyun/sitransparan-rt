package usecase

import (
	"context"
	"errors"
	"io"

	"backend/internal/domain"
	"github.com/google/uuid"
)

type announcementDocUsecase struct {
	repo domain.AnnouncementDocRepository
}

func NewAnnouncementDocUsecase(repo domain.AnnouncementDocRepository) domain.AnnouncementDocUsecase {
	return &announcementDocUsecase{repo: repo}
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

func (u *announcementDocUsecase) DeleteDocument(ctx context.Context, tenantID, id uuid.UUID) error {
	if tenantID == uuid.Nil || id == uuid.Nil {
		return errors.New("tenant_id and id are required")
	}
	return u.repo.DeleteDocument(ctx, tenantID, id)
}
