package http_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	delivery "backend/internal/delivery/http"
	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"

	"github.com/google/uuid"
)

func TestAnnouncementComments_Integration(t *testing.T) {
	tenantID := uuid.New()
	tenant := &domain.Tenant{
		ID:     tenantID,
		Name:   "RT 03",
		Slug:   "rt-003",
		Status: "active",
	}

	annID := uuid.New()
	ann := &domain.Announcement{
		ID:            annID,
		TenantID:      tenantID,
		Title:         "Pengumuman Uji Komentar",
		Content:       "Isi pengumuman uji komentar",
		Target:        "all",
		AllowComments: true,
	}

	repo := &mockCommentIntegrationRepo{
		announcements: map[uuid.UUID]*domain.Announcement{annID: ann},
		comments:      []*domain.AnnouncementComment{},
	}
	uc := &mockCommentIntegrationUsecase{repo: repo}
	tenantRepo := &mockTenantRepoForAnnDoc{tenant: tenant}

	handler := delivery.NewAnnouncementDocHandler(uc, tenantRepo, nil, nil, "openrt.local", nil)
	mux := http.NewServeMux()

	passthrough := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := context.WithValue(r.Context(), domain.TenantContextKey, tenant)
			ctx = context.WithValue(ctx, middleware.RoleContextKey, domain.RoleResident)
			ctx = context.WithValue(ctx, middleware.UserContextKey, uuid.New())
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
	handler.RegisterRoutes(mux, passthrough, passthrough)

	// 1. Post comment
	body, _ := json.Marshal(map[string]string{"content": "Komentar warga pertama"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/announcements/"+annID.String()+"/comments", bytes.NewReader(body))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created, got %d: %s", w.Code, w.Body.String())
	}

	// 2. Get comments private
	reqGet := httptest.NewRequest(http.MethodGet, "/api/v1/announcements/"+annID.String()+"/comments", nil)
	wGet := httptest.NewRecorder()
	mux.ServeHTTP(wGet, reqGet)

	if wGet.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", wGet.Code, wGet.Body.String())
	}
}

type mockCommentIntegrationRepo struct {
	announcements map[uuid.UUID]*domain.Announcement
	comments      []*domain.AnnouncementComment
}

type mockCommentIntegrationUsecase struct {
	repo *mockCommentIntegrationRepo
}

func (u *mockCommentIntegrationUsecase) CreateAnnouncement(ctx context.Context, tenantID uuid.UUID, a *domain.Announcement) error {
	return nil
}
func (u *mockCommentIntegrationUsecase) GetAnnouncement(ctx context.Context, tenantID, id uuid.UUID) (*domain.Announcement, error) {
	return u.repo.announcements[id], nil
}
func (u *mockCommentIntegrationUsecase) ListAnnouncements(ctx context.Context, tenantID uuid.UUID, targetFilter *string, limit, offset int) ([]*domain.Announcement, int64, error) {
	return nil, 0, nil
}
func (u *mockCommentIntegrationUsecase) UpdateAnnouncement(ctx context.Context, tenantID uuid.UUID, a *domain.Announcement) error {
	return nil
}
func (u *mockCommentIntegrationUsecase) DeleteAnnouncement(ctx context.Context, tenantID, id uuid.UUID) error {
	return nil
}
func (u *mockCommentIntegrationUsecase) CreateDocument(ctx context.Context, tenantID uuid.UUID, doc *domain.Document, filename string, content io.Reader, contentType string) error {
	return nil
}
func (u *mockCommentIntegrationUsecase) GetDocument(ctx context.Context, tenantID, id uuid.UUID) (*domain.Document, error) {
	return nil, nil
}
func (u *mockCommentIntegrationUsecase) ListDocuments(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.Document, int64, error) {
	return nil, 0, nil
}
func (u *mockCommentIntegrationUsecase) UpdateDocument(ctx context.Context, tenantID uuid.UUID, doc *domain.Document) error {
	return nil
}
func (u *mockCommentIntegrationUsecase) DeleteDocument(ctx context.Context, tenantID, id uuid.UUID) error {
	return nil
}
func (u *mockCommentIntegrationUsecase) CreateComment(ctx context.Context, tenantID uuid.UUID, c *domain.AnnouncementComment) error {
	c.ID = uuid.New()
	c.CreatedAt = time.Now()
	u.repo.comments = append(u.repo.comments, c)
	return nil
}
func (u *mockCommentIntegrationUsecase) ListComments(ctx context.Context, tenantID, announcementID uuid.UUID) ([]*domain.AnnouncementComment, error) {
	return u.repo.comments, nil
}
func (u *mockCommentIntegrationUsecase) DeleteComment(ctx context.Context, tenantID, id uuid.UUID) error {
	return nil
}
