package http_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	delivery "backend/internal/delivery/http"
	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"

	"github.com/google/uuid"
)

type mockInventoryUsecase struct {
	items      []domain.InventoryItem
	borrowings []domain.InventoryBorrowing
}

func (m *mockInventoryUsecase) CreateItem(ctx context.Context, item *domain.InventoryItem) error {
	item.ID = uuid.New()
	item.CreatedAt = time.Now()
	m.items = append(m.items, *item)
	return nil
}

func (m *mockInventoryUsecase) GetItemByID(ctx context.Context, id uuid.UUID) (*domain.InventoryItem, error) {
	for _, it := range m.items {
		if it.ID == id {
			return &it, nil
		}
	}
	return nil, errors.New("not found")
}

func (m *mockInventoryUsecase) ListItems(ctx context.Context, filter domain.InventoryFilter) ([]domain.InventoryItem, int, error) {
	return m.items, len(m.items), nil
}

func (m *mockInventoryUsecase) UpdateItem(ctx context.Context, item *domain.InventoryItem) error {
	for i, it := range m.items {
		if it.ID == item.ID {
			m.items[i] = *item
			return nil
		}
	}
	return errors.New("not found")
}

func (m *mockInventoryUsecase) DeleteItem(ctx context.Context, id uuid.UUID) error {
	return nil
}

func (m *mockInventoryUsecase) CreateBorrowing(ctx context.Context, b *domain.InventoryBorrowing) error {
	b.ID = uuid.New()
	m.borrowings = append(m.borrowings, *b)
	return nil
}

func (m *mockInventoryUsecase) GetBorrowingByID(ctx context.Context, id uuid.UUID) (*domain.InventoryBorrowing, error) {
	for _, b := range m.borrowings {
		if b.ID == id {
			return &b, nil
		}
	}
	return nil, errors.New("not found")
}

func (m *mockInventoryUsecase) ListBorrowings(ctx context.Context, filter domain.BorrowingFilter) ([]domain.InventoryBorrowing, int, error) {
	return m.borrowings, len(m.borrowings), nil
}

func (m *mockInventoryUsecase) UpdateBorrowingStatus(ctx context.Context, id uuid.UUID, status string, conditionAfter *string, adminNotes *string, approverID *uuid.UUID) error {
	return nil
}

func TestInventoryHandler_ListAndCreate(t *testing.T) {
	uc := &mockInventoryUsecase{}
	h := delivery.NewInventoryHandler(uc)

	mux := http.NewServeMux()
	passthrough := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := context.WithValue(r.Context(), middleware.RoleContextKey, domain.RoleAdminRT)
			ctx = context.WithValue(ctx, middleware.UserContextKey, uuid.New())
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
	h.RegisterRoutes(mux, passthrough, passthrough)

	// 1. GET empty items -> must return 200 and data: []
	req := httptest.NewRequest(http.MethodGet, "/api/v1/inventory/items", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var res struct {
		Data  []domain.InventoryItem `json:"data"`
		Total int                    `json:"total"`
	}
	if err := json.NewDecoder(w.Body).Decode(&res); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if res.Data == nil || len(res.Data) != 0 {
		t.Fatalf("expected non-nil empty slice, got %+v", res.Data)
	}

	// 2. POST create item
	payload := map[string]interface{}{
		"name":     "Kursi Lipat",
		"category": "Peralatan",
		"quantity": 50,
		"unit":     "Pcs",
	}
	body, _ := json.Marshal(payload)
	reqCreate := httptest.NewRequest(http.MethodPost, "/api/v1/inventory/items", bytes.NewReader(body))
	wCreate := httptest.NewRecorder()
	mux.ServeHTTP(wCreate, reqCreate)

	if wCreate.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", wCreate.Code, wCreate.Body.String())
	}

	// 3. GET items again -> total should be 1
	w2 := httptest.NewRecorder()
	mux.ServeHTTP(w2, req)
	if err := json.NewDecoder(w2.Body).Decode(&res); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if res.Total != 1 || len(res.Data) != 1 {
		t.Fatalf("expected 1 item, got %d", res.Total)
	}
}
