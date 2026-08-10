package middleware_test

import (
	"context"
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

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

// signedToken signs a JWT with the given claims using the test secret.
func signedToken(t *testing.T, secret string, claims domain.JWTClaims) string {
	t.Helper()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("failed to sign token: %v", err)
	}
	return tokenStr
}

// authTenantChain wires the production order: AuthMiddleware outermost,
// TenantMiddleware inner, then the test handler.
func authTenantChain(secret string, repo domain.TenantRepository, next http.Handler) http.Handler {
	return middleware.AuthMiddleware(secret)(middleware.TenantMiddleware(repo)(next))
}

func TestTenantMiddleware_ResolvesFromClaimsOnly(t *testing.T) {
	secret := "secret-key"
	tenantA := &domain.Tenant{ID: uuid.New(), Name: "Tenant A", Slug: "tenant-a"}
	tenantB := &domain.Tenant{ID: uuid.New(), Name: "Tenant B", Slug: "tenant-b"}
	repo := &mockTenantRepo{tenants: map[string]*domain.Tenant{
		tenantA.ID.String(): tenantA,
		tenantB.ID.String(): tenantB,
	}}

	handler := authTenantChain(secret, repo, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got := middleware.GetTenantFromContext(r.Context())
		if got == nil || got.ID != tenantA.ID {
			t.Errorf("expected tenant A, got %v", got)
		}
		w.WriteHeader(http.StatusOK)
	}))

	// Authenticated as tenant A, but the request tries to switch to tenant B
	// via the X-Tenant-ID header. The header MUST be ignored: the trusted
	// tenant comes from the signed identity only.
	tokenStr := signedToken(t, secret, domain.JWTClaims{
		UserID:   uuid.New(),
		TenantID: tenantA.ID,
		Role:     domain.RoleAdminRT,
	})
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Authorization", "Bearer "+tokenStr)
	req.Header.Set("X-Tenant-ID", tenantB.ID.String())
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
}

func TestTenantMiddleware_NoTenantInClaims(t *testing.T) {
	secret := "secret-key"
	tenantA := &domain.Tenant{ID: uuid.New(), Name: "Tenant A", Slug: "tenant-a"}
	repo := &mockTenantRepo{tenants: map[string]*domain.Tenant{tenantA.ID.String(): tenantA}}

	handler := authTenantChain(secret, repo, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got := middleware.GetTenantFromContext(r.Context())
		if got != nil {
			t.Errorf("expected no tenant context, got %v", got)
		}
		w.WriteHeader(http.StatusOK)
	}))

	// Header hints must not create a tenant context when the identity has no
	// tenant scope.
	tokenStr := signedToken(t, secret, domain.JWTClaims{UserID: uuid.New(), Role: domain.RoleResident})
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Authorization", "Bearer "+tokenStr)
	req.Header.Set("X-Tenant-ID", tenantA.ID.String())
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

func TestAuthMiddleware_JWTSecurity(t *testing.T) {
	secret := "secret-key"
	userID := uuid.New()
	tenantID := uuid.New()

	mw := middleware.AuthMiddleware(secret)
	okHandler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	makeReq := func(tokenStr string) *http.Request {
		req := httptest.NewRequest("GET", "/", nil)
		req.Header.Set("Authorization", "Bearer "+tokenStr)
		return req
	}

	// 1. Missing token -> 401
	rec := httptest.NewRecorder()
	okHandler.ServeHTTP(rec, httptest.NewRequest("GET", "/", nil))
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("missing token: expected 401, got %d", rec.Code)
	}

	// 2. Malformed token -> 401
	rec = httptest.NewRecorder()
	okHandler.ServeHTTP(rec, makeReq("not.a.jwt"))
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("malformed token: expected 401, got %d", rec.Code)
	}

	// 3. Token signed with a different secret -> 401
	rec = httptest.NewRecorder()
	okHandler.ServeHTTP(rec, makeReq(signedToken(t, "other-secret", domain.JWTClaims{UserID: userID, TenantID: tenantID, Role: domain.RoleAdminRT})))
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("wrong secret: expected 401, got %d", rec.Code)
	}

	// 4. Tampered payload (role changed) -> signature invalid -> 401
	rec = httptest.NewRecorder()
	tampered := signedToken(t, secret, domain.JWTClaims{UserID: userID, TenantID: tenantID, Role: domain.RoleSuperAdmin})
	tampered = tampered[:len(tampered)-8] + "ZZZZZZZZ"
	okHandler.ServeHTTP(rec, makeReq(tampered))
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("tampered token: expected 401, got %d", rec.Code)
	}

	// 5. Expired token -> 401
	rec = httptest.NewRecorder()
	expiredClaims := domain.JWTClaims{UserID: userID, TenantID: tenantID, Role: domain.RoleAdminRT}
	expiredClaims.ExpiresAt = jwt.NewNumericDate(time.Now().Add(-time.Hour))
	okHandler.ServeHTTP(rec, makeReq(signedToken(t, secret, expiredClaims)))
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expired token: expected 401, got %d", rec.Code)
	}

	// 6. Token with no user id -> 401 (missing identity)
	rec = httptest.NewRecorder()
	okHandler.ServeHTTP(rec, makeReq(signedToken(t, secret, domain.JWTClaims{TenantID: tenantID, Role: domain.RoleAdminRT})))
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("token without user id: expected 401, got %d", rec.Code)
	}

	// 7. Token signed with the 'none' algorithm (header forgery) -> 401
	rec = httptest.NewRecorder()
	noneHeader := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"none","typ":"JWT"}`))
	nonePayload := base64.RawURLEncoding.EncodeToString([]byte(`{"user_id":"` + userID.String() + `","tenant_id":"` + tenantID.String() + `","role":"superadmin","exp":4102444800}`))
	okHandler.ServeHTTP(rec, makeReq(noneHeader + "." + nonePayload + "."))
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("none-algorithm token: expected 401, got %d", rec.Code)
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
