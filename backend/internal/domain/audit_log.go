package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// AuditLog represents a record in public.audit_logs.
type AuditLog struct {
	ID           uuid.UUID              `json:"id"`
	TenantID     *uuid.UUID             `json:"tenant_id,omitempty"`
	UserID       *uuid.UUID             `json:"user_id,omitempty"`
	HouseID      *uuid.UUID             `json:"house_id,omitempty"`
	Action       string                 `json:"action"`
	Resource     string                 `json:"resource"`
	Payload      map[string]interface{} `json:"payload,omitempty"`
	IPAddress    string                 `json:"ip_address,omitempty"`
	UserAgent    string                 `json:"user_agent,omitempty"`
	Status       string                 `json:"status"` // "SUCCESS", "FAILED"
	ErrorMessage string                 `json:"error_message,omitempty"`
	CreatedAt    time.Time              `json:"created_at"`
}

type AuditLogFilter struct {
	TenantID  *uuid.UUID
	UserID    *uuid.UUID
	Action    string
	Resource  string
	StartDate *time.Time
	EndDate   *time.Time
	Limit     int
	Offset    int
}

type AuditLogRepository interface {
	Create(ctx context.Context, log *AuditLog) error
	List(ctx context.Context, filter AuditLogFilter) ([]AuditLog, int, error)
}

type AuditLogUsecase interface {
	Log(ctx context.Context, log *AuditLog) error
	ListLogs(ctx context.Context, filter AuditLogFilter) ([]AuditLog, int, error)
}
