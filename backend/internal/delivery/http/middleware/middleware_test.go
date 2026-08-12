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
func (m *mockTenantRepo) Delete(ctx context.Context, id uuid.UUID) error          { return nil }
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
	return middleware.AuthMiddleware(secret)(middleware.TenantMiddleware(repo, "openrt.local")(next))
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
	req.Host = "localhost" // platform host: tenant comes from claims only
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
	req.Host = "localhost" // platform host: header hints must not create tenant context
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
	okHandler.ServeHTTP(rec, makeReq(noneHeader+"."+nonePayload+"."))
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

func TestRateLimitMiddleware_PerIPIsolation(t *testing.T) {
	// capacity 2, no refill: each IP has its own budget.
	mw := middleware.RateLimitMiddleware(2, 0)
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	serve := func(remoteAddr string) int {
		req := httptest.NewRequest("GET", "/", nil)
		req.RemoteAddr = remoteAddr
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		return rec.Code
	}

	// Client A exhausts its own bucket...
	if serve("203.0.113.1:1234") != http.StatusOK {
		t.Error("A: expected 1st request 200")
	}
	if serve("203.0.113.1:1234") != http.StatusOK {
		t.Error("A: expected 2nd request 200")
	}
	if serve("203.0.113.1:1234") != http.StatusTooManyRequests {
		t.Error("A: expected 3rd request 429")
	}

	// ...but client B is completely unaffected (previously a single global
	// bucket would 429 B too — the unauthenticated DoS gap).
	if serve("198.51.100.7:1234") != http.StatusOK {
		t.Error("B: expected 200 after A exhausted its bucket")
	}
	if serve("198.51.100.7:1234") != http.StatusOK {
		t.Error("B: expected 2nd request 200")
	}
}

func TestRateLimitMiddleware_ExemptPaths(t *testing.T) {
	// capacity 1, no refill: only the first non-exempt request per IP passes.
	mw := middleware.RateLimitMiddleware(1, 0)
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Exhaust the client's bucket with a normal API request.
	req := httptest.NewRequest("GET", "/api/v1/auth/tenants", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for first API request, got %d", rec.Code)
	}

	// Health probes and the OpenAPI spec must keep working even when the
	// client's bucket is empty — otherwise an attacker could blind monitoring.
	for _, path := range []string{"/health", "/swagger/openapi.yaml", "/swagger/"} {
		req := httptest.NewRequest("GET", path, nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Errorf("exempt path %s must not be rate limited, got %d", path, rec.Code)
		}
	}

	// The same client is still limited on real API paths.
	req = httptest.NewRequest("GET", "/api/v1/auth/tenants", nil)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusTooManyRequests {
		t.Errorf("expected 429 for second API request, got %d", rec.Code)
	}
}

func TestRateLimitMiddleware_TrustedProxyXFF(t *testing.T) {
	// Peer 10.0.0.1 is a trusted proxy; client identity comes from XFF.
	mw := middleware.NewIPRateLimiter(2, 0, []string{"10.0.0.1"}).Middleware()
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	serve := func(remoteAddr, xff string) int {
		req := httptest.NewRequest("GET", "/", nil)
		req.RemoteAddr = remoteAddr
		if xff != "" {
			req.Header.Set("X-Forwarded-For", xff)
		}
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		return rec.Code
	}

	// Two different real clients behind the proxy have separate buckets.
	if serve("10.0.0.1:80", "203.0.113.9") != http.StatusOK {
		t.Error("client 203.0.113.9: expected 1st request 200")
	}
	if serve("10.0.0.1:80", "203.0.113.9") != http.StatusOK {
		t.Error("client 203.0.113.9: expected 2nd request 200")
	}
	if serve("10.0.0.1:80", "203.0.113.9") != http.StatusTooManyRequests {
		t.Error("client 203.0.113.9: expected 3rd request 429")
	}
	if serve("10.0.0.1:80", "198.51.100.7") != http.StatusOK {
		t.Error("client 198.51.100.7: expected 200 after other client exhausted its bucket")
	}
}

func TestRateLimitMiddleware_TrustedPeerWithoutXFF(t *testing.T) {
	// Trusted peer that does not forward X-Forwarded-For: the peer itself is
	// the key, so all such requests share one bucket.
	mw := middleware.NewIPRateLimiter(2, 0, []string{"10.0.0.1"}).Middleware()
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	serve := func() int {
		req := httptest.NewRequest("GET", "/", nil)
		req.RemoteAddr = "10.0.0.1:80"
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		return rec.Code
	}

	if serve() != http.StatusOK || serve() != http.StatusOK {
		t.Error("expected first two requests 200")
	}
	if serve() != http.StatusTooManyRequests {
		t.Error("expected 3rd request 429: trusted peer without XFF is one bucket")
	}
}

