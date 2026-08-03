package usecase_test

import (
	"context"
	"testing"
	"time"

	"backend/internal/domain"
	"backend/internal/repository"
	"backend/internal/usecase"
	"github.com/google/uuid"
)

type mockEventRepo struct {
	events       map[uuid.UUID]*domain.Event
	budgets      map[uuid.UUID]*domain.EventBudget
	participants map[string]*domain.EventParticipant
}

func newMockEventRepo() *mockEventRepo {
	return &mockEventRepo{
		events:       make(map[uuid.UUID]*domain.Event),
		budgets:      make(map[uuid.UUID]*domain.EventBudget),
		participants: make(map[string]*domain.EventParticipant),
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
	m.budgets[budget.EventID] = budget
	return nil
}

func (m *mockEventRepo) GetBudgetByEventID(ctx context.Context, eventID uuid.UUID) (*domain.EventBudget, error) {
	b, ok := m.budgets[eventID]
	if !ok {
		return nil, repository.ErrNotFound
	}
	return b, nil
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

	// 5. Add / Update Budget
	budget := &domain.EventBudget{
		Description:   "Hadiah Lomba",
		EstimatedCost: 500000,
	}
	err = uc.AddOrUpdateBudget(ctx, tenantID, evt.ID, budget)
	if err != nil {
		t.Fatalf("AddOrUpdateBudget failed: %v", err)
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

	// 7. Tenant Isolation Test for GetEvent, UpdateEvent, DeleteEvent, AddOrUpdateBudget, RSVP
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

	err = uc.RSVP(ctx, otherTenantID, evt.ID, participant)
	if err == nil {
		t.Fatalf("expected tenant isolation error on RSVP, got nil")
	}

	err = uc.DeleteEvent(ctx, otherTenantID, evt.ID)
	if err == nil {
		t.Fatalf("expected tenant isolation error on DeleteEvent, got nil")
	}

	// 8. Delete Event
	err = uc.DeleteEvent(ctx, tenantID, evt.ID)
	if err != nil {
		t.Fatalf("DeleteEvent failed: %v", err)
	}

	_, err = uc.GetEvent(ctx, tenantID, evt.ID)
	if err == nil {
		t.Fatalf("expected error after delete, got nil")
	}
}
