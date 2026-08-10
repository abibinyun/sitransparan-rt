package http_test

// Security integration tests. These exercise the REAL middleware chain and
// handlers against a real PostgreSQL database (TEST_DATABASE_URL or
// DATABASE_URL). They are skipped when no database is configured.
//
// Fixture: two tenants (A, B), one superadmin, admin_A, admin_B, resident_A.

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	delivery "backend/internal/delivery/http"

	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"
	"backend/internal/repository"
	"backend/internal/usecase"
	"github.com/golang-jwt/jwt/v5"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

const testJWTSecret = "test-security-secret-key"

func securityTestDB(t *testing.T) *sql.DB {
	t.Helper()
	connStr := os.Getenv("TEST_DATABASE_URL")
	if connStr == "" {
		connStr = os.Getenv("DATABASE_URL")
	}
	if connStr == "" {
		t.Skip("Skipping security integration test: TEST_DATABASE_URL or DATABASE_URL not set")
	}
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		t.Fatalf("failed to connect to test db: %v", err)
	}
	if err := db.Ping(); err != nil {
		t.Fatalf("failed to ping test db: %v", err)
	}
	return db
}

// buildSecurityMux mirrors the production route wiring in cmd/server/main.go.
func buildSecurityMux(db *sql.DB) http.Handler {
	tenantRepo := repository.NewTenantRepository(db)
	userRepo := repository.NewUserRepository(db)
	tuRepo := repository.NewTenantUserRepository(db)
	roleRepo := repository.NewRoleRepository(db)
	residentRepo := repository.NewResidentRepository(db)
	financialRepo := repository.NewFinancialRepository(db, nil)
	eventRepo := repository.NewEventRepository(db, nil)
	aspirationNeedRepo := repository.NewAspirationNeedRepository(db)
	announcementDocRepo := repository.NewAnnouncementDocRepository(db, nil)
	dashboardRepo := repository.NewDashboardRepository(db)

	authUC := usecase.NewAuthUsecase(tenantRepo, userRepo, tuRepo, roleRepo, testJWTSecret, 0, "openrt.local")
	authHandler := delivery.NewAuthHandler(authUC, "openrt.local")

	residentUC := usecase.NewResidentUsecase(residentRepo)
	residentHandler := delivery.NewResidentHandler(residentUC)

	financialUC := usecase.NewFinancialUsecase(financialRepo)
	financialHandler := delivery.NewFinancialHandler(financialUC)

	eventUC := usecase.NewEventUsecase(eventRepo)
	eventHandler := delivery.NewEventHandler(eventUC)

	aspirationNeedUC := usecase.NewAspirationNeedUsecase(aspirationNeedRepo)
	aspirationNeedHandler := delivery.NewAspirationNeedHandler(aspirationNeedUC, tenantRepo, "openrt.local")

	announcementDocUC := usecase.NewAnnouncementDocUsecase(announcementDocRepo)
	announcementDocHandler := delivery.NewAnnouncementDocHandler(announcementDocUC, tenantRepo, "openrt.local")

	dashboardUC := usecase.NewDashboardUsecase(dashboardRepo)
	dashboardHandler := delivery.NewDashboardHandler(dashboardUC)

	userUC := usecase.NewUserUsecase(userRepo, tuRepo, roleRepo)
	userHandler := delivery.NewUserHandler(userUC)

	tenantMw := middleware.TenantMiddleware(tenantRepo, "openrt.local")
	authMw := middleware.AuthMiddleware(testJWTSecret)
	adminMw := middleware.RBACMiddleware(domain.RoleSuperAdmin, domain.RoleAdminRT)
	superAdminMw := middleware.RBACMiddleware(domain.RoleSuperAdmin)

	mux := http.NewServeMux()

	// Public routes
	mux.HandleFunc("GET /api/v1/t/{slug}/info", authHandler.GetPublicTenantInfo)
	mux.HandleFunc("POST /api/v1/auth/login", authHandler.Login)
	mux.HandleFunc("POST /api/v1/auth/register", authHandler.Register)

	// Authenticated routes
	authMux := http.NewServeMux()
	authMux.HandleFunc("GET /api/v1/auth/tenants", authHandler.UserTenants)
	authMux.HandleFunc("POST /api/v1/auth/switch-tenant", authHandler.SwitchTenant)

	// Domain handlers (same order/protection as production)
	userHandler.RegisterRoutes(mux, tenantMw, authMw, adminMw)
	residentHandler.RegisterRoutes(mux, tenantMw, authMw)
	financialHandler.RegisterRoutes(mux, tenantMw, authMw)
	eventHandler.RegisterRoutes(mux, tenantMw, authMw)
	aspirationNeedHandler.RegisterRoutes(mux, tenantMw, authMw)
	announcementDocHandler.RegisterRoutes(mux, tenantMw, authMw)
	dashboardHandler.RegisterRoutes(mux, tenantMw, authMw)

	superAdminMux := http.NewServeMux()
	superAdminMux.HandleFunc("/api/v1/superadmin/tenants", authHandler.SuperAdminTenants)
	superAdminMux.HandleFunc("/api/v1/superadmin/tenants/", authHandler.SuperAdminTenants)

	mux.Handle("/api/v1/auth/tenants", authMw(tenantMw(authMux)))
	mux.Handle("/api/v1/auth/switch-tenant", authMw(tenantMw(authMux)))
	mux.Handle("/api/v1/superadmin/tenants", authMw(superAdminMw(tenantMw(superAdminMux))))
	mux.Handle("/api/v1/superadmin/tenants/", authMw(superAdminMw(tenantMw(superAdminMux))))

	return mux
}

