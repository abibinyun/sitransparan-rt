package http_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	delivery "backend/internal/delivery/http"
	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"
	"github.com/google/uuid"
)

type mockTenantRepoForAsp struct {
	tenants map[string]*domain.Tenant
}

func (m *mockTenantRepoForAsp) GetByID(ctx context.Context, id uuid.UUID) (*domain.Tenant, error) {
	for _, t := range m.tenants {
		if t.ID == id {
			return t, nil
		}
	}
	return nil, errors.New("not found")
}

func (m *mockTenantRepoForAsp) GetBySlug(ctx context.Context, slug string) (*domain.Tenant, error) {
	if t, ok := m.tenants[slug]; ok {
		return t, nil
	}
	return nil, errors.New("not found")
}

func (m *mockTenantRepoForAsp) GetByDomain(ctx context.Context, domainName string) (*domain.Tenant, error) {
	return nil, errors.New("not found")
}

func (m *mockTenantRepoForAsp) Create(ctx context.Context, tenant *domain.Tenant) error {
	return nil
}

func (m *mockTenantRepoForAsp) Update(ctx context.Context, tenant *domain.Tenant) error {
	return nil
}

func (m *mockTenantRepoForAsp) Delete(ctx context.Context, id uuid.UUID) error {
	return nil
}

func (m *mockTenantRepoForAsp) List(ctx context.Context, limit, offset int) ([]*domain.Tenant, int64, error) {
	return nil, 0, nil
}
func (m *mockTenantRepoForAsp) SetSearchPath(ctx context.Context, slug string) error {
	return nil
}

type mockAspirationNeedUsecase struct {
	aspirations []*domain.Aspiration
	needs       []*domain.CommunityNeed
	sponsors    []*domain.EventSponsor
}

func (m *mockAspirationNeedUsecase) SubmitAspiration(ctx context.Context, tenantID uuid.UUID, asp *domain.Aspiration) error {
	asp.ID = uuid.New()
	asp.TenantID = tenantID
	m.aspirations = append(m.aspirations, asp)
	return nil
}

func (m *mockAspirationNeedUsecase) GetAspiration(ctx context.Context, tenantID, id uuid.UUID) (*domain.Aspiration, error) {
	for _, a := range m.aspirations {
		if a.ID == id && a.TenantID == tenantID {
			return a, nil
		}
	}
	return nil, errors.New("not found")
}

func (m *mockAspirationNeedUsecase) ListAspirations(ctx context.Context, tenantID uuid.UUID, isPublic bool, limit, offset int) ([]*domain.Aspiration, int64, error) {
	var res []*domain.Aspiration
	for _, a := range m.aspirations {
		if a.TenantID == tenantID {
			res = append(res, a)
		}
	}
	return res, int64(len(res)), nil
}

func (m *mockAspirationNeedUsecase) UpdateAspirationStatus(ctx context.Context, tenantID, id uuid.UUID, status string, response *string) (*domain.Aspiration, error) {
	asp, err := m.GetAspiration(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	asp.Status = status
	asp.Response = response
	return asp, nil
}

func (m *mockAspirationNeedUsecase) CreateCommunityNeed(ctx context.Context, tenantID uuid.UUID, need *domain.CommunityNeed) error {
	need.ID = uuid.New()
	need.TenantID = tenantID
	m.needs = append(m.needs, need)
	return nil
}

func (m *mockAspirationNeedUsecase) GetCommunityNeed(ctx context.Context, tenantID, id uuid.UUID) (*domain.CommunityNeed, error) {
	for _, n := range m.needs {
		if n.ID == id && n.TenantID == tenantID {
			return n, nil
		}
	}
	return nil, errors.New("not found")
}

func (m *mockAspirationNeedUsecase) ListCommunityNeeds(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.CommunityNeed, int64, error) {
	var res []*domain.CommunityNeed
	for _, n := range m.needs {
		if n.TenantID == tenantID {
			res = append(res, n)
		}
	}
	return res, int64(len(res)), nil
}

func (m *mockAspirationNeedUsecase) UpdateCommunityNeed(ctx context.Context, tenantID uuid.UUID, need *domain.CommunityNeed) error {
	n, err := m.GetCommunityNeed(ctx, tenantID, need.ID)
	if err != nil {
		return err
	}
	n.Title = need.Title
	return nil
}

func (m *mockAspirationNeedUsecase) CreateEventSponsor(ctx context.Context, tenantID uuid.UUID, sponsor *domain.EventSponsor) error {
	sponsor.ID = uuid.New()
	m.sponsors = append(m.sponsors, sponsor)
	return nil
}

func (m *mockAspirationNeedUsecase) ListEventSponsors(ctx context.Context, tenantID, eventID uuid.UUID) ([]*domain.EventSponsor, error) {
	var res []*domain.EventSponsor
	for _, s := range m.sponsors {
		if s.EventID == eventID {
			res = append(res, s)
		}
	}
	return res, nil
}

func (m *mockAspirationNeedUsecase) DeleteEventSponsor(ctx context.Context, tenantID, sponsorID uuid.UUID) error {
	for i, s := range m.sponsors {
		if s.ID == sponsorID {
			m.sponsors = append(m.sponsors[:i], m.sponsors[i+1:]...)
			return nil
		}
	}
	return errors.New("not found")
}

func setupAspirationNeedServer() (*http.ServeMux, *domain.Tenant) {
	tID := uuid.New()
	tenant := &domain.Tenant{
		ID:   tID,
		Name: "RT 01",
		Slug: "rt01",
	}

	tenantRepo := &mockTenantRepoForAsp{
		tenants: map[string]*domain.Tenant{
			"rt01": tenant,
		},
	}
	uc := &mockAspirationNeedUsecase{}
	handler := delivery.NewAspirationNeedHandler(uc, tenantRepo, "openrt.local")

	tenantMw := middleware.TenantMiddleware(tenantRepo, "openrt.local")
	dummyAuthMw := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Authenticate as an admin of the fixture tenant so the real
			// TenantMiddleware resolves the tenant from the identity.
			claims := &domain.JWTClaims{
				UserID:   uuid.New(),
				TenantID: tID,
				Role:     domain.RoleAdminRT,
			}
			next.ServeHTTP(w, r.WithContext(middleware.WithClaims(r.Context(), claims)))
		})
	}

	mux := http.NewServeMux()
	handler.RegisterRoutes(mux, tenantMw, dummyAuthMw)
	return mux, tenant
}

