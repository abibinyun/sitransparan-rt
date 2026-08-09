package usecase_test

import (
	"bytes"
	"context"
	"io"
	"testing"
	"time"

	"backend/internal/domain"
	"backend/internal/repository"
	"backend/internal/usecase"
	"github.com/google/uuid"
)

type mockEventRepo struct {
	events       map[uuid.UUID]*domain.Event
	budgets      map[uuid.UUID][]*domain.EventBudget
	participants map[string]*domain.EventParticipant
	roles        map[uuid.UUID][]*domain.EventRole
	receipts     map[uuid.UUID][]*domain.EventReceipt
}

func newMockEventRepo() *mockEventRepo {
	return &mockEventRepo{
		events:       make(map[uuid.UUID]*domain.Event),
		budgets:      make(map[uuid.UUID][]*domain.EventBudget),
		participants: make(map[string]*domain.EventParticipant),
		roles:        make(map[uuid.UUID][]*domain.EventRole),
		receipts:     make(map[uuid.UUID][]*domain.EventReceipt),
	}
}

func (m *mockEventRepo) CreateEvent(ctx context.Context, event *domain.Event) error {
	if event.ID == uuid.Nil {
		event.ID = uuid.New()
	}
	event.CreatedAt = time.Now()
	event.UpdatedAt = time.Now()
	m.events[event.ID] = event
	return nil
}

func (m *mockEventRepo) GetEventByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Event, error) {
	e, ok := m.events[id]
	if !ok || e.TenantID != tenantID {
		return nil, repository.ErrNotFound
	}
	return e, nil
}

func (m *mockEventRepo) UpdateEvent(ctx context.Context, event *domain.Event) error {
	e, ok := m.events[event.ID]
	if !ok || e.TenantID != event.TenantID {
		return repository.ErrNotFound
	}
	event.UpdatedAt = time.Now()
	m.events[event.ID] = event
	return nil
}

func (m *mockEventRepo) DeleteEvent(ctx context.Context, tenantID, id uuid.UUID) error {
	e, ok := m.events[id]
	if !ok || e.TenantID != tenantID {
		return repository.ErrNotFound
	}
	delete(m.events, id)
	return nil
}

func (m *mockEventRepo) ListEvents(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.Event, int64, error) {
	var list []*domain.Event
	for _, e := range m.events {
		if e.TenantID == tenantID {
			list = append(list, e)
		}
	}
	total := int64(len(list))
	if offset >= len(list) {
		return []*domain.Event{}, total, nil
	}
	end := offset + limit
	if end > len(list) {
		end = len(list)
	}
	return list[offset:end], total, nil
}

func (m *mockEventRepo) AddOrUpdateBudget(ctx context.Context, budget *domain.EventBudget) error {
	if budget.ID == uuid.Nil {
		budget.ID = uuid.New()
	}
	budget.CreatedAt = time.Now()
	budget.UpdatedAt = time.Now()
	m.budgets[budget.EventID] = append(m.budgets[budget.EventID], budget)
	return nil
}

func (m *mockEventRepo) GetBudgetByEventID(ctx context.Context, eventID uuid.UUID) (*domain.EventBudget, error) {
	list, ok := m.budgets[eventID]
	if !ok || len(list) == 0 {
		return nil, repository.ErrNotFound
	}
	return list[len(list)-1], nil
}

func (m *mockEventRepo) ListBudgetsByEventID(ctx context.Context, eventID uuid.UUID) ([]*domain.EventBudget, error) {
	return m.budgets[eventID], nil
}

func (m *mockEventRepo) AddOrUpdateParticipant(ctx context.Context, participant *domain.EventParticipant) error {
	if participant.ID == uuid.Nil {
		participant.ID = uuid.New()
	}
	key := participant.EventID.String() + "_" + participant.ResidentID.String()
	participant.CreatedAt = time.Now()
	participant.UpdatedAt = time.Now()
	m.participants[key] = participant
	return nil
}

func (m *mockEventRepo) ListParticipantsByEventID(ctx context.Context, eventID uuid.UUID) ([]*domain.EventParticipant, error) {
	var list []*domain.EventParticipant
	for _, p := range m.participants {
		if p.EventID == eventID {
			list = append(list, p)
		}
	}
	return list, nil
}

func (m *mockEventRepo) AssignRole(ctx context.Context, role *domain.EventRole) error {
	if role.ID == uuid.Nil {
		role.ID = uuid.New()
	}
	role.CreatedAt = time.Now()
	role.UpdatedAt = time.Now()
	m.roles[role.EventID] = append(m.roles[role.EventID], role)
	return nil
}

func (m *mockEventRepo) ListRolesByEventID(ctx context.Context, eventID uuid.UUID) ([]*domain.EventRole, error) {
	return m.roles[eventID], nil
}

func (m *mockEventRepo) RemoveRole(ctx context.Context, eventID, roleID uuid.UUID) error {
	roles := m.roles[eventID]
	for i, r := range roles {
		if r.ID == roleID {
			m.roles[eventID] = append(roles[:i], roles[i+1:]...)
			return nil
		}
	}
	return repository.ErrNotFound
}

func (m *mockEventRepo) CreateReceipt(ctx context.Context, receipt *domain.EventReceipt) error {
	if receipt.ID == uuid.Nil {
		receipt.ID = uuid.New()
	}
	receipt.CreatedAt = time.Now()
	receipt.UpdatedAt = time.Now()
	m.receipts[receipt.EventID] = append(m.receipts[receipt.EventID], receipt)
	return nil
}

func (m *mockEventRepo) ListReceiptsByEventID(ctx context.Context, eventID uuid.UUID) ([]*domain.EventReceipt, error) {
	return m.receipts[eventID], nil
}

