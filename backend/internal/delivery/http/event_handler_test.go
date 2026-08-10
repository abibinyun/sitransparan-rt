package http_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
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
	budgets      map[uuid.UUID][]*domain.EventBudget
	participants map[string]*domain.EventParticipant
	roles        map[uuid.UUID][]*domain.EventRole
	receipts     map[uuid.UUID][]*domain.EventReceipt
}

func newMockEventUsecase() *mockEventUsecase {
	return &mockEventUsecase{
		events:       make(map[uuid.UUID]*domain.Event),
		budgets:      make(map[uuid.UUID][]*domain.EventBudget),
		participants: make(map[string]*domain.EventParticipant),
		roles:        make(map[uuid.UUID][]*domain.EventRole),
		receipts:     make(map[uuid.UUID][]*domain.EventReceipt),
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
	m.budgets[eventID] = append(m.budgets[eventID], budget)
	return nil
}

func (m *mockEventUsecase) ListBudgets(ctx context.Context, tenantID, eventID uuid.UUID) ([]*domain.EventBudget, error) {
	e, ok := m.events[eventID]
	if !ok || e.TenantID != tenantID {
		return nil, usecase.ErrEventNotFound
	}
	return m.budgets[eventID], nil
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

func (m *mockEventUsecase) AssignRole(ctx context.Context, tenantID, eventID uuid.UUID, role *domain.EventRole) error {
	e, ok := m.events[eventID]
	if !ok || e.TenantID != tenantID {
		return usecase.ErrEventNotFound
	}
	if role.ID == uuid.Nil {
		role.ID = uuid.New()
	}
	role.EventID = eventID
	m.roles[eventID] = append(m.roles[eventID], role)
	return nil
}

func (m *mockEventUsecase) ListRoles(ctx context.Context, tenantID, eventID uuid.UUID) ([]*domain.EventRole, error) {
	e, ok := m.events[eventID]
	if !ok || e.TenantID != tenantID {
		return nil, usecase.ErrEventNotFound
	}
	return m.roles[eventID], nil
}

func (m *mockEventUsecase) RemoveRole(ctx context.Context, tenantID, eventID, roleID uuid.UUID) error {
	e, ok := m.events[eventID]
	if !ok || e.TenantID != tenantID {
		return usecase.ErrEventNotFound
	}
	roles := m.roles[eventID]
	for i, r := range roles {
		if r.ID == roleID {
			m.roles[eventID] = append(roles[:i], roles[i+1:]...)
			return nil
		}
	}
	return usecase.ErrEventNotFound
}

func (m *mockEventUsecase) UploadDonationReceipt(ctx context.Context, tenantID, eventID uuid.UUID, residentID *uuid.UUID, filename string, content io.Reader, contentType string, amount float64, description string) (*domain.EventReceipt, error) {
	e, ok := m.events[eventID]
	if !ok || e.TenantID != tenantID {
		return nil, usecase.ErrEventNotFound
	}
	rec := &domain.EventReceipt{
		ID:          uuid.New(),
		EventID:     eventID,
		ResidentID:  residentID,
		ReceiptURL:  "/storage/events/receipts/" + filename,
		Amount:      amount,
		Description: description,
	}
	m.receipts[eventID] = append(m.receipts[eventID], rec)
	return rec, nil
}

func (m *mockEventUsecase) ListReceipts(ctx context.Context, tenantID, eventID uuid.UUID) ([]*domain.EventReceipt, error) {
	e, ok := m.events[eventID]
	if !ok || e.TenantID != tenantID {
		return nil, usecase.ErrEventNotFound
	}
	return m.receipts[eventID], nil
}

func (m *mockEventUsecase) GetTransparency(ctx context.Context, tenantID, eventID uuid.UUID) (*domain.EventTransparency, error) {
	e, ok := m.events[eventID]
	if !ok || e.TenantID != tenantID {
		return nil, usecase.ErrEventNotFound
	}
	budgets := m.budgets[eventID]
	receipts := m.receipts[eventID]

	var totalPlanned, totalActual float64
	for _, b := range budgets {
		totalPlanned += b.PlannedAmount
		totalActual += b.ActualAmount
	}

	var totalDonations float64
	for _, r := range receipts {
		totalDonations += r.Amount
	}

	fundingProgress := 0.0
	if totalPlanned > 0 {
		fundingProgress = (totalDonations / totalPlanned) * 100
	}

	return &domain.EventTransparency{
		Event:           e,
		Timeline:        []*domain.Event{e},
		Status:          e.Status,
		FundingProgress: fundingProgress,
		Budgets:         budgets,
		TotalPlanned:    totalPlanned,
		TotalActual:     totalActual,
		TotalDonations:  totalDonations,
		Receipts:        receipts,
	}, nil
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
			ctx := context.WithValue(r.Context(), middleware.RoleContextKey, domain.RoleAdminRT)
			next.ServeHTTP(w, r.WithContext(ctx))
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

	// 4. Add/Update Budget (POST /api/v1/events/:id/budget - Story 4.1 RAB)
	budgetBody := []byte(`{"item":"Konsumsi","category":"Makanan","planned_amount":150000,"actual_amount":140000,"description":"Nasi Bungkus"}`)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/events/"+created.ID.String()+"/budget", bytes.NewBuffer(budgetBody))
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	// List Budgets (GET /api/v1/events/:id/budget)
	req = httptest.NewRequest(http.MethodGet, "/api/v1/events/"+created.ID.String()+"/budget", nil)
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

	// 6. Event Committee Roles (POST /api/v1/events/:id/roles - Story 4.2)
	roleBody := []byte(`{"resident_id":"` + resID.String() + `","role":"Ketua Panitia"}`)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/events/"+created.ID.String()+"/roles", bytes.NewBuffer(roleBody))
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", w.Code, w.Body.String())
	}

	var createdRole domain.EventRole
	_ = json.Unmarshal(w.Body.Bytes(), &createdRole)

	// List Roles (GET /api/v1/events/:id/roles)
	req = httptest.NewRequest(http.MethodGet, "/api/v1/events/"+created.ID.String()+"/roles", nil)
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	// Remove Role (DELETE /api/v1/events/:id/roles/:role_id)
	req = httptest.NewRequest(http.MethodDelete, "/api/v1/events/"+created.ID.String()+"/roles/"+createdRole.ID.String(), nil)
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	// 7. Event Transparency & Receipts (Story 4.3)
	receiptBody := []byte(`{"filename":"bukti_donasi.jpg","amount":50000,"description":"Donasi Konsumsi"}`)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/events/"+created.ID.String()+"/receipts", bytes.NewBuffer(receiptBody))
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", w.Code, w.Body.String())
	}

	// Get Transparency (GET /api/v1/events/:id/transparency)
	req = httptest.NewRequest(http.MethodGet, "/api/v1/events/"+created.ID.String()+"/transparency", nil)
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	// 8. List Events (GET /api/v1/events)
	req = httptest.NewRequest(http.MethodGet, "/api/v1/events", nil)
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	// 9. Delete Event (DELETE /api/v1/events/:id)
	req = httptest.NewRequest(http.MethodDelete, "/api/v1/events/"+created.ID.String(), nil)
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}
}