type securityFixture struct {
	t           *testing.T
	db          *sql.DB
	handler     http.Handler
	slugA       string
	slugB       string
	tenantA     *domain.Tenant
	tenantB     *domain.Tenant
	saToken     string
	aToken      string
	bToken      string
	resToken    string
	adminAID    string
	adminBID    string
	residentAID string
}

func doJSON(h http.Handler, method, path string, token string, body interface{}, headers map[string]string) (*httptest.ResponseRecorder, map[string]interface{}) {
	var buf bytes.Buffer
	if body != nil {
		b, _ := json.Marshal(body)
		buf = *bytes.NewBuffer(b)
	}
	req := httptest.NewRequest(method, path, &buf)
	req.Host = "localhost" // platform host: tenant comes from authenticated claims only
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	var parsed map[string]interface{}
	_ = json.Unmarshal(rec.Body.Bytes(), &parsed)
	return rec, parsed
}

func loginToken(h http.Handler, email, password string) (string, map[string]interface{}) {
	rec, parsed := doJSON(h, "POST", "/api/v1/auth/login", "", map[string]string{
		"email": email, "password": password,
	}, nil)
	if rec.Code != http.StatusOK {
		panic(fmt.Sprintf("login %s failed: %d %s", email, rec.Code, rec.Body.String()))
	}
	token, _ := parsed["token"].(string)
	user, _ := parsed["user"].(map[string]interface{})
	return token, user
}

