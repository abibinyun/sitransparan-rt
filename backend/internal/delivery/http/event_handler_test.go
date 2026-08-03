package http_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	delivery "backend/internal/delivery/http"
	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"
	"backend/internal/usecase"
	"github.com/google/uuid"
)

type mockEventUsecase struct {
	events       map[uuid.UUID]*domain.Event
	budgets      map[uuid.UUID]*domain.EventBudget
	participants map[string]*domain.EventParticipant
}

func newMockEventUsecase() *mockEventUsecase {
	return &mockEventUsecase{
		events:       make(map[uuid.UUID]*domain.Event),
		budgets:      make(map[uuid.UUID]*domain.EventBudget),
		participants: make(map[string]*domain.EventParticipant),
	}
}

func (m *mockEventUsecase) CreateEvent(ctx context.Context, tenantID uuid.UUID, event *domain.Event) error {
	event.ID = uuid.New()
	event.TenantID = tenantID
	m.events[event.ID] = event
	return nil
}

func (m *mockEventUsecase) ListEvents(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.Event, int64, error) {
	var list []*domain.Event
	for _, e := range m.events {
		if e.TenantID == tenantID {
			list = append(list, e)
		}
	}
	return list, int64(len(list)), nil
}

func (m *mockEventUsecase) GetEvent(ctx context.Context, tenantID, id uuid.UUID) (*domain.Event, error) {
	e, ok := m.events[id]
	if !ok || e.TenantID != tenantID {
		return nil, usecase.ErrEventNotFound
	}
	return e, nil
}

func (m *mockEventUsecase) UpdateEvent(ctx context.Context, tenantID uuid.UUID, event *domain.Event) error {
	e, ok := m.events[event.ID]
	if !ok || e.TenantID != tenantID {
		return usecase.ErrEventNotFound
	}
	event.TenantID = tenantID
	m.events[event.ID] = event
	return nil
}

func (m *mockEventUsecase) DeleteEvent(ctx context.Context, tenantID, id uuid.UUID) error {
	e, ok := m.events[id]
	if !ok || e.TenantID != tenantID {
		return usecase.ErrEventNotFound
	}
	delete(m.events, id)
	return nil
}

func (m *mockEventUsecase) AddOrUpdateBudget(ctx context.Context, tenantID, eventID uuid.UUID, budget *domain.EventBudget) error {
	e, ok := m.events[eventID]
	if !ok || e.TenantID != tenantID {
		return usecase.ErrEventNotFound
	}
	if budget.ID == uuid.Nil {
		budget.ID = uuid.New()
	}
	budget.EventID = eventID
	m.budgets[eventID] = budget
	return nil
}

func (m *mockEventUsecase) RSVP(ctx context.Context, tenantID, eventID uuid.UUID, participant *domain.EventParticipant) error {
	e, ok := m.events[eventID]
	if !ok || e.TenantID != tenantID {
		return usecase.ErrEventNotFound
	}
	if participant.ID == uuid.Nil {
		participant.ID = uuid.New()
	}
	participant.EventID = eventID
	key := eventID.String() + "_" + participant.ResidentID.String()
	m.participants[key] = participant
	return nil
}

func TestEventHandler(t *testing.T) {
	uc := newMockEventUsecase()
	handler := delivery.NewEventHandler(uc)

	tenant := &domain.Tenant{ID: uuid.New(), Name: "RT 01"}
	tenantMw := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := context.WithValue(r.Context(), middleware.TenantContextKey, tenant)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
	authMw := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			next.ServeHTTP(w, r)
		})
	}

	mux := http.NewServeMux()
	handler.RegisterRoutes(mux, tenantMw, authMw)

	// 1. Create Event (POST /api/v1/events)
	body := []byte(`{"title":"Kerja Bakti","status":"planned"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/events", bytes.NewBuffer(body))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", w.Code, w.Body.String())
	}

	var created domain.Event
	if err := json.Unmarshal(w.Body.Bytes(), &created); err != nil {
		t.Fatalf("unmarshal created event: %v", err)
	}

	// 2. Get Event (GET /api/v1/events/:id)
	req = httptest.NewRequest(http.MethodGet, "/api/v1/events/"+created.ID.String(), nil)
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	// 3. Update Event (PUT /api/v1/events/:id)
	updateBody := []byte(`{"title":"Kerja Bakti RT 01","status":"ongoing"}`)
	req = httptest.NewRequest(http.MethodPut, "/api/v1/events/"+created.ID.String(), bytes.NewBuffer(updateBody))
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	// 4. Add/Update Budget (POST /api/v1/events/:id/budget)
	budgetBody := []byte(`{"description":"Konsumsi","estimated_cost":150000}`)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/events/"+created.ID.String()+"/budget", bytes.NewBuffer(budgetBody))
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	// 5. RSVP (POST /api/v1/events/:id/rsvp)
	resID := uuid.New()
	rsvpBody := []byte(`{"resident_id":"` + resID.String() + `","status":"attending"}`)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/events/"+created.ID.String()+"/rsvp", bytes.NewBuffer(rsvpBody))
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	// 6. List Events (GET /api/v1/events)
	req = httptest.NewRequest(http.MethodGet, "/api/v1/events", nil)
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	// 7. Delete Event (DELETE /api/v1/events/:id)
	req = httptest.NewRequest(http.MethodDelete, "/api/v1/events/"+created.ID.String(), nil)
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}
}
