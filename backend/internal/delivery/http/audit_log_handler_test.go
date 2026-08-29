package http

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"

	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"
)

type mockAuditUsecase struct {
	logs  []domain.AuditLog
	total int
	err   error
}

func (m *mockAuditUsecase) Log(ctx context.Context, log *domain.AuditLog) error {
	m.logs = append(m.logs, *log)
	return nil
}

func (m *mockAuditUsecase) ListLogs(ctx context.Context, filter domain.AuditLogFilter) ([]domain.AuditLog, int, error) {
	return m.logs, m.total, m.err
}

func TestAuditLogHandler_List(t *testing.T) {
	tid := uuid.New()
	uid := uuid.New()
	mockUC := &mockAuditUsecase{
		logs: []domain.AuditLog{
			{
				ID:        uuid.New(),
				TenantID:  &tid,
				UserID:    &uid,
				Action:    "POST /api/v1/financial/transactions",
				Resource:  "financial",
				Status:    "SUCCESS",
				CreatedAt: time.Now(),
			},
		},
		total: 1,
	}

	handler := NewAuditLogHandler(mockUC)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/audit-logs", nil)
	ctx := context.WithValue(req.Context(), middleware.RoleContextKey, "admin_rt")
	ctx = context.WithValue(ctx, middleware.TenantContextKey, &domain.Tenant{ID: tid, Slug: "sitransparan-rt"})
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()
	handler.List(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestAuditLogHandler_MethodNotAllowed(t *testing.T) {
	mockUC := &mockAuditUsecase{}
	handler := NewAuditLogHandler(mockUC)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/audit-logs", nil)
	w := httptest.NewRecorder()
	handler.List(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected status 405, got %d", w.Code)
	}
}