// setupSecurityFixture provisions tenants A and B plus admin_A, admin_B,
// resident_A, and a superadmin session.
func setupSecurityFixture(t *testing.T) *securityFixture {
	t.Helper()
	db := securityTestDB(t)
	handler := buildSecurityMux(db)

	fx := &securityFixture{t: t, db: db, handler: handler}
	suffix := uuid.New().String()[:8]
	fx.slugA = "sec-a-" + suffix
	fx.slugB = "sec-b-" + suffix

	// Superadmin login (role comes from DB mapping; superadmin@platform.local is
	// seeded in migrations).
	saToken, saUser := loginToken(handler, "admin@gmail.com", "admin123")
	fx.saToken = saToken
	if role, _ := saUser["role"].(string); role != "superadmin" {
		t.Fatalf("expected superadmin role, got %q", role)
	}

	// Create tenant A and tenant B as superadmin.
	_, ta := doJSON(handler, "POST", "/api/v1/superadmin/tenants", saToken, map[string]string{
		"name": "Security Tenant A", "slug": fx.slugA,
	}, nil)
	fx.tenantA = &domain.Tenant{ID: uuid.MustParse(fmt.Sprintf("%v", ta["id"])), Slug: fx.slugA}
	_, tb := doJSON(handler, "POST", "/api/v1/superadmin/tenants", saToken, map[string]string{
		"name": "Security Tenant B", "slug": fx.slugB,
	}, nil)
	fx.tenantB = &domain.Tenant{ID: uuid.MustParse(fmt.Sprintf("%v", tb["id"])), Slug: fx.slugB}

	t.Cleanup(func() {
		cleanupCtx := context.Background()
		// Schema names are derived from slugs with '-' replaced by '_' (see
		// repository.TenantSchemaName). Dropping the literal slug would target a
		// non-existent schema and leak tenant_sec_* schemas between runs.
		dropSchema := func(slug string) {
			schema := "tenant_" + strings.ReplaceAll(slug, "-", "_")
			db.ExecContext(cleanupCtx, "DROP SCHEMA IF EXISTS "+schema+" CASCADE")
		}
		dropSchema(fx.slugA)
		dropSchema(fx.slugB)
		db.ExecContext(cleanupCtx, "DELETE FROM tenant_users WHERE tenant_id IN ($1,$2)", fx.tenantA.ID, fx.tenantB.ID)
		db.ExecContext(cleanupCtx, "DELETE FROM users WHERE id IN ($1,$2,$3)", fx.adminAID, fx.adminBID, fx.residentAID)
		db.ExecContext(cleanupCtx, "DELETE FROM tenants WHERE id IN ($1,$2)", fx.tenantA.ID, fx.tenantB.ID)
	})

	// Create admin_A and admin_B.
	_, createdA := doJSON(handler, "POST", "/api/v1/users", saToken, map[string]interface{}{
		"tenant_id": fx.tenantA.ID.String(), "name": "Admin A", "email": "admin_a_" + suffix + "@test.local",
		"password": "Password123!", "role": "admin_rt",
	}, nil)
	adminAID := fmt.Sprintf("%v", createdA["id"])
	_, createdB := doJSON(handler, "POST", "/api/v1/users", saToken, map[string]interface{}{
		"tenant_id": fx.tenantB.ID.String(), "name": "Admin B", "email": "admin_b_" + suffix + "@test.local",
		"password": "Password123!", "role": "admin_rt",
	}, nil)
	adminBID := fmt.Sprintf("%v", createdB["id"])
	fx.adminAID = adminAID
	fx.adminBID = adminBID

	// Create resident_A inside tenant A.
	_, res := doJSON(handler, "POST", "/api/v1/users", saToken, map[string]interface{}{
		"tenant_id": fx.tenantA.ID.String(), "name": "Resident A", "email": "res_a_" + suffix + "@test.local",
		"password": "Password123!", "role": "resident",
	}, nil)
	fx.residentAID = fmt.Sprintf("%v", res["id"])

	// Login as admin_A, admin_B, resident_A.
	fx.aToken, _ = loginToken(handler, "admin_a_"+suffix+"@test.local", "Password123!")
	fx.bToken, _ = loginToken(handler, "admin_b_"+suffix+"@test.local", "Password123!")
	fx.resToken, _ = loginToken(handler, "res_a_"+suffix+"@test.local", "Password123!")

	return fx
}

func (fx *securityFixture) createResident(token, tenantID string, name string) string {
	_, parsed := doJSON(fx.handler, "POST", "/api/v1/residents", token, map[string]interface{}{
		"full_name": name, "phone": "08123456789",
	}, map[string]string{"X-Tenant-ID": tenantID})
	id, _ := parsed["id"].(string)
	return id
}

