package middleware_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type mockTenantRepo struct {
	tenants map[string]*domain.Tenant
}

func (m *mockTenantRepo) Create(ctx context.Context, tenant *domain.Tenant) error { return nil }
func (m *mockTenantRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Tenant, error) {
	if t, ok := m.tenants[id.String()]; ok {
		return t, nil
	}
	return nil, nil
}
func (m *mockTenantRepo) GetBySlug(ctx context.Context, slug string) (*domain.Tenant, error) {
	for _, t := range m.tenants {
		if t.Slug == slug {
			return t, nil
		}
	}
	return nil, nil
}
func (m *mockTenantRepo) GetByDomain(ctx context.Context, domainName string) (*domain.Tenant, error) {
	for _, t := range m.tenants {
		if t.Domain != nil && *t.Domain == domainName {
			return t, nil
		}
	}
	return nil, nil
}
func (m *mockTenantRepo) Update(ctx context.Context, tenant *domain.Tenant) error { return nil }
func (m *mockTenantRepo) Delete(ctx context.Context, id uuid.UUID) error        { return nil }
func (m *mockTenantRepo) List(ctx context.Context, limit, offset int) ([]*domain.Tenant, int64, error) {
	return nil, 0, nil
}
func (m *mockTenantRepo) SetSearchPath(ctx context.Context, slug string) error { return nil }

func TestTenantMiddleware_Header(t *testing.T) {
	tenantID := uuid.New()
	tenant := &domain.Tenant{ID: tenantID, Name: "Test Tenant", Slug: "test"}
	repo := &mockTenantRepo{tenants: map[string]*domain.Tenant{tenantID.String(): tenant}}

	mw := middleware.TenantMiddleware(repo)
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got := middleware.GetTenantFromContext(r.Context())
		if got == nil || got.ID != tenantID {
			t.Errorf("expected tenant ID %s, got %v", tenantID, got)
		}
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("X-Tenant-ID", tenantID.String())
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
}

func TestAuthMiddleware(t *testing.T) {
	secret := "secret-key"
	userID := uuid.New()
	tenantID := uuid.New()

	claims := domain.JWTClaims{
		UserID:   userID,
		TenantID: tenantID,
		Role:     domain.RoleAdminRT,
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("failed to sign token: %v", err)
	}

	mw := middleware.AuthMiddleware(secret)
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotUser := middleware.GetUserIDFromContext(r.Context())
		gotRole := middleware.GetRoleFromContext(r.Context())

		if gotUser != userID {
			t.Errorf("expected user %s, got %s", userID, gotUser)
		}
		if gotRole != domain.RoleAdminRT {
			t.Errorf("expected role admin_rt, got %s", gotRole)
		}
		w.WriteHeader(http.StatusOK)
	}))

	// Unauthorized request (missing header)
	reqNoAuth := httptest.NewRequest("GET", "/", nil)
	recNoAuth := httptest.NewRecorder()
	handler.ServeHTTP(recNoAuth, reqNoAuth)
	if recNoAuth.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401 for no auth header, got %d", recNoAuth.Code)
	}

	// Authorized request
	reqAuth := httptest.NewRequest("GET", "/", nil)
	reqAuth.Header.Set("Authorization", "Bearer "+tokenStr)
	recAuth := httptest.NewRecorder()
	handler.ServeHTTP(recAuth, reqAuth)
	if recAuth.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", recAuth.Code)
	}
}

