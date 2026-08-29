package usecase

import (
	"context"

	"backend/internal/domain"
)

type auditLogUsecase struct {
	repo domain.AuditLogRepository
}

func NewAuditLogUsecase(repo domain.AuditLogRepository) domain.AuditLogUsecase {
	return &auditLogUsecase{repo: repo}
}

func (u *auditLogUsecase) Log(ctx context.Context, log *domain.AuditLog) error {
	return u.repo.Create(ctx, log)
}

func (u *auditLogUsecase) ListLogs(ctx context.Context, filter domain.AuditLogFilter) ([]domain.AuditLog, int, error) {
	return u.repo.List(ctx, filter)
}
