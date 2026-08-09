package http_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	delivery "backend/internal/delivery/http"
	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"
	"backend/internal/repository"
	"github.com/google/uuid"
)

type mockTenantRepoForAnnDoc struct {
	tenant *domain.Tenant
}

func (m *mockTenantRepoForAnnDoc) Create(ctx context.Context, tenant *domain.Tenant) error {
	return nil
}
func (m *mockTenantRepoForAnnDoc) GetByID(ctx context.Context, id uuid.UUID) (*domain.Tenant, error) {
	if m.tenant != nil && m.tenant.ID == id {
		return m.tenant, nil
	}
	return nil, repository.ErrNotFound
}
func (m *mockTenantRepoForAnnDoc) GetBySlug(ctx context.Context, slug string) (*domain.Tenant, error) {
	if m.tenant != nil && m.tenant.Slug == slug {
		return m.tenant, nil
	}
	return nil, repository.ErrNotFound
}
func (m *mockTenantRepoForAnnDoc) GetByDomain(ctx context.Context, domainName string) (*domain.Tenant, error) {
	return nil, nil
}
func (m *mockTenantRepoForAnnDoc) Update(ctx context.Context, tenant *domain.Tenant) error {
	return nil
}
func (m *mockTenantRepoForAnnDoc) Delete(ctx context.Context, id uuid.UUID) error {
	return nil
}
func (m *mockTenantRepoForAnnDoc) List(ctx context.Context, limit, offset int) ([]*domain.Tenant, int64, error) {
	return nil, 0, nil
}
func (m *mockTenantRepoForAnnDoc) SetSearchPath(ctx context.Context, slug string) error {
	return nil
}

type mockAnnDocUsecase struct {
	announcements []*domain.Announcement
	documents     []*domain.Document
}

func (m *mockAnnDocUsecase) CreateAnnouncement(ctx context.Context, tenantID uuid.UUID, a *domain.Announcement) error {
	a.ID = uuid.New()
	a.TenantID = tenantID
	m.announcements = append(m.announcements, a)
	return nil
}

func (m *mockAnnDocUsecase) GetAnnouncement(ctx context.Context, tenantID, id uuid.UUID) (*domain.Announcement, error) {
	for _, a := range m.announcements {
		if a.ID == id && a.TenantID == tenantID {
			return a, nil
		}
	}
	return nil, repository.ErrNotFound
}

func (m *mockAnnDocUsecase) ListAnnouncements(ctx context.Context, tenantID uuid.UUID, targetFilter *string, limit, offset int) ([]*domain.Announcement, int64, error) {
	var list []*domain.Announcement
	for _, a := range m.announcements {
		if a.TenantID == tenantID {
			list = append(list, a)
		}
	}
	return list, int64(len(list)), nil
}

func (m *mockAnnDocUsecase) UpdateAnnouncement(ctx context.Context, tenantID uuid.UUID, a *domain.Announcement) error {
	for i, existing := range m.announcements {
		if existing.ID == a.ID && existing.TenantID == tenantID {
			m.announcements[i] = a
			return nil
		}
	}
	return repository.ErrNotFound
}

func (m *mockAnnDocUsecase) DeleteAnnouncement(ctx context.Context, tenantID, id uuid.UUID) error {
	for i, a := range m.announcements {
		if a.ID == id && a.TenantID == tenantID {
			m.announcements = append(m.announcements[:i], m.announcements[i+1:]...)
			return nil
		}
	}
	return repository.ErrNotFound
}

func (m *mockAnnDocUsecase) CreateDocument(ctx context.Context, tenantID uuid.UUID, doc *domain.Document, filename string, content io.Reader, contentType string) error {
	doc.ID = uuid.New()
	doc.TenantID = tenantID
	if filename != "" {
		doc.FileURL = "/uploads/documents/" + filename
	}
	m.documents = append(m.documents, doc)
	return nil
}

func (m *mockAnnDocUsecase) GetDocument(ctx context.Context, tenantID, id uuid.UUID) (*domain.Document, error) {
	for _, d := range m.documents {
		if d.ID == id && d.TenantID == tenantID {
			return d, nil
		}
	}
	return nil, repository.ErrNotFound
}

func (m *mockAnnDocUsecase) ListDocuments(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.Document, int64, error) {
	var list []*domain.Document
	for _, d := range m.documents {
		if d.TenantID == tenantID {
			list = append(list, d)
		}
	}
	return list, int64(len(list)), nil
}

func (m *mockAnnDocUsecase) DeleteDocument(ctx context.Context, tenantID, id uuid.UUID) error {
	for i, d := range m.documents {
		if d.ID == id && d.TenantID == tenantID {
			m.documents = append(m.documents[:i], m.documents[i+1:]...)
			return nil
		}
	}
	return repository.ErrNotFound
}

func TestAnnouncementDocHandler(t *testing.T) {
	tenantID := uuid.New()
	tenant := &domain.Tenant{ID: tenantID, Name: "RT 01", Slug: "rt01"}
	tenantRepo := &mockTenantRepoForAnnDoc{tenant: tenant}
	uc := &mockAnnDocUsecase{}

	handler := delivery.NewAnnouncementDocHandler(uc, tenantRepo)
	mux := http.NewServeMux()

	tenantMw := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := context.WithValue(r.Context(), middleware.TenantContextKey, tenant)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
	authMw := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := context.WithValue(r.Context(), middleware.UserContextKey, uuid.New())
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}

	handler.RegisterRoutes(mux, tenantMw, authMw)

	t.Run("Public List Announcements", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/t/rt01/announcements", nil)
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected 200 OK, got %d", rec.Code)
		}
	})

	t.Run("Private Create Announcement", func(t *testing.T) {
		payload := map[string]string{
			"title":   "Pengumuman Kerja Bakti",
			"content": "Besok jam 7 pagi",
			"target":  "all",
		}
		body, _ := json.Marshal(payload)
		req := httptest.NewRequest("POST", "/api/v1/announcements", bytes.NewReader(body))
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)

		if rec.Code != http.StatusCreated {
			t.Errorf("expected 201 Created, got %d: %s", rec.Code, rec.Body.String())
		}
	})

	t.Run("Public List Documents", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/t/rt01/documents", nil)
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected 200 OK, got %d", rec.Code)
		}
	})

	t.Run("Private Upload Document Multipart", func(t *testing.T) {
		body := &bytes.Buffer{}
		writer := multipart.NewWriter(body)
		_ = writer.WriteField("title", "Notulen Rapat")
		_ = writer.WriteField("category", "minutes")
		part, _ := writer.CreateFormFile("file", "notulen.pdf")
		_, _ = part.Write([]byte("pdf content"))
		writer.Close()

		req := httptest.NewRequest("POST", "/api/v1/documents", body)
		req.Header.Set("Content-Type", writer.FormDataContentType())
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)

		if rec.Code != http.StatusCreated {
			t.Errorf("expected 201 Created, got %d: %s", rec.Code, rec.Body.String())
		}
	})
}