func TestRBACMiddleware(t *testing.T) {
	mw := middleware.RBACMiddleware(domain.RoleSuperAdmin, domain.RoleAdminRT)
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Forbidden role
	reqForbidden := httptest.NewRequest("GET", "/", nil)
	ctxForbidden := context.WithValue(reqForbidden.Context(), middleware.RoleContextKey, domain.RoleResident)
	recForbidden := httptest.NewRecorder()
	handler.ServeHTTP(recForbidden, reqForbidden.WithContext(ctxForbidden))
	if recForbidden.Code != http.StatusForbidden {
		t.Errorf("expected status 403, got %d", recForbidden.Code)
	}

	// Allowed role
	reqAllowed := httptest.NewRequest("GET", "/", nil)
	ctxAllowed := context.WithValue(reqAllowed.Context(), middleware.RoleContextKey, domain.RoleAdminRT)
	recAllowed := httptest.NewRecorder()
	handler.ServeHTTP(recAllowed, reqAllowed.WithContext(ctxAllowed))
	if recAllowed.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", recAllowed.Code)
	}
}

func TestRateLimitMiddleware(t *testing.T) {
	mw := middleware.RateLimitMiddleware(2, 0) // capacity 2, no refill
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req1 := httptest.NewRequest("GET", "/", nil)
	rec1 := httptest.NewRecorder()
	handler.ServeHTTP(rec1, req1)
	if rec1.Code != http.StatusOK {
		t.Errorf("expected 1st request 200, got %d", rec1.Code)
	}

	req2 := httptest.NewRequest("GET", "/", nil)
	rec2 := httptest.NewRecorder()
	handler.ServeHTTP(rec2, req2)
	if rec2.Code != http.StatusOK {
		t.Errorf("expected 2nd request 200, got %d", rec2.Code)
	}

	req3 := httptest.NewRequest("GET", "/", nil)
	rec3 := httptest.NewRecorder()
	handler.ServeHTTP(rec3, req3)
	if rec3.Code != http.StatusTooManyRequests {
		t.Errorf("expected 3rd request 429, got %d", rec3.Code)
	}
}

func TestSecurityHeadersMiddleware(t *testing.T) {
	mw := middleware.SecurityHeadersMiddleware()
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	expectedCSP := "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https://unpkg.com"
	if rec.Header().Get("Content-Security-Policy") != expectedCSP {
		t.Errorf("unexpected CSP header: %s", rec.Header().Get("Content-Security-Policy"))
	}
	if rec.Header().Get("Strict-Transport-Security") != "max-age=31536000; includeSubDomains" {
		t.Errorf("unexpected HSTS header: %s", rec.Header().Get("Strict-Transport-Security"))
	}
	if rec.Header().Get("X-Frame-Options") != "DENY" {
		t.Errorf("unexpected X-Frame-Options header: %s", rec.Header().Get("X-Frame-Options"))
	}
	if rec.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Errorf("unexpected X-Content-Type-Options header: %s", rec.Header().Get("X-Content-Type-Options"))
	}
	if rec.Header().Get("X-XSS-Protection") != "1; mode=block" {
		t.Errorf("unexpected X-XSS-Protection header: %s", rec.Header().Get("X-XSS-Protection"))
	}
}

func TestCORSMiddleware(t *testing.T) {
	mw := middleware.CORSMiddleware("*")
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// OPTIONS preflight request
	reqOptions := httptest.NewRequest("OPTIONS", "/", nil)
	recOptions := httptest.NewRecorder()
	handler.ServeHTTP(recOptions, reqOptions)
	if recOptions.Code != http.StatusOK {
		t.Errorf("expected OPTIONS request 200, got %d", recOptions.Code)
	}
	if recOptions.Header().Get("Access-Control-Allow-Origin") != "*" {
		t.Errorf("unexpected origin header: %s", recOptions.Header().Get("Access-Control-Allow-Origin"))
	}

	// Normal GET request
	reqGet := httptest.NewRequest("GET", "/", nil)
	recGet := httptest.NewRecorder()
	handler.ServeHTTP(recGet, reqGet)
	if recGet.Code != http.StatusOK {
		t.Errorf("expected GET request 200, got %d", recGet.Code)
	}
	if recGet.Header().Get("Access-Control-Allow-Origin") != "*" {
		t.Errorf("unexpected origin header: %s", recGet.Header().Get("Access-Control-Allow-Origin"))
	}
}
