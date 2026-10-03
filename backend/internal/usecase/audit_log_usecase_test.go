package usecase_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"backend/internal/domain"
	"backend/internal/usecase"
)

type mockAuditLogRepo struct {
	logs []domain.AuditLog
}

func newMockAuditLogRepo() *mockAuditLogRepo {
	return &mockAuditLogRepo{}
}

func (m *mockAuditLogRepo) Create(ctx context.Context, log *domain.AuditLog) error {
	m.logs = append(m.logs, *log)
	return nil
}

func (m *mockAuditLogRepo) List(ctx context.Context, filter domain.AuditLogFilter) ([]domain.AuditLog, int, error) {
	var list []domain.AuditLog
	for _, l := range m.logs {
		if filter.TenantID != nil && (l.TenantID == nil || *l.TenantID != *filter.TenantID) {
			continue
		}
		list = append(list, l)
	}
	return list, len(list), nil
}

func TestAuditLogUsecase_LogAndList(t *testing.T) {
	repo := newMockAuditLogRepo()
	uc := usecase.NewAuditLogUsecase(repo)
	ctx := context.Background()
	tenantID := uuid.New()
	userID := uuid.New()

	// 1. Catat log
	err := uc.Log(ctx, &domain.AuditLog{
		ID:        uuid.New(),
		TenantID:  &tenantID,
		UserID:    &userID,
		Action:    "DUES_PAYMENT_RECORDED",
		Resource:  "dues_payments",
		CreatedAt: time.Now(),
	})
	if err != nil {
		t.Fatalf("Log failed: %v", err)
	}

	// 2. Ambil list log
	logs, total, err := uc.ListLogs(ctx, domain.AuditLogFilter{TenantID: &tenantID})
	if err != nil {
		t.Fatalf("ListLogs failed: %v", err)
	}
	if total != 1 || len(logs) != 1 {
		t.Errorf("expected 1 log, got %d", total)
	}
	if logs[0].Action != "DUES_PAYMENT_RECORDED" {
		t.Errorf("expected action DUES_PAYMENT_RECORDED, got %s", logs[0].Action)
	}
}