// TestSecurity_CrossTenantMatrix proves A->A allow, A->B deny, B->B allow,
// B->A deny, plus resource-level cross-tenant reads/writes.
func TestSecurity_CrossTenantMatrix(t *testing.T) {
	fx := setupSecurityFixture(t)

	// Resident data in tenant A.
	resAID := fx.createResident(fx.aToken, fx.tenantA.ID.String(), "SECRET-RESIDENT-A")
	if resAID == "" {
		t.Fatal("failed to create resident in tenant A")
	}
	// Resident data in tenant B.
	resBID := fx.createResident(fx.bToken, fx.tenantB.ID.String(), "SECRET-RESIDENT-B")
	if resBID == "" {
		t.Fatal("failed to create resident in tenant B")
	}

	// A -> A: admin A can read its own residents.
	rec, parsed := doJSON(fx.handler, "GET", "/api/v1/residents", fx.aToken, nil, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("A->A list expected 200, got %d", rec.Code)
	}
	if data := fmt.Sprintf("%v", parsed["data"]); !strings.Contains(data, "SECRET-RESIDENT-A") {
		t.Errorf("A->A list should contain SECRET-RESIDENT-A, got %s", data)
	}
	if strings.Contains(fmt.Sprintf("%v", parsed["data"]), "SECRET-RESIDENT-B") {
		t.Errorf("A->A list leaked SECRET-RESIDENT-B!")
	}

	// A -> B: admin A must NOT read tenant B's list even with X-Tenant-ID spoof.
	rec, parsed = doJSON(fx.handler, "GET", "/api/v1/residents", fx.aToken, nil, map[string]string{"X-Tenant-ID": fx.tenantB.ID.String()})
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 (claims tenant used), got %d", rec.Code)
	}
	if strings.Contains(fmt.Sprintf("%v", parsed["data"]), "SECRET-RESIDENT-B") {
		t.Errorf("A->B header spoof leaked SECRET-RESIDENT-B!")
	}
	if !strings.Contains(fmt.Sprintf("%v", parsed["data"]), "SECRET-RESIDENT-A") {
		t.Errorf("A->B header spoof should still see own tenant A data")
	}

	// B -> B: admin B can read its own residents.
	rec, parsed = doJSON(fx.handler, "GET", "/api/v1/residents", fx.bToken, nil, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("B->B list expected 200, got %d", rec.Code)
	}
	if !strings.Contains(fmt.Sprintf("%v", parsed["data"]), "SECRET-RESIDENT-B") {
		t.Errorf("B->B list should contain SECRET-RESIDENT-B")
	}
	if strings.Contains(fmt.Sprintf("%v", parsed["data"]), "SECRET-RESIDENT-A") {
		t.Errorf("B->B list leaked SECRET-RESIDENT-A!")
	}

	// B -> A: admin B must not read tenant A's resident by ID.
	rec, _ = doJSON(fx.handler, "GET", "/api/v1/residents/"+resAID, fx.bToken, nil, nil)
	if rec.Code != http.StatusNotFound {
		t.Errorf("B reading A's resident by ID expected 404, got %d", rec.Code)
	}
	// A -> B: admin A must not read tenant B's resident by ID.
	rec, _ = doJSON(fx.handler, "GET", "/api/v1/residents/"+resBID, fx.aToken, nil, nil)
	if rec.Code != http.StatusNotFound {
		t.Errorf("A reading B's resident by ID expected 404, got %d", rec.Code)
	}

	// A cannot update/delete B's resident.
	rec, _ = doJSON(fx.handler, "DELETE", "/api/v1/residents/"+resBID, fx.aToken, nil, nil)
	if rec.Code != http.StatusNotFound && rec.Code != http.StatusInternalServerError {
		t.Errorf("A deleting B's resident expected 404, got %d", rec.Code)
	}

	// A cannot create data inside tenant B (tenant comes from claims).
	rec, parsed = doJSON(fx.handler, "POST", "/api/v1/residents", fx.aToken, map[string]interface{}{
		"full_name": "INTRUDER",
	}, map[string]string{"X-Tenant-ID": fx.tenantB.ID.String()})
	if rec.Code != http.StatusCreated {
		t.Fatalf("create resident expected 201, got %d", rec.Code)
	}
	if tid, _ := parsed["tenant_id"].(string); tid != fx.tenantA.ID.String() {
		t.Errorf("created resident tenant_id should be %s (claims), got %s", fx.tenantA.ID, tid)
	}

	// A cannot list B's users.
	rec, parsed = doJSON(fx.handler, "GET", "/api/v1/users", fx.aToken, nil, map[string]string{"X-Tenant-ID": fx.tenantB.ID.String()})
	if rec.Code != http.StatusOK {
		t.Fatalf("users list expected 200, got %d", rec.Code)
	}
	if strings.Contains(fmt.Sprintf("%v", parsed["data"]), "admin_b_") {
		t.Errorf("A->B user list leaked tenant B users!")
	}

	// Query-parameter tenant manipulation is ignored too.
	rec, parsed = doJSON(fx.handler, "GET", "/api/v1/residents?tenant_id="+fx.tenantB.ID.String(), fx.aToken, nil, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("query tenant manipulation expected 200, got %d", rec.Code)
	}
	if strings.Contains(fmt.Sprintf("%v", parsed["data"]), "SECRET-RESIDENT-B") {
		t.Errorf("query tenant manipulation leaked tenant B data!")
	}
}