func (m *mockEventRepo) UploadReceiptFile(ctx context.Context, filename string, content io.Reader, contentType string) (string, error) {
	return "/storage/events/receipts/" + filename, nil
}

func TestEventUsecase_CRUD_Budget_RSVP(t *testing.T) {
	repo := newMockEventRepo()
	uc := usecase.NewEventUsecase(repo)
	ctx := context.Background()
	tenantID := uuid.New()

	// 1. Create Event
	evt := &domain.Event{
		Title:  "17 Agustus",
		Status: "planned",
	}
	err := uc.CreateEvent(ctx, tenantID, evt)
	if err != nil {
		t.Fatalf("CreateEvent failed: %v", err)
	}
	if evt.ID == uuid.Nil {
		t.Fatalf("expected non-nil ID")
	}

	// 2. Get Event
	got, err := uc.GetEvent(ctx, tenantID, evt.ID)
	if err != nil {
		t.Fatalf("GetEvent failed: %v", err)
	}
	if got.Title != "17 Agustus" {
		t.Fatalf("expected title '17 Agustus', got '%s'", got.Title)
	}

	// 3. List Events
	events, count, err := uc.ListEvents(ctx, tenantID, 10, 0)
	if err != nil || count != 1 || len(events) != 1 {
		t.Fatalf("ListEvents failed: count=%d, err=%v", count, err)
	}

	// 4. Update Event
	evt.Title = "Lomba 17 Agustus"
	err = uc.UpdateEvent(ctx, tenantID, evt)
	if err != nil {
		t.Fatalf("UpdateEvent failed: %v", err)
	}

	// 5. Add / Update Budget (Story 4.1 RAB Style)
	budget := &domain.EventBudget{
		Item:          "Hadiah Lomba",
		Category:      "Perlengkapan",
		Description:   "Hadiah Juara 1-3",
		PlannedAmount: 500000,
		ActualAmount:  450000,
	}
	err = uc.AddOrUpdateBudget(ctx, tenantID, evt.ID, budget)
	if err != nil {
		t.Fatalf("AddOrUpdateBudget failed: %v", err)
	}

	budgets, err := uc.ListBudgets(ctx, tenantID, evt.ID)
	if err != nil || len(budgets) != 1 {
		t.Fatalf("ListBudgets failed: %v", err)
	}
	if budgets[0].Item != "Hadiah Lomba" || budgets[0].PlannedAmount != 500000 {
		t.Fatalf("unexpected RAB budget data: %+v", budgets[0])
	}

	// 6. RSVP
	participant := &domain.EventParticipant{
		ResidentID: uuid.New(),
		Status:     "attending",
	}
	err = uc.RSVP(ctx, tenantID, evt.ID, participant)
	if err != nil {
		t.Fatalf("RSVP failed: %v", err)
	}

	// 7. Event Committee Roles (Story 4.2)
	resID := uuid.New()
	role := &domain.EventRole{
		ResidentID: resID,
		Role:       "Ketua Panitia",
	}
	err = uc.AssignRole(ctx, tenantID, evt.ID, role)
	if err != nil {
		t.Fatalf("AssignRole failed: %v", err)
	}

	roles, err := uc.ListRoles(ctx, tenantID, evt.ID)
	if err != nil || len(roles) != 1 {
		t.Fatalf("ListRoles failed: %v", err)
	}
	if roles[0].Role != "Ketua Panitia" {
		t.Fatalf("expected role 'Ketua Panitia', got '%s'", roles[0].Role)
	}

	// Remove Role
	err = uc.RemoveRole(ctx, tenantID, evt.ID, roles[0].ID)
	if err != nil {
		t.Fatalf("RemoveRole failed: %v", err)
	}
	roles, _ = uc.ListRoles(ctx, tenantID, evt.ID)
	if len(roles) != 0 {
		t.Fatalf("expected 0 roles after removal, got %d", len(roles))
	}

	// 8. Event Transparency & Donation Receipts (Story 4.3)
	receipt, err := uc.UploadDonationReceipt(ctx, tenantID, evt.ID, &resID, "transfer_donasi.png", bytes.NewBufferString("dummy image"), "image/png", 100000, "Donasi Acara 17an")
	if err != nil {
		t.Fatalf("UploadDonationReceipt failed: %v", err)
	}
	if receipt.Amount != 100000 || receipt.ReceiptURL == "" {
		t.Fatalf("unexpected receipt: %+v", receipt)
	}

	transparency, err := uc.GetTransparency(ctx, tenantID, evt.ID)
	if err != nil {
		t.Fatalf("GetTransparency failed: %v", err)
	}
	if transparency.Status != "planned" || transparency.TotalPlanned != 500000 || transparency.TotalDonations != 100000 {
		t.Fatalf("unexpected transparency view: %+v", transparency)
	}

	// 9. Tenant Isolation Test for GetEvent, UpdateEvent, DeleteEvent, AddOrUpdateBudget, RSVP
	otherTenantID := uuid.New()
	_, err = uc.GetEvent(ctx, otherTenantID, evt.ID)
	if err == nil {
		t.Fatalf("expected tenant isolation error on GetEvent, got nil")
	}

	otherEvt := *evt
	otherEvt.Title = "Hacked Title"
	err = uc.UpdateEvent(ctx, otherTenantID, &otherEvt)
	if err == nil {
		t.Fatalf("expected tenant isolation error on UpdateEvent, got nil")
	}

	err = uc.AddOrUpdateBudget(ctx, otherTenantID, evt.ID, budget)
	if err == nil {
		t.Fatalf("expected tenant isolation error on AddOrUpdateBudget, got nil")
	}

	// Delete Event
	err = uc.DeleteEvent(ctx, tenantID, evt.ID)
	if err != nil {
		t.Fatalf("DeleteEvent failed: %v", err)
	}
}
