package usecase_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"backend/internal/domain"
	"backend/internal/usecase"
)

type mockRTStructureRepo struct {
	periods []*domain.RTPeriod
	members []*domain.RTMember
}

func newMockRTStructureRepo() *mockRTStructureRepo {
	return &mockRTStructureRepo{}
}

func (m *mockRTStructureRepo) CreatePeriod(ctx context.Context, p *domain.RTPeriod) error {
	m.periods = append(m.periods, p)
	return nil
}

func (m *mockRTStructureRepo) UpdatePeriod(ctx context.Context, p *domain.RTPeriod) error {
	for i, period := range m.periods {
		if period.ID == p.ID {
			m.periods[i] = p
		}
	}
	return nil
}

func (m *mockRTStructureRepo) GetPeriodByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.RTPeriod, error) {
	for _, period := range m.periods {
		if period.ID == id {
			return period, nil
		}
	}
	return nil, nil
}

func (m *mockRTStructureRepo) GetActivePeriod(ctx context.Context, tenantID uuid.UUID) (*domain.RTPeriod, error) {
	for _, period := range m.periods {
		if period.Status == "active" {
			return period, nil
		}
	}
	return nil, nil
}

func (m *mockRTStructureRepo) ListPeriods(ctx context.Context, tenantID uuid.UUID, status string) ([]*domain.RTPeriod, error) {
	return m.periods, nil
}

func (m *mockRTStructureRepo) AddMember(ctx context.Context, mMem *domain.RTMember) error {
	m.members = append(m.members, mMem)
	return nil
}
func (m *mockRTStructureRepo) GetMemberByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.RTMember, error) {
	return nil, nil
}
func (m *mockRTStructureRepo) ListMembers(ctx context.Context, tenantID, periodID uuid.UUID, section, role, status string) ([]*domain.RTMember, error) {
	return m.members, nil
}
func (m *mockRTStructureRepo) UpdateMember(ctx context.Context, mMem *domain.RTMember) error {
	return nil
}
func (m *mockRTStructureRepo) DeleteMember(ctx context.Context, tenantID, id uuid.UUID) error {
	return nil
}

func TestRTStructureUsecase_PeriodManagement(t *testing.T) {
	repo := newMockRTStructureRepo()
	uc := usecase.NewRTStructureUsecase(repo)
	ctx := context.Background()
	tenantID := uuid.New()

	// 1. Buat Periode 1 (Aktif)
	p1 := &domain.RTPeriod{
		ID:        uuid.New(),
		TenantID:  tenantID,
		Name:      "Periode 2021-2024",
		StartDate: time.Now().AddDate(-3, 0, 0),
		EndDate:   time.Now(),
		Status:    "active",
	}
	err := uc.CreatePeriod(ctx, tenantID, p1)
	if err != nil {
		t.Fatalf("CreatePeriod failed: %v", err)
	}

	// 2. Verifikasi periode aktif
	active, err := uc.GetActivePeriod(ctx, tenantID)
	if err != nil || active == nil {
		t.Fatalf("GetActivePeriod failed: %v", err)
	}
	if active.Name != "Periode 2021-2024" {
		t.Errorf("expected active period name 'Periode 2021-2024', got %s", active.Name)
	}
}
