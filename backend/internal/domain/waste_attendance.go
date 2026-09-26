package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// WasteCollector adalah master data pemuda / petugas pengambil sampah
type WasteCollector struct {
	ID         uuid.UUID  `json:"id"`
	TenantID   uuid.UUID  `json:"tenant_id"`
	ResidentID *uuid.UUID `json:"resident_id,omitempty"`
	Name       string     `json:"name"`
	Phone      string     `json:"phone,omitempty"`
	IsActive   bool       `json:"is_active"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
	DeletedAt  *time.Time `json:"deleted_at,omitempty"`
}

// WasteAttendanceMember adalah data petugas yang bertugas pada sesi penarikan tertentu
type WasteAttendanceMember struct {
	ID           uuid.UUID `json:"id"`
	AttendanceID uuid.UUID `json:"attendance_id"`
	CollectorID  uuid.UUID `json:"collector_id"`
	CollectorName string   `json:"collector_name,omitempty"`
	WageAmount   float64   `json:"wage_amount"`
	CreatedAt    time.Time `json:"created_at"`
}

// WasteAttendance adalah rekap absensi penarikan sampah pada suatu tanggal
type WasteAttendance struct {
	ID            uuid.UUID               `json:"id"`
	TenantID      uuid.UUID               `json:"tenant_id"`
	Date          string                  `json:"date"` // YYYY-MM-DD
	WagePerPerson float64                 `json:"wage_per_person"`
	TotalWage     float64                 `json:"total_wage"`
	Notes         string                  `json:"notes,omitempty"`
	CreatedBy     *uuid.UUID              `json:"created_by,omitempty"`
	Members       []WasteAttendanceMember `json:"members,omitempty"`
	CreatedAt     time.Time               `json:"created_at"`
	UpdatedAt     time.Time               `json:"updated_at"`
	DeletedAt     *time.Time              `json:"deleted_at,omitempty"`
}

type WasteAttendanceRepository interface {
	// Collectors
	ListCollectors(ctx context.Context, tenantID uuid.UUID, onlyActive bool) ([]WasteCollector, error)
	GetCollectorByID(ctx context.Context, tenantID, id uuid.UUID) (*WasteCollector, error)
	CreateCollector(ctx context.Context, c *WasteCollector) error
	UpdateCollector(ctx context.Context, c *WasteCollector) error
	DeleteCollector(ctx context.Context, tenantID, id uuid.UUID) error

	// Attendance
	ListAttendance(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]WasteAttendance, int, error)
	GetAttendanceByID(ctx context.Context, tenantID, id uuid.UUID) (*WasteAttendance, error)
	CreateAttendance(ctx context.Context, a *WasteAttendance) error
	DeleteAttendance(ctx context.Context, tenantID, id uuid.UUID) error
}

type WasteAttendanceUsecase interface {
	ListCollectors(ctx context.Context, tenantID uuid.UUID, onlyActive bool) ([]WasteCollector, error)
	CreateCollector(ctx context.Context, tenantID uuid.UUID, residentID *uuid.UUID, name, phone string) (*WasteCollector, error)
	UpdateCollector(ctx context.Context, tenantID, id uuid.UUID, residentID *uuid.UUID, name, phone string, isActive bool) (*WasteCollector, error)
	DeleteCollector(ctx context.Context, tenantID, id uuid.UUID) error

	ListAttendance(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]WasteAttendance, int, error)
	CreateAttendance(ctx context.Context, tenantID uuid.UUID, date string, collectorIDs []uuid.UUID, wagePerPerson float64, notes string, createdBy *uuid.UUID) (*WasteAttendance, error)
	DeleteAttendance(ctx context.Context, tenantID, id uuid.UUID) error
}
