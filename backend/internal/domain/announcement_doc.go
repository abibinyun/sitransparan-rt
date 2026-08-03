package domain

import (
	"context"
	"io"
	"time"

	"github.com/google/uuid"
)

type Announcement struct {
	ID            uuid.UUID  `json:"id"`
	TenantID      uuid.UUID  `json:"tenant_id"`
	Title         string     `json:"title"`
	Content       string     `json:"content"`
	AttachmentURL *string    `json:"attachment_url,omitempty"`
	Target        string     `json:"target"` // 'all', 'residents_only'
	CreatedBy     *uuid.UUID `json:"created_by,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type Document struct {
	ID         uuid.UUID  `json:"id"`
	TenantID   uuid.UUID  `json:"tenant_id"`
	Title      string     `json:"title"`
	Category   string     `json:"category"` // 'financial_report', 'minutes', 'letter', 'other'
	FileURL    string     `json:"file_url"`
	UploadedBy *uuid.UUID `json:"uploaded_by,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

type AnnouncementDocRepository interface {
	CreateAnnouncement(ctx context.Context, announcement *Announcement) error
	GetAnnouncementByID(ctx context.Context, tenantID, id uuid.UUID) (*Announcement, error)
	ListAnnouncements(ctx context.Context, tenantID uuid.UUID, targetFilter *string, limit, offset int) ([]*Announcement, int64, error)
	UpdateAnnouncement(ctx context.Context, announcement *Announcement) error
	DeleteAnnouncement(ctx context.Context, tenantID, id uuid.UUID) error

	CreateDocument(ctx context.Context, doc *Document) error
	GetDocumentByID(ctx context.Context, tenantID, id uuid.UUID) (*Document, error)
	ListDocuments(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*Document, int64, error)
	DeleteDocument(ctx context.Context, tenantID, id uuid.UUID) error
	UploadFile(ctx context.Context, filename string, content io.Reader, contentType string) (string, error)
}

type AnnouncementDocUsecase interface {
	CreateAnnouncement(ctx context.Context, tenantID uuid.UUID, announcement *Announcement) error
	GetAnnouncement(ctx context.Context, tenantID, id uuid.UUID) (*Announcement, error)
	ListAnnouncements(ctx context.Context, tenantID uuid.UUID, targetFilter *string, limit, offset int) ([]*Announcement, int64, error)
	UpdateAnnouncement(ctx context.Context, tenantID uuid.UUID, announcement *Announcement) error
	DeleteAnnouncement(ctx context.Context, tenantID, id uuid.UUID) error

	CreateDocument(ctx context.Context, tenantID uuid.UUID, doc *Document, filename string, content io.Reader, contentType string) error
	GetDocument(ctx context.Context, tenantID, id uuid.UUID) (*Document, error)
	ListDocuments(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*Document, int64, error)
	DeleteDocument(ctx context.Context, tenantID, id uuid.UUID) error
}
