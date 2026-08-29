package http

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"
	"github.com/google/uuid"
)

type mockWasteBankUsecase struct {
	categories   map[uuid.UUID]*domain.WasteCategory
	deposits     map[uuid.UUID]*domain.WasteDeposit
	summary      *domain.WasteBankSummary
	accumulations []*domain.HouseholdWasteAccumulation
}

func newMockWasteBankUsecase() *mockWasteBankUsecase {
	return &mockWasteBankUsecase{
		categories: make(map[uuid.UUID]*domain.WasteCategory),
		deposits:   make(map[uuid.UUID]*domain.WasteDeposit),
		summary: &domain.WasteBankSummary{
			TotalDeposits:          5,
			TotalWeightKg:          120.5,
			TotalGrossValue:        500000,
			TotalResidentEarnings:  400000,
			TotalKarangTarunaShare: 100000,
			ActiveHouseholdsCount:  4,
		},
	}
}

func (m *mockWasteBankUsecase) ListCategories(ctx context.Context, tenantID uuid.UUID, activeOnly bool) ([]*domain.WasteCategory, error) {
	var list []*domain.WasteCategory
	for _, c := range m.categories {
		if c.TenantID == tenantID {
			if !activeOnly || c.IsActive {
				list = append(list, c)
			}
		}
	}
	return list, nil
}

func (m *mockWasteBankUsecase) GetCategoryByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.WasteCategory, error) {
	if c, ok := m.categories[id]; ok && c.TenantID == tenantID {
		return c, nil
	}
	return nil, sql.ErrNoRows
}

func (m *mockWasteBankUsecase) CreateCategory(ctx context.Context, c *domain.WasteCategory) error {
	c.ID = uuid.New()
	m.categories[c.ID] = c
	return nil
}

func (m *mockWasteBankUsecase) UpdateCategory(ctx context.Context, c *domain.WasteCategory) error {
	m.categories[c.ID] = c
	return nil
}

func (m *mockWasteBankUsecase) DeleteCategory(ctx context.Context, tenantID, id uuid.UUID) error {
	delete(m.categories, id)
	return nil
}

func (m *mockWasteBankUsecase) CreateDeposit(ctx context.Context, d *domain.WasteDeposit) error {
	d.ID = uuid.New()
	d.CreatedAt = time.Now()
	m.deposits[d.ID] = d
	return nil
}

func (m *mockWasteBankUsecase) GetDepositByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.WasteDeposit, error) {
	if d, ok := m.deposits[id]; ok && d.TenantID == tenantID {
		return d, nil
	}
	return nil, sql.ErrNoRows
}

func (m *mockWasteBankUsecase) ListDeposits(ctx context.Context, tenantID uuid.UUID, search, status string, limit, offset int) ([]*domain.WasteDeposit, int64, error) {
	var list []*domain.WasteDeposit
	for _, d := range m.deposits {
		if d.TenantID == tenantID {
			list = append(list, d)
		}
	}
	return list, int64(len(list)), nil
}

func (m *mockWasteBankUsecase) UpdateDepositStatus(ctx context.Context, tenantID, id uuid.UUID, status string) error {
	if d, ok := m.deposits[id]; ok && d.TenantID == tenantID {
		d.Status = status
		return nil
	}
	return sql.ErrNoRows
}

func (m *mockWasteBankUsecase) GetSummary(ctx context.Context, tenantID uuid.UUID) (*domain.WasteBankSummary, error) {
	return m.summary, nil
}

func (m *mockWasteBankUsecase) ListHouseholdAccumulations(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.HouseholdWasteAccumulation, int64, error) {
	return m.accumulations, int64(len(m.accumulations)), nil
}

type mockTenantRepoForWasteBank struct {
	tenant *domain.Tenant
}

func (m *mockTenantRepoForWasteBank) GetByID(ctx context.Context, id uuid.UUID) (*domain.Tenant, error) {
	if m.tenant != nil && m.tenant.ID == id {
		return m.tenant, nil
	}
	return nil, sql.ErrNoRows
}
func (m *mockTenantRepoForWasteBank) GetBySlug(ctx context.Context, slug string) (*domain.Tenant, error) {
	if m.tenant != nil && m.tenant.Slug == slug {
		return m.tenant, nil
	}
	return nil, sql.ErrNoRows
}
func (m *mockTenantRepoForWasteBank) GetByDomain(ctx context.Context, d string) (*domain.Tenant, error) {
	return nil, sql.ErrNoRows
}
func (m *mockTenantRepoForWasteBank) List(ctx context.Context, limit, offset int) ([]*domain.Tenant, int64, error) {
	return nil, 0, nil
}
func (m *mockTenantRepoForWasteBank) Create(ctx context.Context, t *domain.Tenant) error { return nil }
func (m *mockTenantRepoForWasteBank) Update(ctx context.Context, t *domain.Tenant) error { return nil }
func (m *mockTenantRepoForWasteBank) Delete(ctx context.Context, id uuid.UUID) error     { return nil }
func (m *mockTenantRepoForWasteBank) SetSearchPath(ctx context.Context, slug string) error {
	return nil
}

