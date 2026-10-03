package usecase_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"backend/internal/domain"
	"backend/internal/usecase"
)

type mockWasteAttendanceRepo struct {
	collectors  []domain.WasteCollector
	attendances []domain.WasteAttendance
}

func newMockWasteAttendanceRepo() *mockWasteAttendanceRepo {
	return &mockWasteAttendanceRepo{}
}

func (m *mockWasteAttendanceRepo) ListCollectors(ctx context.Context, tenantID uuid.UUID, onlyActive bool) ([]domain.WasteCollector, error) {
	return m.collectors, nil
}
func (m *mockWasteAttendanceRepo) GetCollectorByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.WasteCollector, error) {
	for _, c := range m.collectors {
		if c.ID == id {
			return &c, nil
		}
	}
	return nil, nil
}
func (m *mockWasteAttendanceRepo) CreateCollector(ctx context.Context, c *domain.WasteCollector) error {
	m.collectors = append(m.collectors, *c)
	return nil
}
func (m *mockWasteAttendanceRepo) UpdateCollector(ctx context.Context, c *domain.WasteCollector) error {
	return nil
}
func (m *mockWasteAttendanceRepo) DeleteCollector(ctx context.Context, tenantID, id uuid.UUID) error {
	return nil
}
func (m *mockWasteAttendanceRepo) ListAttendance(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]domain.WasteAttendance, int, error) {
	return m.attendances, len(m.attendances), nil
}
func (m *mockWasteAttendanceRepo) GetAttendanceByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.WasteAttendance, error) {
	for _, a := range m.attendances {
		if a.ID == id {
			return &a, nil
		}
	}
	return nil, nil
}
func (m *mockWasteAttendanceRepo) CreateAttendance(ctx context.Context, a *domain.WasteAttendance) error {
	m.attendances = append(m.attendances, *a)
	return nil
}
func (m *mockWasteAttendanceRepo) DeleteAttendance(ctx context.Context, tenantID, id uuid.UUID) error {
	return nil
}

func TestWasteAttendanceUsecase_Calculation(t *testing.T) {
	repo := newMockWasteAttendanceRepo()
	uc := usecase.NewWasteAttendanceUsecase(repo)
	ctx := context.Background()
	tenantID := uuid.New()

	// 1. Buat petugas piket
	col1, err := uc.CreateCollector(ctx, tenantID, nil, "Pemuda A", "08111")
	if err != nil {
		t.Fatalf("CreateCollector 1 failed: %v", err)
	}
	col2, err := uc.CreateCollector(ctx, tenantID, nil, "Pemuda B", "08222")
	if err != nil {
		t.Fatalf("CreateCollector 2 failed: %v", err)
	}

	// 2. Catat presensi giat timbang sampah: 2 petugas masing-masing uang lelah Rp 25.000
	collectorIDs := []uuid.UUID{col1.ID, col2.ID}
	att, err := uc.CreateAttendance(ctx, tenantID, "2026-10-03", collectorIDs, 25000, "Giat Minggu Pagi", nil)
	if err != nil {
		t.Fatalf("CreateAttendance failed: %v", err)
	}

	// Total uang lelah harus 2 * 25.000 = Rp 50.000
	if att.TotalWage != 50000 {
		t.Errorf("expected total wage 50000, got %f", att.TotalWage)
	}
	if len(att.Members) != 2 {
		t.Errorf("expected 2 members, got %d", len(att.Members))
	}
}
