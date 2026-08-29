package usecase_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"backend/internal/domain"
	"backend/internal/usecase"
	"github.com/google/uuid"
)

type mockKarangTarunaRepo struct {
	periods map[uuid.UUID]*domain.KarangTarunaPeriod
	configs map[uuid.UUID]*domain.KarangTarunaConfig
	members map[uuid.UUID]*domain.KarangTarunaMember
}

func newMockKarangTarunaRepo() *mockKarangTarunaRepo {
	return &mockKarangTarunaRepo{
		periods: make(map[uuid.UUID]*domain.KarangTarunaPeriod),
		configs: make(map[uuid.UUID]*domain.KarangTarunaConfig),
		members: make(map[uuid.UUID]*domain.KarangTarunaMember),
	}
}

func (m *mockKarangTarunaRepo) CreatePeriod(ctx context.Context, p *domain.KarangTarunaPeriod) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	m.periods[p.ID] = p
	return nil
}

func (m *mockKarangTarunaRepo) GetPeriodByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.KarangTarunaPeriod, error) {
	if p, ok := m.periods[id]; ok && p.TenantID == tenantID {
		return p, nil
	}
	return nil, errors.New("not found")
}

func (m *mockKarangTarunaRepo) GetActivePeriod(ctx context.Context, tenantID uuid.UUID) (*domain.KarangTarunaPeriod, error) {
	for _, p := range m.periods {
		if p.TenantID == tenantID && p.Status == "active" {
			return p, nil
		}
	}
	return nil, errors.New("not found")
}

func (m *mockKarangTarunaRepo) ListPeriods(ctx context.Context, tenantID uuid.UUID, status string) ([]*domain.KarangTarunaPeriod, error) {
	var res []*domain.KarangTarunaPeriod
	for _, p := range m.periods {
		if p.TenantID == tenantID {
			if status == "" || p.Status == status {
				res = append(res, p)
			}
		}
	}
	return res, nil
}

func (m *mockKarangTarunaRepo) UpdatePeriod(ctx context.Context, p *domain.KarangTarunaPeriod) error {
	m.periods[p.ID] = p
	return nil
}

func (m *mockKarangTarunaRepo) SaveConfig(ctx context.Context, c *domain.KarangTarunaConfig) error {
	m.configs[c.PeriodID] = c
	return nil
}

func (m *mockKarangTarunaRepo) GetConfig(ctx context.Context, periodID uuid.UUID) (*domain.KarangTarunaConfig, error) {
	if c, ok := m.configs[periodID]; ok {
		return c, nil
	}
	return &domain.KarangTarunaConfig{
		PeriodID:        periodID,
		AllowedRoles:    []string{"ketua", "anggota"},
		AllowedSections: []string{"Olahraga", "Seni"},
	}, nil
}

func (m *mockKarangTarunaRepo) AddMember(ctx context.Context, mem *domain.KarangTarunaMember) error {
	if mem.ID == uuid.Nil {
		mem.ID = uuid.New()
	}
	m.members[mem.ID] = mem
	return nil
}

func (m *mockKarangTarunaRepo) GetMemberByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.KarangTarunaMember, error) {
	if mem, ok := m.members[id]; ok {
		return mem, nil
	}
	return nil, errors.New("not found")
}

func (m *mockKarangTarunaRepo) ListMembers(ctx context.Context, tenantID, periodID uuid.UUID, section, role, status string) ([]*domain.KarangTarunaMember, error) {
	var res []*domain.KarangTarunaMember
	for _, mem := range m.members {
		if mem.PeriodID == periodID {
			if (section == "" || (mem.Section != nil && *mem.Section == section)) &&
				(role == "" || mem.Role == role) &&
				(status == "" || mem.Status == status) {
				res = append(res, mem)
			}
		}
	}
	return res, nil
}

func (m *mockKarangTarunaRepo) UpdateMember(ctx context.Context, mem *domain.KarangTarunaMember) error {
	m.members[mem.ID] = mem
	return nil
}

func (m *mockKarangTarunaRepo) DeleteMember(ctx context.Context, tenantID, id uuid.UUID) error {
	delete(m.members, id)
	return nil
}

func (m *mockKarangTarunaRepo) IsKetua(ctx context.Context, tenantID, userID uuid.UUID) (bool, error) {
	return false, nil
}

func TestKarangTarunaUsecase(t *testing.T) {
	repo := newMockKarangTarunaRepo()
	uc := usecase.NewKarangTarunaUsecase(repo)

	ctx := context.Background()
	tenantID := uuid.New()
	residentID := uuid.New()

	// 1. Create Period
	period := &domain.KarangTarunaPeriod{
		Name:      "Masa Bakti 2024-2027",
		StartDate: time.Now(),
		EndDate:   time.Now().AddDate(3, 0, 0),
		Status:    "active",
	}
	if err := uc.CreatePeriod(ctx, tenantID, period); err != nil {
		t.Fatalf("failed to create period: %v", err)
	}

	// 2. Get Active Period
	act, err := uc.GetActivePeriod(ctx, tenantID)
	if err != nil || act.Name != period.Name {
		t.Fatalf("failed to get active period: %v", err)
	}

	// 3. Add Member
	sec := "Olahraga & Seni"
	member := &domain.KarangTarunaMember{
		PeriodID:   period.ID,
		ResidentID: residentID,
		Role:       "ketua",
		Section:    &sec,
		Status:     "aktif",
	}
	if err := uc.AddMember(ctx, tenantID, member); err != nil {
		t.Fatalf("failed to add member: %v", err)
	}

	// 4. List Members
	members, err := uc.ListMembers(ctx, tenantID, period.ID, "", "", "")
	if err != nil || len(members) != 1 {
		t.Fatalf("failed to list members: %v, count: %d", err, len(members))
	}
	if members[0].Role != "ketua" {
		t.Fatalf("expected ketua role, got: %s", members[0].Role)
	}

	// 5. Update Config
	if err := uc.UpdateConfig(ctx, tenantID, period.ID, []string{"ketua", "wakil", "anggota"}, []string{"Humas", "Olahraga"}); err != nil {
		t.Fatalf("failed to update config: %v", err)
	}
}
