package middleware_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"
)

type mockAuditUC struct {
	mu      sync.Mutex
	lastLog *domain.AuditLog
}

func (m *mockAuditUC) Log(ctx context.Context, log *domain.AuditLog) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.lastLog = log
	return nil
}

func (m *mockAuditUC) GetLastLog() *domain.AuditLog {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.lastLog
}

func (m *mockAuditUC) ListLogs(ctx context.Context, filter domain.AuditLogFilter) ([]domain.AuditLog, int, error) {
	return nil, 0, nil
}

func TestAuditMiddleware_ExtractClaims(t *testing.T) {
	uc := &mockAuditUC{}
	mw := middleware.AuditMiddleware(uc)

	uID := uuid.New()
	tID := uuid.New()

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":   uID.String(),
		"tenant_id": tID.String(),
		"role":      "admin_rt",
	})
	tokenString, err := token.SignedString([]byte("testsecret"))
	if err != nil {
		t.Fatalf("failed to sign token: %v", err)
	}

	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("POST", "/api/v1/residents", nil)
	req.Header.Set("Authorization", "Bearer "+tokenString)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	// Sleep for async goroutine
	time.Sleep(50 * time.Millisecond)

	lastLog := uc.GetLastLog()
	if lastLog == nil {
		t.Fatalf("expected audit log to be recorded")
	}
	if lastLog.TenantID == nil || *lastLog.TenantID != tID {
		t.Errorf("expected tenantID %v, got %v", tID, lastLog.TenantID)
	}
	if lastLog.UserID == nil || *lastLog.UserID != uID {
		t.Errorf("expected userID %v, got %v", uID, lastLog.UserID)
	}
}
