package usecase_test

import (
	"context"
	"errors"
	"io"
	"strings"
	"testing"

	"backend/internal/domain"
	"backend/internal/usecase"
	"github.com/google/uuid"
)

type mockAnnouncementDocRepo struct {
	announcements map[uuid.UUID]*domain.Announcement
	documents     map[uuid.UUID]*domain.Document
}

func newMockAnnouncementDocRepo() *mockAnnouncementDocRepo {
	return &mockAnnouncementDocRepo{
		announcements: make(map[uuid.UUID]*domain.Announcement),
		documents:     make(map[uuid.UUID]*domain.Document),
	}
}

func (m *mockAnnouncementDocRepo) CreateAnnouncement(ctx context.Context, a *domain.Announcement) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	m.announcements[a.ID] = a
	return nil
}

func (m *mockAnnouncementDocRepo) GetAnnouncementByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Announcement, error) {
	a, ok := m.announcements[id]
	if !ok || a.TenantID != tenantID {
		return nil, errors.New("announcement not found")
	}
	return a, nil
}

func (m *mockAnnouncementDocRepo) ListAnnouncements(ctx context.Context, tenantID uuid.UUID, targetFilter *string, limit, offset int) ([]*domain.Announcement, int64, error) {
	var list []*domain.Announcement
	for _, a := range m.announcements {
		if a.TenantID == tenantID {
			if targetFilter != nil && *targetFilter != "" && a.Target != *targetFilter {
				continue
			}
			list = append(list, a)
		}
	}
	return list, int64(len(list)), nil
}

func (m *mockAnnouncementDocRepo) UpdateAnnouncement(ctx context.Context, a *domain.Announcement) error {
	existing, ok := m.announcements[a.ID]
	if !ok || existing.TenantID != a.TenantID {
		return errors.New("announcement not found")
	}
	m.announcements[a.ID] = a
	return nil
}

func (m *mockAnnouncementDocRepo) DeleteAnnouncement(ctx context.Context, tenantID, id uuid.UUID) error {
	existing, ok := m.announcements[id]
	if !ok || existing.TenantID != tenantID {
		return errors.New("announcement not found")
	}
	delete(m.announcements, id)
	return nil
}

func (m *mockAnnouncementDocRepo) CreateDocument(ctx context.Context, doc *domain.Document) error {
	if doc.ID == uuid.Nil {
		doc.ID = uuid.New()
	}
	m.documents[doc.ID] = doc
	return nil
}

func (m *mockAnnouncementDocRepo) GetDocumentByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Document, error) {
	d, ok := m.documents[id]
	if !ok || d.TenantID != tenantID {
		return nil, errors.New("document not found")
	}
	return d, nil
}

func (m *mockAnnouncementDocRepo) ListDocuments(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.Document, int64, error) {
	var list []*domain.Document
	for _, d := range m.documents {
		if d.TenantID == tenantID {
			list = append(list, d)
		}
	}
	return list, int64(len(list)), nil
}

func (m *mockAnnouncementDocRepo) DeleteDocument(ctx context.Context, tenantID, id uuid.UUID) error {
	d, ok := m.documents[id]
	if !ok || d.TenantID != tenantID {
		return errors.New("document not found")
	}
	delete(m.documents, id)
	return nil
}

func (m *mockAnnouncementDocRepo) UploadFile(ctx context.Context, filename string, content io.Reader, contentType string) (string, error) {
	return "/uploads/documents/test_" + filename, nil
}

func TestAnnouncementDocUsecase(t *testing.T) {
	repo := newMockAnnouncementDocRepo()
	uc := usecase.NewAnnouncementDocUsecase(repo)
	tenantID := uuid.New()
	ctx := context.Background()

	t.Run("Create & Get Announcement", func(t *testing.T) {
		a := &domain.Announcement{
			Title:   "Judul Pengumuman",
			Content: "Isi Pengumuman",
			Target:  "all",
		}
		err := uc.CreateAnnouncement(ctx, tenantID, a)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		got, err := uc.GetAnnouncement(ctx, tenantID, a.ID)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if got.Title != "Judul Pengumuman" {
			t.Errorf("expected title 'Judul Pengumuman', got %s", got.Title)
		}
	})

	t.Run("List Announcements", func(t *testing.T) {
		list, total, err := uc.ListAnnouncements(ctx, tenantID, nil, 10, 0)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if total != 1 || len(list) != 1 {
			t.Errorf("expected 1 announcement, got %d", total)
		}
	})

	t.Run("Update Announcement", func(t *testing.T) {
		a := &domain.Announcement{
			Title:   "Old Title",
			Content: "Old Content",
		}
		_ = uc.CreateAnnouncement(ctx, tenantID, a)
		a.Title = "Updated Title"
		err := uc.UpdateAnnouncement(ctx, tenantID, a)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		got, _ := uc.GetAnnouncement(ctx, tenantID, a.ID)
		if got.Title != "Updated Title" {
			t.Errorf("expected updated title, got %s", got.Title)
		}
	})

	t.Run("Delete Announcement", func(t *testing.T) {
		a := &domain.Announcement{Title: "ToDelete", Content: "Body"}
		_ = uc.CreateAnnouncement(ctx, tenantID, a)
		err := uc.DeleteAnnouncement(ctx, tenantID, a.ID)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		_, err = uc.GetAnnouncement(ctx, tenantID, a.ID)
		if err == nil {
			t.Error("expected error after deletion, got nil")
		}
	})

	t.Run("Create & Get Document", func(t *testing.T) {
		doc := &domain.Document{
			Title:    "Laporan Keuangan RT",
			Category: "financial_report",
		}
		reader := strings.NewReader("dummy content")
		err := uc.CreateDocument(ctx, tenantID, doc, "report.pdf", reader, "application/pdf")
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if doc.FileURL == "" {
			t.Error("expected file_url to be populated")
		}

		got, err := uc.GetDocument(ctx, tenantID, doc.ID)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if got.Title != "Laporan Keuangan RT" {
			t.Errorf("expected title 'Laporan Keuangan RT', got %s", got.Title)
		}
	})

	t.Run("List & Delete Document", func(t *testing.T) {
		list, total, err := uc.ListDocuments(ctx, tenantID, 10, 0)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if total == 0 || len(list) == 0 {
			t.Errorf("expected documents, got 0")
		}

		docID := list[0].ID
		err = uc.DeleteDocument(ctx, tenantID, docID)
		if err != nil {
			t.Fatalf("expected no error deleting doc, got %v", err)
		}
	})
}
