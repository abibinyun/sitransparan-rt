package usecase_test

import (
	"context"
	"testing"

	"backend/internal/domain"
	"backend/internal/usecase"
	"github.com/google/uuid"
)

type mockResidentRepo struct {
	residents map[uuid.UUID]*domain.Resident
	members   map[uuid.UUID][]*domain.FamilyMember
}

func newMockResidentRepo() *mockResidentRepo {
	return &mockResidentRepo{
		residents: make(map[uuid.UUID]*domain.Resident),
		members:   make(map[uuid.UUID][]*domain.FamilyMember),
	}
}

func (m *mockResidentRepo) Create(ctx context.Context, resident *domain.Resident) error {
	if resident.ID == uuid.Nil {
		resident.ID = uuid.New()
	}
	m.residents[resident.ID] = resident
	return nil
}

func (m *mockResidentRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Resident, error) {
	res, ok := m.residents[id]
	if !ok || res.TenantID != tenantID {
		return nil, usecase.ErrResidentNotFound
	}
	res.FamilyMembers = m.members[id]
	return res, nil
}

func (m *mockResidentRepo) Update(ctx context.Context, resident *domain.Resident) error {
	res, ok := m.residents[resident.ID]
	if !ok || res.TenantID != resident.TenantID {
		return usecase.ErrResidentNotFound
	}
	m.residents[resident.ID] = resident
	return nil
}

func (m *mockResidentRepo) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	res, ok := m.residents[id]
	if !ok || res.TenantID != tenantID {
		return usecase.ErrResidentNotFound
	}
	delete(m.residents, id)
	return nil
}

func (m *mockResidentRepo) List(ctx context.Context, tenantID uuid.UUID, query string, limit, offset int) ([]*domain.Resident, int64, error) {
	var res []*domain.Resident
	for _, r := range m.residents {
		if r.TenantID == tenantID {
			res = append(res, r)
		}
	}
	return res, int64(len(res)), nil
}

func (m *mockResidentRepo) AddFamilyMember(ctx context.Context, member *domain.FamilyMember) error {
	if member.ID == uuid.Nil {
		member.ID = uuid.New()
	}
	m.members[member.ResidentID] = append(m.members[member.ResidentID], member)
	return nil
}

func (m *mockResidentRepo) RemoveFamilyMember(ctx context.Context, tenantID, residentID, memberID uuid.UUID) error {
	res, ok := m.residents[residentID]
	if !ok || res.TenantID != tenantID {
		return usecase.ErrResidentNotFound
	}
	list := m.members[residentID]
	var newList []*domain.FamilyMember
	found := false
	for _, mem := range list {
		if mem.ID == memberID {
			found = true
			continue
		}
		newList = append(newList, mem)
	}
	if !found {
		return usecase.ErrResidentNotFound
	}
	m.members[residentID] = newList
	return nil
}

func (m *mockResidentRepo) GetFamilyMembers(ctx context.Context, residentID uuid.UUID) ([]*domain.FamilyMember, error) {
	return m.members[residentID], nil
}

func TestResidentUsecase(t *testing.T) {
	repo := newMockResidentRepo()
	uc := usecase.NewResidentUsecase(repo)

	ctx := context.Background()
	tenantID := uuid.New()

	// 1. Create
	name := "Budi"
	res := &domain.Resident{FullName: &name}
	err := uc.Create(ctx, tenantID, res)
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if res.ID == uuid.Nil {
		t.Errorf("expected resident ID to be generated")
	}

	// 2. GetByID
	got, err := uc.GetByID(ctx, tenantID, res.ID)
	if err != nil || got.FullName == nil || *got.FullName != "Budi" {
		t.Fatalf("GetByID failed: %v", err)
	}

	// 3. Update
	updatedName := "Budi Santoso"
	got.FullName = &updatedName
	if err := uc.Update(ctx, tenantID, got); err != nil {
		t.Fatalf("Update failed: %v", err)
	}

	// 4. Add Family Member
	fmName := "Siti"
	fm := &domain.FamilyMember{ResidentID: res.ID, FullName: &fmName}
	if err := uc.AddFamilyMember(ctx, tenantID, fm); err != nil {
		t.Fatalf("AddFamilyMember failed: %v", err)
	}

	gotWithFamily, _ := uc.GetByID(ctx, tenantID, res.ID)
	if len(gotWithFamily.FamilyMembers) != 1 {
		t.Fatalf("expected 1 family member, got %d", len(gotWithFamily.FamilyMembers))
	}

	// 5. Remove Family Member
	if err := uc.RemoveFamilyMember(ctx, tenantID, res.ID, fm.ID); err != nil {
		t.Fatalf("RemoveFamilyMember failed: %v", err)
	}

	// 6. Delete
	if err := uc.Delete(ctx, tenantID, res.ID); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}
}