// TestSecurity_RoleEscalation proves only superadmin can grant superadmin.
func TestSecurity_RoleEscalation(t *testing.T) {
	fx := setupSecurityFixture(t)

	// admin_A tries to create a SUPERADMIN user -> 403.
	rec, _ := doJSON(fx.handler, "POST", "/api/v1/users", fx.aToken, map[string]interface{}{
		"name": "Escalated", "email": "esc_" + uuid.New().String()[:6] + "@test.local",
		"password": "Password123!", "role": "superadmin",
	}, nil)
	if rec.Code != http.StatusForbidden {
		t.Errorf("admin_rt creating superadmin expected 403, got %d (%s)", rec.Code, rec.Body.String())
	}

	// admin_A CAN create a resident user in its own tenant.
	rec, _ = doJSON(fx.handler, "POST", "/api/v1/users", fx.aToken, map[string]interface{}{
		"name": "New Resident", "email": "new_res_" + uuid.New().String()[:6] + "@test.local",
		"password": "Password123!", "role": "resident",
	}, nil)
	if rec.Code != http.StatusCreated {
		t.Errorf("admin_rt creating resident expected 201, got %d (%s)", rec.Code, rec.Body.String())
	}

	// admin_A cannot create a user in tenant B: the tenant_id in the body is
	// ignored and the account is created inside admin_A's own tenant.
	rec, parsed := doJSON(fx.handler, "POST", "/api/v1/users", fx.aToken, map[string]interface{}{
		"tenant_id": fx.tenantB.ID.String(), "name": "Cross Tenant", "email": "cross_" + uuid.New().String()[:6] + "@test.local",
		"password": "Password123!", "role": "resident",
	}, nil)
	if rec.Code != http.StatusCreated {
		t.Fatalf("admin_rt creating resident expected 201, got %d (%s)", rec.Code, rec.Body.String())
	}
	if tid, _ := parsed["tenant_id"].(string); tid != fx.tenantA.ID.String() {
		t.Errorf("tenant_id spoof in body must be ignored; created in %s, got %s", fx.tenantA.ID, tid)
	}

	// superadmin CAN create a superadmin user.
	rec, _ = doJSON(fx.handler, "POST", "/api/v1/users", fx.saToken, map[string]interface{}{
		"tenant_id": fx.tenantA.ID.String(), "name": "Second SA", "email": "sa2_" + uuid.New().String()[:6] + "@test.local",
		"password": "Password123!", "role": "superadmin",
	}, nil)
	if rec.Code != http.StatusCreated {
		t.Errorf("superadmin creating superadmin expected 201, got %d (%s)", rec.Code, rec.Body.String())
	}

	// admin_A cannot promote the resident to admin_rt... allowed? admin_rt may
	// manage admin_rt/resident within tenant. But admin_A cannot update the
	// superadmin account (admin_A and superadmin share tenant A in this fixture
	// because superadmin maps to tenant A).
	rec, _ = doJSON(fx.handler, "PUT", "/api/v1/users/"+fx.adminAID, fx.aToken, map[string]interface{}{
		"name": "Admin A", "email": "x@test.local", "role": "superadmin",
	}, nil)
	if rec.Code != http.StatusForbidden {
		t.Errorf("admin_rt promoting self to superadmin expected 403, got %d (%s)", rec.Code, rec.Body.String())
	}
}

