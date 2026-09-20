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
	MediaURLs     []string   `json:"media_urls,omitempty"` // galeri foto feed (Fase 2)
	FileURLs      []string   `json:"file_urls,omitempty"`  // lampiran file/dokumen multi
	Category      string     `json:"category"`             // 'pengumuman', 'kegiatan', 'santai', 'info', dll
	Target        string     `json:"target"`               // 'all', 'residents_only'
	AllowComments bool       `json:"allow_comments"`       // Sakelar komentar warga per-kabar
	CommentsCount int        `json:"comments_count"`       // Jumlah komentar aktif
	CreatedBy     *uuid.UUID `json:"created_by,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type AnnouncementComment struct {
	ID             uuid.UUID  `json:"id"`
	AnnouncementID uuid.UUID  `json:"announcement_id"`
	UserID         uuid.UUID  `json:"user_id"`
	AuthorName     string     `json:"author_name"`
	HouseBlock     *string    `json:"house_block,omitempty"`
	Content        string     `json:"content"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	DeletedAt      *time.Time `json:"deleted_at,omitempty"`
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
	ListAnnouncements(ctx context.Context, tenantID uuid.UUID, targetFilter *string, categoryFilter *string, limit, offset int) ([]*Announcement, int64, error)
	UpdateAnnouncement(ctx context.Context, announcement *Announcement) error
	DeleteAnnouncement(ctx context.Context, tenantID, id uuid.UUID) error

	CreateDocument(ctx context.Context, doc *Document) error
	GetDocumentByID(ctx context.Context, tenantID, id uuid.UUID) (*Document, error)
	ListDocuments(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*Document, int64, error)
	UpdateDocument(ctx context.Context, doc *Document) error
	DeleteDocument(ctx context.Context, tenantID, id uuid.UUID) error
	UploadFile(ctx context.Context, filename string, content io.Reader, contentType string) (string, error)

	// Comments
	CreateComment(ctx context.Context, comment *AnnouncementComment) error
	ListComments(ctx context.Context, announcementID uuid.UUID) ([]*AnnouncementComment, error)
	DeleteComment(ctx context.Context, id uuid.UUID) error
	GetLastCommentTime(ctx context.Context, announcementID, userID uuid.UUID) (*time.Time, error)
}

type AnnouncementDocUsecase interface {
	CreateAnnouncement(ctx context.Context, tenantID uuid.UUID, announcement *Announcement) error
	GetAnnouncement(ctx context.Context, tenantID, id uuid.UUID) (*Announcement, error)
	ListAnnouncements(ctx context.Context, tenantID uuid.UUID, targetFilter *string, categoryFilter *string, limit, offset int) ([]*Announcement, int64, error)
	UpdateAnnouncement(ctx context.Context, tenantID uuid.UUID, announcement *Announcement) error
	DeleteAnnouncement(ctx context.Context, tenantID, id uuid.UUID) error

	CreateDocument(ctx context.Context, tenantID uuid.UUID, doc *Document, filename string, content io.Reader, contentType string) error
	GetDocument(ctx context.Context, tenantID, id uuid.UUID) (*Document, error)
	ListDocuments(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*Document, int64, error)
	UpdateDocument(ctx context.Context, tenantID uuid.UUID, doc *Document) error
	DeleteDocument(ctx context.Context, tenantID, id uuid.UUID) error

	// Comments
	CreateComment(ctx context.Context, tenantID uuid.UUID, comment *AnnouncementComment) error
	ListComments(ctx context.Context, tenantID, announcementID uuid.UUID) ([]*AnnouncementComment, error)
	DeleteComment(ctx context.Context, tenantID, id uuid.UUID) error
}