func TestPublicSubmitAspiration(t *testing.T) {
	mux, _ := setupAspirationNeedServer()

	body := []byte(`{"title":"Perbaikan Jalan","content":"Jalan berlubang","category":"complaint","is_anonymous":true}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/t/rt01/aspirations", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	mux.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201 Created, got %d. Body: %s", w.Code, w.Body.String())
	}
}

func TestPublicListCommunityNeeds(t *testing.T) {
	mux, _ := setupAspirationNeedServer()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/t/rt01/needs", nil)
	w := httptest.NewRecorder()

	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200 OK, got %d. Body: %s", w.Code, w.Body.String())
	}
}

// TestPublicRoutes_HostnameConsistency proves public tenant resources reject a
// hostname that resolves to a different tenant than the path slug: the hostname
// can never select another tenant's public data.
func TestPublicRoutes_HostnameConsistency(t *testing.T) {
	mux, _ := setupAspirationNeedServer()

	// Hostname tenant (rt99) does not match the path slug (rt01) -> 404.
	req := httptest.NewRequest(http.MethodGet, "/api/v1/t/rt01/needs", nil)
	req.Host = "rt99.openrt.local"
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)
	if w.Code != http.StatusNotFound {
		t.Fatalf("hostname/path slug mismatch expected 404, got %d", w.Code)
	}

	// Matching hostname tenant is allowed.
	req = httptest.NewRequest(http.MethodGet, "/api/v1/t/rt01/needs", nil)
	req.Host = "rt01.openrt.local"
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("matching hostname tenant expected 200, got %d", w.Code)
	}

	// Unknown tenant hostname (rt-999) also rejected against path slug rt01.
	req = httptest.NewRequest(http.MethodGet, "/api/v1/t/rt01/needs", nil)
	req.Host = "rt-999.openrt.local"
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)
	if w.Code != http.StatusNotFound {
		t.Fatalf("unknown tenant hostname expected 404, got %d", w.Code)
	}
}

func TestEventSponsors(t *testing.T) {
	mux, tenant := setupAspirationNeedServer()

	eventID := uuid.New()

	body := []byte(`{"name":"PT Maju","amount":5000000,"type":"cash"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/events/"+eventID.String()+"/sponsors", bytes.NewBuffer(body))
	req.Host = "localhost" // platform host: tenant resolved from authenticated claims
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Tenant-ID", tenant.ID.String())
	w := httptest.NewRecorder()

	mux.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201 Created, got %d. Body: %s", w.Code, w.Body.String())
	}

	// List sponsors
	reqList := httptest.NewRequest(http.MethodGet, "/api/v1/events/"+eventID.String()+"/sponsors", nil)
	reqList.Host = "localhost"
	reqList.Header.Set("X-Tenant-ID", tenant.ID.String())
	wList := httptest.NewRecorder()

	mux.ServeHTTP(wList, reqList)

	if wList.Code != http.StatusOK {
		t.Fatalf("expected status 200 OK, got %d. Body: %s", wList.Code, wList.Body.String())
	}

	var resp struct {
		Data []*domain.EventSponsor `json:"data"`
	}
	_ = json.Unmarshal(wList.Body.Bytes(), &resp)
	if len(resp.Data) != 1 {
		t.Fatalf("expected 1 sponsor, got %d", len(resp.Data))
	}
}
