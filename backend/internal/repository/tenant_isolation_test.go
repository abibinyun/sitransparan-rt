package repository_test

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"testing"

	"backend/internal/domain"
	"backend/internal/repository"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

func getTestDB(t *testing.T) *sql.DB {
	t.Helper()
	connStr := os.Getenv("TEST_DATABASE_URL")
	if connStr == "" {
		connStr = os.Getenv("DATABASE_URL")
	}
	if connStr == "" {
		t.Skip("Skipping integration test: TEST_DATABASE_URL or DATABASE_URL not set")
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

// ctxWithTenant attaches a trusted tenant to the context, mirroring what
// TenantMiddleware does for authenticated requests. Repositories derive the
// tenant schema (tenant_<slug>) from this context.
func ctxWithTenant(parent context.Context, t *domain.Tenant) context.Context {
	return context.WithValue(parent, domain.TenantContextKey, t)
}

func TestTenantIsolation_SchemaIsolation(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	baseCtx := context.Background()
	tenantRepo := repository.NewTenantRepository(db)

	slugA := fmt.Sprintf("test_rt_a_%s", uuid.New().String()[:8])
	slugB := fmt.Sprintf("test_rt_b_%s", uuid.New().String()[:8])

	tenantA := &domain.Tenant{
		ID:   uuid.New(),
		Name: "RT A",
		Slug: slugA,
	}
	tenantB := &domain.Tenant{
		ID:   uuid.New(),
		Name: "RT B",
		Slug: slugB,
	}

	if err := tenantRepo.Create(baseCtx, tenantA); err != nil {
		t.Fatalf("failed to create tenant A: %v", err)
	}
	if err := tenantRepo.Create(baseCtx, tenantB); err != nil {
		t.Fatalf("failed to create tenant B: %v", err)
	}

	defer func() {
		db.ExecContext(baseCtx, fmt.Sprintf("DROP SCHEMA IF EXISTS tenant_%s CASCADE", slugA))
		db.ExecContext(baseCtx, fmt.Sprintf("DROP SCHEMA IF EXISTS tenant_%s CASCADE", slugB))
		db.ExecContext(baseCtx, "DELETE FROM tenants WHERE id IN ($1, $2)", tenantA.ID, tenantB.ID)
	}()

	ctxA := ctxWithTenant(baseCtx, tenantA)
	ctxB := ctxWithTenant(baseCtx, tenantB)

	resRepo := repository.NewResidentRepository(db)

	// Insert resident in Tenant A (schema tenant_<slugA>)
	nameA := "Resident in Tenant A"
	nikA := fmt.Sprintf("317%s", uuid.New().String()[:12])
	resA := &domain.Resident{
		ID:       uuid.New(),
		TenantID: tenantA.ID,
		FullName: &nameA,
		NIK:      &nikA,
	}
	if err := resRepo.Create(ctxA, resA); err != nil {
		t.Fatalf("failed to create resident in tenant A: %v", err)
	}

	// Tenant B must NOT be able to read tenant A's resident, even knowing its
	// exact ID (schema isolation: the query runs against tenant_<slugB>).
	fetchedRes, err := resRepo.GetByID(ctxB, tenantB.ID, resA.ID)
	if err == nil && fetchedRes != nil {
		t.Errorf("cross-tenant leakage detected! Tenant B accessed resident of Tenant A: %v", fetchedRes)
	}
	if err != nil && !errors.Is(err, repository.ErrNotFound) && !errors.Is(err, sql.ErrNoRows) {
		t.Logf("cross-tenant GetByID returned error (expected not-found): %v", err)
	}

	// Tenant B must not see tenant A's resident in its list.
	listB, countB, err := resRepo.List(ctxB, tenantB.ID, "", nil, 10, 0)
	if err != nil {
		t.Fatalf("failed to list residents in tenant B: %v", err)
	}
	if countB != 0 || len(listB) != 0 {
		t.Errorf("expected 0 residents in tenant B, got %d", countB)
	}

	// Tenant A still sees its own resident.
	listA, countA, err := resRepo.List(ctxA, tenantA.ID, "", nil, 10, 0)
	if err != nil {
		t.Fatalf("failed to list residents in tenant A: %v", err)
	}
	if countA != 1 || len(listA) != 1 {
		t.Errorf("expected 1 resident in tenant A, got %d", countA)
	}

	// Tenant A cannot update/delete tenant B's (non-existent) resources.
	nameX := "X"
	if err := resRepo.Update(ctxA, &domain.Resident{ID: resA.ID, TenantID: tenantB.ID, FullName: &nameX}); err == nil {
		t.Errorf("expected update with mismatched tenant to fail")
	}
}
