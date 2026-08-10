package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"

	"github.com/google/uuid"
)

// tenantTestHandler records the resolved tenant so tests can assert which
// tenant context was established.
func tenantTestHandler(t *testing.T, wantTenantID uuid.UUID) http.Handler {
	t.Helper()
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got := middleware.GetTenantFromContext(r.Context())
		if got == nil {
			t.Errorf("expected tenant context, got nil")
		} else if got.ID != wantTenantID {
			t.Errorf("expected tenant %s, got %s", wantTenantID, got.ID)
		}
		w.WriteHeader(http.StatusOK)
	})
}

func hostnameAuthRequest(t *testing.T, secret, host, token string) *http.Request {
	t.Helper()
	req := httptest.NewRequest("GET", "/", nil)
	req.Host = host
	req.Header.Set("Authorization", "Bearer "+token)
	return req
}

// TestTenantMiddleware_HostnameTenantMatrix proves the core security invariant:
//   - JWT tenant == hostname tenant            -> ALLOW
//   - JWT tenant != hostname tenant            -> DENY (cross-tenant host attack)
//   - unknown / attacker hostnames             -> DENY
//   - spoofed forwarding / tenant hint headers -> ignored (hostname wins)
func TestTenantMiddleware_HostnameTenantMatrix(t *testing.T) {
	secret := "secret-key"
	tenantA := &domain.Tenant{ID: uuid.New(), Name: "Tenant A", Slug: "rt-a", Status: "active"}
	tenantB := &domain.Tenant{ID: uuid.New(), Name: "Tenant B", Slug: "rt-b", Status: "active"}
	repo := &mockTenantRepo{tenants: map[string]*domain.Tenant{
		tenantA.ID.String(): tenantA,
		tenantB.ID.String(): tenantB,
	}}

	tokenA := signedToken(t, secret, domain.JWTClaims{
		UserID: uuid.New(), TenantID: tenantA.ID, Role: domain.RoleAdminRT,
	})
	tokenB := signedToken(t, secret, domain.JWTClaims{
		UserID: uuid.New(), TenantID: tenantB.ID, Role: domain.RoleAdminRT,
	})

	cases := []struct {
		name       string
		host       string
		token      string
		headers    map[string]string
		want       int
		wantTenant uuid.UUID
	}{
		{"existing tenant A + correct user", "rt-a.openrt.local", tokenA, nil, http.StatusOK, tenantA.ID},
		{"existing tenant B + correct user", "rt-b.openrt.local", tokenB, nil, http.StatusOK, tenantB.ID},
		{"user A -> host B (cross-tenant host attack)", "rt-b.openrt.local", tokenA, nil, http.StatusForbidden, uuid.Nil},
		{"user B -> host A (cross-tenant host attack)", "rt-a.openrt.local", tokenB, nil, http.StatusForbidden, uuid.Nil},
		{"unknown tenant subdomain", "rt-999.openrt.local", tokenA, nil, http.StatusForbidden, uuid.Nil},
		{"attacker subdomain on foreign domain", "rt-a.attacker.com", tokenA, nil, http.StatusForbidden, uuid.Nil},
		{"suffix trick hostname", "rt-a.openrt.local.attacker.com", tokenA, nil, http.StatusForbidden, uuid.Nil},
		{"arbitrary foreign host", "example.com", tokenA, nil, http.StatusForbidden, uuid.Nil},
		{"wrong base domain", "rt-a.openrt.com", tokenA, nil, http.StatusForbidden, uuid.Nil},
		{"spoofed X-Forwarded-Host ignored", "rt-a.openrt.local", tokenA, map[string]string{"X-Forwarded-Host": "rt-b.openrt.local"}, http.StatusOK, tenantA.ID},
		{"spoofed X-Tenant-ID ignored", "rt-a.openrt.local", tokenA, map[string]string{"X-Tenant-ID": tenantB.ID.String()}, http.StatusOK, tenantA.ID},
		{"spoofed X-Tenant-ID on foreign host still denied", "example.com", tokenA, map[string]string{"X-Tenant-ID": tenantA.ID.String()}, http.StatusForbidden, uuid.Nil},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			// The assertion handler expects the tenant the authorized identity
			// should resolve to; it only runs on ALLOW (200) paths.
			handler := authTenantChain(secret, repo, tenantTestHandler(t, tc.wantTenant))
			req := hostnameAuthRequest(t, secret, tc.host, tc.token)
			for k, v := range tc.headers {
				req.Header.Set(k, v)
			}
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)
			if rec.Code != tc.want {
				t.Errorf("expected status %d, got %d (body: %s)", tc.want, rec.Code, rec.Body.String())
			}
		})
	}
}