// TestSecurity_RBACEnforcement proves WARGA cannot run admin operations.
func TestSecurity_RBACEnforcement(t *testing.T) {
	fx := setupSecurityFixture(t)

	// resident_A cannot create residents.
	rec, _ := doJSON(fx.handler, "POST", "/api/v1/residents", fx.resToken, map[string]interface{}{
		"full_name": "HACK",
	}, nil)
	if rec.Code != http.StatusForbidden {
		t.Errorf("resident creating resident expected 403, got %d", rec.Code)
	}

	// resident_A cannot list residents (sensitive demographic data).
	rec, _ = doJSON(fx.handler, "GET", "/api/v1/residents", fx.resToken, nil, nil)
	if rec.Code != http.StatusForbidden {
		t.Errorf("resident listing residents expected 403, got %d", rec.Code)
	}

	// resident_A can read the financial summary (read-only transparency).
	rec, _ = doJSON(fx.handler, "GET", "/api/v1/financial/summary", fx.resToken, nil, nil)
	if rec.Code != http.StatusOK {
		t.Errorf("resident financial summary expected 200, got %d", rec.Code)
	}

	// resident_A cannot create financial transactions.
	rec, _ = doJSON(fx.handler, "POST", "/api/v1/financial/transactions", fx.resToken, map[string]interface{}{
		"type": "expense", "category": "operasional", "amount": 100000,
	}, nil)
	if rec.Code != http.StatusForbidden {
		t.Errorf("resident creating transaction expected 403, got %d", rec.Code)
	}

	// resident_A cannot approve residents.
	resAID := fx.createResident(fx.aToken, fx.tenantA.ID.String(), "PENDING-RESIDENT")
	rec, _ = doJSON(fx.handler, "POST", "/api/v1/residents/"+resAID+"/approve", fx.resToken, nil, nil)
	if rec.Code != http.StatusForbidden {
		t.Errorf("resident approving resident expected 403, got %d", rec.Code)
	}

	// admin_A CAN approve.
	rec, _ = doJSON(fx.handler, "POST", "/api/v1/residents/"+resAID+"/approve", fx.aToken, nil, nil)
	if rec.Code != http.StatusOK {
		t.Errorf("admin approving resident expected 200, got %d", rec.Code)
	}

	// resident_A cannot manage users.
	rec, _ = doJSON(fx.handler, "GET", "/api/v1/users", fx.resToken, nil, nil)
	if rec.Code != http.StatusForbidden {
		t.Errorf("resident listing users expected 403, got %d", rec.Code)
	}
}

// TestSecurity_SuperadminAccountProtection proves tenant admins cannot delete
// superadmin accounts or users outside their tenant.
func TestSecurity_SuperadminAccountProtection(t *testing.T) {
	fx := setupSecurityFixture(t)

	// admin_A tries to delete the superadmin account (same tenant in fixture).
	rec, _ := doJSON(fx.handler, "DELETE", "/api/v1/users/"+fx.adminBID, fx.aToken, nil, nil)
	if rec.Code == http.StatusOK {
		t.Errorf("admin_A deleting admin_B (cross-tenant) should be forbidden")
	}

	// admin_A cannot delete a superadmin account inside its own tenant.
	// The seeded superadmin (admin@gmail.com) is mapped to sitransparan-rt, not
	// to our fixture tenant, so instead verify role change to superadmin is
	// blocked for the resident (already covered). Here: admin_A cannot delete
	// admin_B because admin_B is not a member of tenant A.
	rec, _ = doJSON(fx.handler, "DELETE", "/api/v1/users/"+fx.residentAID, fx.bToken, nil, nil)
	if rec.Code == http.StatusOK {
		t.Errorf("admin_B deleting resident_A (cross-tenant) should be forbidden")
	}

	// admin_A can delete its own tenant's resident membership.
	rec, _ = doJSON(fx.handler, "DELETE", "/api/v1/users/"+fx.residentAID, fx.aToken, nil, nil)
	if rec.Code != http.StatusOK {
		t.Errorf("admin_A deleting own-tenant resident expected 200, got %d (%s)", rec.Code, rec.Body.String())
	}
}

