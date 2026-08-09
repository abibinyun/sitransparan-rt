package repository_test

import (
	"context"
	"database/sql"
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

func TestTenantIsolation_SchemaIsolation(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	ctx := context.Background()
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

	if err := tenantRepo.Create(ctx, tenantA); err != nil {
		t.Fatalf("failed to create tenant A: %v", err)
	}
	if err := tenantRepo.Create(ctx, tenantB); err != nil {
		t.Fatalf("failed to create tenant B: %v", err)
	}

	defer func() {
		db.ExecContext(ctx, fmt.Sprintf("DROP SCHEMA IF EXISTS tenant_%s CASCADE", slugA))
		db.ExecContext(ctx, fmt.Sprintf("DROP SCHEMA IF EXISTS tenant_%s CASCADE", slugB))
		db.ExecContext(ctx, "DELETE FROM public.tenants WHERE id IN ($1, $2)", tenantA.ID, tenantB.ID)
	}()

	resRepo := repository.NewResidentRepository(db)

	// Insert resident in Tenant A
	if err := repository.SetTenantSearchPath(ctx, db, tenantA.Slug); err != nil {
		t.Fatalf("failed to set search_path for A: %v", err)
	}

	nameA := "Resident in Tenant A"
	nikA := fmt.Sprintf("317%s", uuid.New().String()[:12])
	resA := &domain.Resident{
		ID:       uuid.New(),
		TenantID: tenantA.ID,
		FullName: &nameA,
		NIK:      &nikA,
	}
	if err := resRepo.Create(ctx, resA); err != nil {
		t.Fatalf("failed to create resident in tenant A: %v", err)
	}

	// Set search path to Tenant B and query
	if err := repository.SetTenantSearchPath(ctx, db, tenantB.Slug); err != nil {
		t.Fatalf("failed to set search_path for B: %v", err)
	}

	fetchedRes, err := resRepo.GetByID(ctx, tenantB.ID, resA.ID)
	if err == nil && fetchedRes != nil {
		t.Errorf("cross-tenant leakage detected! Tenant B accessed resident of Tenant A: %v", fetchedRes)
	}

	// Verify count in tenant B schema is 0
	listB, countB, err := resRepo.List(ctx, tenantB.ID, "", 10, 0)
	if err != nil {
		t.Fatalf("failed to list residents in tenant B: %v", err)
	}
	if countB != 0 || len(listB) != 0 {
		t.Errorf("expected 0 residents in tenant B, got %d", countB)
	}

	// Switch back to Tenant A and verify resident exists
	if err := repository.SetTenantSearchPath(ctx, db, tenantA.Slug); err != nil {
		t.Fatalf("failed to set search_path back to A: %v", err)
	}

	listA, countA, err := resRepo.List(ctx, tenantA.ID, "", 10, 0)
	if err != nil {
		t.Fatalf("failed to list residents in tenant A: %v", err)
	}
	if countA != 1 || len(listA) != 1 {
		t.Errorf("expected 1 resident in tenant A, got %d", countA)
	}
}