// TestTenantMiddleware_InactiveTenantDenied proves a disabled tenant is denied
// through BOTH the hostname path and the claims-only (platform host) path.
func TestTenantMiddleware_InactiveTenantDenied(t *testing.T) {
	secret := "secret-key"
	inactive := &domain.Tenant{ID: uuid.New(), Name: "Disabled", Slug: "rt-off", Status: "inactive"}
	repo := &mockTenantRepo{tenants: map[string]*domain.Tenant{inactive.ID.String(): inactive}}

	handler := authTenantChain(secret, repo, tenantTestHandler(t, inactive.ID))
	token := signedToken(t, secret, domain.JWTClaims{
		UserID: uuid.New(), TenantID: inactive.ID, Role: domain.RoleResident,
	})

	// Hostname path: hostname resolves to a disabled tenant.
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, hostnameAuthRequest(t, secret, "rt-off.openrt.local", token))
	if rec.Code != http.StatusForbidden {
		t.Errorf("inactive tenant via hostname expected 403, got %d", rec.Code)
	}

	// Claims path (platform host): JWT tenant is disabled.
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, hostnameAuthRequest(t, secret, "localhost", token))
	if rec.Code != http.StatusForbidden {
		t.Errorf("inactive tenant via claims expected 403, got %d", rec.Code)
	}
}

// TestTenantMiddleware_CustomDomain proves a tenant's registered custom domain
// resolves only for users authorized to that tenant.
func TestTenantMiddleware_CustomDomain(t *testing.T) {
	secret := "secret-key"
	custom := "rt-003.custom.example.com"
	tenantA := &domain.Tenant{ID: uuid.New(), Name: "Tenant A", Slug: "rt-a", Status: "active", Domain: &custom}
	tenantB := &domain.Tenant{ID: uuid.New(), Name: "Tenant B", Slug: "rt-b", Status: "active"}
	repo := &mockTenantRepo{tenants: map[string]*domain.Tenant{
		tenantA.ID.String(): tenantA,
		tenantB.ID.String(): tenantB,
	}}

	handler := authTenantChain(secret, repo, tenantTestHandler(t, tenantA.ID))
	tokenA := signedToken(t, secret, domain.JWTClaims{
		UserID: uuid.New(), TenantID: tenantA.ID, Role: domain.RoleAdminRT,
	})
	tokenB := signedToken(t, secret, domain.JWTClaims{
		UserID: uuid.New(), TenantID: tenantB.ID, Role: domain.RoleAdminRT,
	})

	// Authorized user on the tenant's custom domain -> ALLOW.
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, hostnameAuthRequest(t, secret, custom, tokenA))
	if rec.Code != http.StatusOK {
		t.Errorf("authorized custom domain expected 200, got %d", rec.Code)
	}

	// Unauthorized user (JWT tenant B) on tenant A's custom domain -> DENY.
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, hostnameAuthRequest(t, secret, custom, tokenB))
	if rec.Code != http.StatusForbidden {
		t.Errorf("cross-tenant custom domain expected 403, got %d", rec.Code)
	}

	// Unregistered custom domain -> DENY even for a tenant user.
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, hostnameAuthRequest(t, secret, "not-registered.example.com", tokenA))
	if rec.Code != http.StatusForbidden {
		t.Errorf("unregistered custom domain expected 403, got %d", rec.Code)
	}
}

// TestTenantMiddleware_PlatformHostReserved proves platform subdomains never
// resolve as tenant slugs and resolve from claims as usual.
func TestTenantMiddleware_PlatformHostReserved(t *testing.T) {
	secret := "secret-key"
	tenantA := &domain.Tenant{ID: uuid.New(), Name: "Tenant A", Slug: "rt-a", Status: "active"}
	repo := &mockTenantRepo{tenants: map[string]*domain.Tenant{tenantA.ID.String(): tenantA}}

	handler := authTenantChain(secret, repo, tenantTestHandler(t, tenantA.ID))
	token := signedToken(t, secret, domain.JWTClaims{
		UserID: uuid.New(), TenantID: tenantA.ID, Role: domain.RoleAdminRT,
	})

	for _, host := range []string{"localhost", "127.0.0.1", "app.openrt.local", "api.openrt.local", "openrt.local"} {
		t.Run(host, func(t *testing.T) {
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, hostnameAuthRequest(t, secret, host, token))
			if rec.Code != http.StatusOK {
				t.Errorf("platform host %q expected 200 (claims resolution), got %d", host, rec.Code)
			}
		})
	}
}