func TestRateLimitMiddleware_TrustedProxyCIDR(t *testing.T) {
	// CIDR matching: the proxy's container IP changes per recreate but stays
	// inside the configured docker network subnet.
	mw := middleware.NewIPRateLimiter(2, 0, []string{"10.0.0.0/8"}).Middleware()
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	serve := func(remoteAddr, xff string) int {
		req := httptest.NewRequest("GET", "/", nil)
		req.RemoteAddr = remoteAddr
		if xff != "" {
			req.Header.Set("X-Forwarded-For", xff)
		}
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		return rec.Code
	}

	if serve("10.1.2.3:80", "203.0.113.9") != http.StatusOK {
		t.Error("peer inside trusted CIDR with XFF: expected 200")
	}
	if serve("10.1.2.3:80", "203.0.113.9") != http.StatusOK {
		t.Error("same client: expected 2nd request 200")
	}
	if serve("10.1.2.3:80", "203.0.113.9") != http.StatusTooManyRequests {
		t.Error("same client: expected 3rd request 429")
	}
	// A peer outside the trusted CIDR must not have XFF honored.
	if serve("192.168.1.5:80", "9.9.9.9") != http.StatusOK {
		t.Error("untrusted peer: expected 200 (fresh bucket keyed on peer)")
	}
}

func TestRateLimitMiddleware_RetryAfterHeader(t *testing.T) {
	mw := middleware.RateLimitMiddleware(1, 0)
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/api/v1/auth/tenants", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req) // consumes the only token
	req = httptest.NewRequest("GET", "/api/v1/auth/tenants", nil)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", rec.Code)
	}
	if got := rec.Header().Get("Retry-After"); got != "1" {
		t.Errorf("expected Retry-After: 1, got %q", got)
	}
}

func TestRateLimitMiddleware_RefillOverTime(t *testing.T) {
	// capacity 1, refill 100 tokens/s: after a short wait the bucket is full
	// again and the client is allowed through.
	mw := middleware.NewIPRateLimiter(1, 100, nil).Middleware()
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	serve := func() int {
		req := httptest.NewRequest("GET", "/", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		return rec.Code
	}

	if serve() != http.StatusOK {
		t.Fatal("expected 1st request 200")
	}
	if serve() != http.StatusTooManyRequests {
		t.Fatal("expected 2nd request 429 (bucket empty, no time elapsed)")
	}
	// 20ms at 100 tokens/s refills 2 tokens (capped at capacity 1).
	time.Sleep(20 * time.Millisecond)
	if serve() != http.StatusOK {
		t.Error("expected request after refill 200")
	}
}

func TestRateLimitMiddleware_XFFIgnoredFromUntrustedPeer(t *testing.T) {
	// No trusted proxies configured: XFF must be ignored entirely, so a client
	// cannot dodge the limit by rotating X-Forwarded-For values.
	mw := middleware.NewIPRateLimiter(2, 0, nil).Middleware()
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	serve := func(remoteAddr, xff string) int {
		req := httptest.NewRequest("GET", "/", nil)
		req.RemoteAddr = remoteAddr
		req.Header.Set("X-Forwarded-For", xff)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		return rec.Code
	}

	if serve("203.0.113.99:1234", "6.6.6.6") != http.StatusOK {
		t.Error("expected 1st request 200")
	}
	if serve("203.0.113.99:1234", "7.7.7.7") != http.StatusOK {
		t.Error("expected 2nd request 200 (same bucket despite different XFF)")
	}
	if serve("203.0.113.99:1234", "8.8.8.8") != http.StatusTooManyRequests {
		t.Error("expected 3rd request 429: XFF from untrusted peer must be ignored")
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
	mw := middleware.CORSMiddleware("openrt.local")
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// OPTIONS preflight request from an allowed tenant origin.
	reqOptions := httptest.NewRequest("OPTIONS", "/", nil)
	reqOptions.Header.Set("Origin", "https://rt-003.openrt.local")
	recOptions := httptest.NewRecorder()
	handler.ServeHTTP(recOptions, reqOptions)
	if recOptions.Code != http.StatusOK {
		t.Errorf("expected OPTIONS request 200, got %d", recOptions.Code)
	}
	if got := recOptions.Header().Get("Access-Control-Allow-Origin"); got != "https://rt-003.openrt.local" {
		t.Errorf("unexpected origin header: %s", got)
	}

	// Normal GET request without an Origin header.
	reqGet := httptest.NewRequest("GET", "/", nil)
	recGet := httptest.NewRecorder()
	handler.ServeHTTP(recGet, reqGet)
	if recGet.Code != http.StatusOK {
		t.Errorf("expected GET request 200, got %d", recGet.Code)
	}
	if got := recGet.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("expected no CORS origin header without Origin, got %q", got)
	}
}

func TestCORSMiddleware_RejectsForeignOrigins(t *testing.T) {
	mw := middleware.CORSMiddleware("openrt.local")
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Attacker origins must receive NO CORS headers (browser blocks the read).
	for _, origin := range []string{
		"https://attacker.com",
		"https://rt-003.openrt.local.attacker.com",
		"https://openrt.com.attacker.com",
		"https://evil.example.com",
	} {
		req := httptest.NewRequest("GET", "/", nil)
		req.Header.Set("Origin", origin)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
			t.Errorf("origin %s must not be reflected, got %q", origin, got)
		}
	}

	// Allowed origins: tenant subdomains, the base domain, and localhost dev.
	for _, origin := range []string{
		"https://rt-003.openrt.local",
		"https://rt-004.openrt.local",
		"https://openrt.local",
		"http://localhost:3000",
		"http://127.0.0.1:5173",
	} {
		req := httptest.NewRequest("GET", "/", nil)
		req.Header.Set("Origin", origin)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got == "" {
			t.Errorf("origin %s should be allowed, got no CORS header", origin)
		}
	}
}