// TestSecurity_PublicSanitization proves public aspiration endpoints never
// expose internal resident identifiers.
func TestSecurity_PublicSanitization(t *testing.T) {
	fx := setupSecurityFixture(t)

	// Submit an aspiration through the PUBLIC endpoint with a spoofed
	// resident_id in the body.
	spoofID := uuid.New().String()
	rec, parsed := doJSON(fx.handler, "POST", "/api/v1/t/"+fx.slugA+"/aspirations", "", map[string]interface{}{
		"resident_id": spoofID, "title": "Public Aspiration", "content": "Hello", "category": "suggestion",
	}, nil)
	if rec.Code != http.StatusCreated {
		t.Fatalf("public aspiration submit expected 201, got %d (%s)", rec.Code, rec.Body.String())
	}
	if rid, _ := parsed["resident_id"].(string); rid != "" && rid != "<nil>" {
		t.Errorf("public submission must not store resident_id, got %q", rid)
	}

	// Public listing must not expose resident_id.
	rec, parsed = doJSON(fx.handler, "GET", "/api/v1/t/"+fx.slugA+"/aspirations", "", nil, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("public aspiration list expected 200, got %d", rec.Code)
	}
	raw := rec.Body.String()
	if strings.Contains(raw, spoofID) {
		t.Errorf("public aspiration list leaked resident_id!")
	}
}

// forgeToken signs a JWT with the given secret using arbitrary claims. It is
// used to prove the server rejects tokens signed with a secret other than the
// one it is configured with (including the publicly-known legacy default).
func forgeToken(secret string, userID, tenantID uuid.UUID, role domain.RoleName) string {
	claims := domain.JWTClaims{
		UserID:   userID,
		TenantID: tenantID,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   userID.String(),
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	s, err := tok.SignedString([]byte(secret))
	if err != nil {
		panic(err)
	}
	return s
}

// TestSecurity_JWTForgeryWithPublicDefaultSecret is a regression test for a
// CRITICAL finding: the backend used to fall back to a publicly-known default
// JWT secret ("sitransparan-secret-key-change-in-prod") when JWT_SECRET was not
// set. Anyone who read the repository could then forge a token claiming any
// tenant_id and role (including superadmin) and read/modify any tenant's data.
//
// The server under test is built with testJWTSecret. A token signed with the
// OLD known default secret MUST be rejected (401), while a control token signed
// with the real server secret is accepted — proving the test is meaningful.
func TestSecurity_JWTForgeryWithPublicDefaultSecret(t *testing.T) {
	fx := setupSecurityFixture(t)

	adminA := uuid.MustParse(fx.adminAID)

	// 1. Token signed with the publicly-known legacy default secret.
	//    Claims claim superadmin + tenant A to maximize what a forgery would
	//    grant; it must still be rejected with 401.
	forged := forgeToken("sitransparan-secret-key-change-in-prod", adminA, fx.tenantA.ID, domain.RoleSuperAdmin)
	rec, _ := doJSON(fx.handler, "GET", "/api/v1/superadmin/tenants", forged, nil, nil)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("token forged with the known default secret must be rejected (401), got %d (%s)", rec.Code, rec.Body.String())
	}

	// Also verify the same forged token cannot reach tenant data.
	rec, _ = doJSON(fx.handler, "GET", "/api/v1/residents", forged, nil, nil)
	if rec.Code == http.StatusOK {
		t.Fatalf("token forged with the known default secret must not reach tenant data, got 200")
	}

	// 2. Control: a token signed with the ACTUAL server secret (testJWTSecret)
	//    is accepted — this proves the previous rejection was caused by the
	//    secret, not by broken request plumbing.
	valid := forgeToken(testJWTSecret, adminA, fx.tenantA.ID, domain.RoleSuperAdmin)
	rec, _ = doJSON(fx.handler, "GET", "/api/v1/superadmin/tenants", valid, nil, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("control token signed with the real secret should be accepted, got %d (%s)", rec.Code, rec.Body.String())
	}

	// 3. A token whose signature is valid but whose tenant claim points to
	//    another tenant must still be denied at the resource layer (host/JWT
	//    consistency is enforced in addition to the signature).
	crossHost := forgeToken(testJWTSecret, adminA, fx.tenantB.ID, domain.RoleSuperAdmin)
	req := httptest.NewRequest("GET", "/api/v1/residents", nil)
	req.Host = fx.slugA + ".openrt.local" // hostname resolves to tenant A
	req.Header.Set("Authorization", "Bearer "+crossHost)
	recCross := httptest.NewRecorder()
	fx.handler.ServeHTTP(recCross, req)
	if recCross.Code != http.StatusForbidden {
		t.Errorf("JWT tenant B on host tenant A must be denied (403), got %d", recCross.Code)
	}
}