func noopWasteBankMW(next http.Handler) http.Handler { return next }

func mockWasteBankAuthMiddleware(tenant *domain.Tenant, userID uuid.UUID) (func(http.Handler) http.Handler, func(http.Handler) http.Handler) {
	tenantMw := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := context.WithValue(r.Context(), middleware.TenantContextKey, tenant)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
	authMw := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := context.WithValue(r.Context(), middleware.UserContextKey, userID)
			ctx = context.WithValue(ctx, middleware.RoleContextKey, string(domain.RoleAdminRT))
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
	return tenantMw, authMw
}

func TestWasteBankHandler_PublicEndpoints(t *testing.T) {
	tenant := &domain.Tenant{ID: uuid.New(), Name: "RT 01", Slug: "rt01", Status: "active"}
	tenantRepo := &mockTenantRepoForWasteBank{tenant: tenant}
	uc := newMockWasteBankUsecase()
	handler := NewWasteBankHandler(uc, tenantRepo, "openrt.local")

	mux := http.NewServeMux()
	handler.RegisterRoutes(mux, noopWasteBankMW, noopWasteBankMW)

	// 1. Public Summary
	reqSummary := httptest.NewRequest(http.MethodGet, "/api/v1/t/rt01/waste-bank/summary", nil)
	wSummary := httptest.NewRecorder()
	mux.ServeHTTP(wSummary, reqSummary)

	if wSummary.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", wSummary.Code, wSummary.Body.String())
	}

	var sum domain.WasteBankSummary
	if err := json.Unmarshal(wSummary.Body.Bytes(), &sum); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if sum.TotalGrossValue != 500000 || sum.TotalKarangTarunaShare != 100000 {
		t.Errorf("unexpected summary figures: %+v", sum)
	}

	// 2. Public Categories
	cat := &domain.WasteCategory{
		ID:                   uuid.New(),
		TenantID:             tenant.ID,
		Name:                 "Kardus",
		Unit:                 "kg",
		PricePerUnit:         3000,
		ResidentSharePct:     80,
		KarangTarunaSharePct: 20,
		IsActive:             true,
	}
	uc.categories[cat.ID] = cat

	reqCat := httptest.NewRequest(http.MethodGet, "/api/v1/t/rt01/waste-bank/categories", nil)
	wCat := httptest.NewRecorder()
	mux.ServeHTTP(wCat, reqCat)

	if wCat.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", wCat.Code)
	}
}

func TestWasteBankHandler_ProtectedDepositCreation(t *testing.T) {
	tenant := &domain.Tenant{ID: uuid.New(), Name: "RT 01", Slug: "rt01", Status: "active"}
	tenantRepo := &mockTenantRepoForWasteBank{tenant: tenant}
	uc := newMockWasteBankUsecase()
	handler := NewWasteBankHandler(uc, tenantRepo, "openrt.local")

	tenantMw, authMw := mockWasteBankAuthMiddleware(tenant, uuid.New())
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux, tenantMw, authMw)

	// Create Category
	cat := &domain.WasteCategory{
		ID:                   uuid.New(),
		TenantID:             tenant.ID,
		Name:                 "Botol Plastik",
		Unit:                 "kg",
		PricePerUnit:         5000,
		ResidentSharePct:     80,
		KarangTarunaSharePct: 20,
		IsActive:             true,
	}
	uc.categories[cat.ID] = cat

	// Post Deposit
	depPayload := map[string]interface{}{
		"family_head_name": "Keluarga Bpk. Hartono",
		"kk_number":        "3201011234560001",
		"items": []map[string]interface{}{
			{
				"category_id": cat.ID.String(),
				"quantity":    10,
			},
		},
	}
	body, _ := json.Marshal(depPayload)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/waste-bank/deposits", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created, got %d: %s", w.Code, w.Body.String())
	}
}
