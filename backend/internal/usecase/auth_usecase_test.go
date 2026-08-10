package usecase_test

import (
	"context"
	"errors"
	"testing"

	"backend/internal/domain"
	"backend/internal/usecase"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type mockUserRepo struct {
	users map[string]*domain.User
}

func (m *mockUserRepo) Create(ctx context.Context, u *domain.User) error {
	m.users[u.Email] = u
	return nil
}
func (m *mockUserRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	for _, u := range m.users {
		if u.ID == id {
			return u, nil
		}
	}
	return nil, nil
}
func (m *mockUserRepo) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	if u, ok := m.users[email]; ok {
		return u, nil
	}
	return nil, nil
}
func (m *mockUserRepo) Update(ctx context.Context, u *domain.User) error { return nil }
func (m *mockUserRepo) Delete(ctx context.Context, id uuid.UUID) error       { return nil }
func (m *mockUserRepo) ListByTenant(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.UserWithRole, int64, error) {
	return nil, 0, nil
}
func (m *mockUserRepo) ListAll(ctx context.Context, limit, offset int) ([]*domain.UserWithRole, int64, error) {
	return nil, 0, nil
}

type mockTenantRepo struct {
	tenants map[string]*domain.Tenant
}

func (m *mockTenantRepo) Create(ctx context.Context, t *domain.Tenant) error {
	m.tenants[t.Slug] = t
	return nil
}
func (m *mockTenantRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Tenant, error) {
	for _, t := range m.tenants {
		if t.ID == id {
			return t, nil
		}
	}
	return nil, nil
}
func (m *mockTenantRepo) GetBySlug(ctx context.Context, slug string) (*domain.Tenant, error) {
	if t, ok := m.tenants[slug]; ok {
		return t, nil
	}
	return nil, nil
}
func (m *mockTenantRepo) GetByDomain(ctx context.Context, domainName string) (*domain.Tenant, error) {
	return nil, nil
}
func (m *mockTenantRepo) Update(ctx context.Context, t *domain.Tenant) error { return nil }
func (m *mockTenantRepo) Delete(ctx context.Context, id uuid.UUID) error        { return nil }
func (m *mockTenantRepo) List(ctx context.Context, limit, offset int) ([]*domain.Tenant, int64, error) {
	var list []*domain.Tenant
	for _, t := range m.tenants {
		list = append(list, t)
	}
	return list, int64(len(list)), nil
}
func (m *mockTenantRepo) SetSearchPath(ctx context.Context, slug string) error {
	return nil
}

type mockTenantUserRepo struct {
	mappings map[uuid.UUID][]*domain.TenantUser // userID -> mappings
}

func newMockTenantUserRepo() *mockTenantUserRepo {
	return &mockTenantUserRepo{mappings: make(map[uuid.UUID][]*domain.TenantUser)}
}

func (m *mockTenantUserRepo) Create(ctx context.Context, tu *domain.TenantUser) error {
	m.mappings[tu.UserID] = append(m.mappings[tu.UserID], tu)
	return nil
}
func (m *mockTenantUserRepo) GetByTenantAndUser(ctx context.Context, tenantID, userID uuid.UUID) (*domain.TenantUser, error) {
	for _, tu := range m.mappings[userID] {
		if tu.TenantID == tenantID {
			return tu, nil
		}
	}
	return nil, errors.New("not found")
}
func (m *mockTenantUserRepo) UpdateRole(ctx context.Context, tenantID, userID, roleID uuid.UUID) error {
	return nil
}
func (m *mockTenantUserRepo) Delete(ctx context.Context, tenantID, userID uuid.UUID) error {
	return nil
}
func (m *mockTenantUserRepo) ListByUser(ctx context.Context, userID uuid.UUID) ([]*domain.TenantUser, error) {
	return m.mappings[userID], nil
}
func (m *mockTenantUserRepo) ListTenantsByUserID(ctx context.Context, userID uuid.UUID) ([]*domain.Tenant, error) {
	return nil, nil
}

type mockRoleRepo struct{}

func (m *mockRoleRepo) GetByName(ctx context.Context, name domain.RoleName) (*domain.Role, error) {
	return &domain.Role{ID: uuid.New(), Name: name}, nil
}

func newAuthUsecase(tuRepo *mockTenantUserRepo) (usecase.AuthUsecase, *mockUserRepo, *mockTenantRepo) {
	userRepo := &mockUserRepo{users: make(map[string]*domain.User)}
	tenantRepo := &mockTenantRepo{tenants: make(map[string]*domain.Tenant)}
	roleRepo := &mockRoleRepo{}
	return usecase.NewAuthUsecase(tenantRepo, userRepo, tuRepo, roleRepo, "secret-key", 0), userRepo, tenantRepo
}

func TestAuthUsecase_RegisterAndLogin(t *testing.T) {
	tuRepo := newMockTenantUserRepo()
	uc, _, _ := newAuthUsecase(tuRepo)

	// Register User
	user, err := uc.Register(context.Background(), "Jane Doe", "jane@example.com", "password123", nil)
	if err != nil {
		t.Fatalf("Register failed: %v", err)
	}

	if user.Name != "Jane Doe" {
		t.Errorf("expected name Jane Doe, got %s", user.Name)
	}

	// Login user without a tenant mapping -> lowest privilege resident role.
	token, loggedUser, role, err := uc.Login(context.Background(), "jane@example.com", "password123", nil)
	if err != nil {
		t.Fatalf("Login failed: %v", err)
	}

	if token == "" {
		t.Error("expected non-empty token")
	}
	if loggedUser.ID != user.ID {
		t.Errorf("expected user ID %s, got %s", user.ID, loggedUser.ID)
	}
	if role != domain.RoleResident {
		t.Errorf("expected role resident for unmapped user, got %s", role)
	}

	// Login with invalid password must fail.
	if _, _, _, err := uc.Login(context.Background(), "jane@example.com", "wrong-password", nil); err == nil {
		t.Error("expected error for invalid password")
	}
}

func TestAuthUsecase_RoleComesFromDatabaseMapping(t *testing.T) {
	tuRepo := newMockTenantUserRepo()
	uc, userRepo, _ := newAuthUsecase(tuRepo)

	hash, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.MinCost)

	tenantA := &domain.Tenant{ID: uuid.New(), Slug: "tenant-a"}
	user := &domain.User{ID: uuid.New(), Email: "admin_a@example.com", Name: "Admin A", PasswordHash: string(hash)}
	userRepo.users[user.Email] = user
	tuRepo.mappings[user.ID] = []*domain.TenantUser{
		{TenantID: tenantA.ID, UserID: user.ID, RoleName: domain.RoleAdminRT},
	}

	token, _, role, err := uc.Login(context.Background(), user.Email, "password123", nil)
	if err != nil {
		t.Fatalf("Login failed: %v", err)
	}
	if token == "" || role != domain.RoleAdminRT {
		t.Errorf("expected role admin_rt from mapping, got %s", role)
	}

	// A user with a superadmin mapping gets the superadmin role from the DB —
	// never from the email address.
	su := &domain.User{ID: uuid.New(), Email: "someone@example.com", Name: "SA", PasswordHash: string(hash)}
	userRepo.users[su.Email] = su
	tuRepo.mappings[su.ID] = []*domain.TenantUser{
		{TenantID: tenantA.ID, UserID: su.ID, RoleName: domain.RoleSuperAdmin},
	}
	token, _, role, err = uc.Login(context.Background(), su.Email, "password123", nil)
	if err != nil {
		t.Fatalf("Login failed: %v", err)
	}
	if token == "" || role != domain.RoleSuperAdmin {
		t.Errorf("expected superadmin role from mapping, got %s", role)
	}
}

func TestAuthUsecase_SwitchTenantAuthorization(t *testing.T) {
	tuRepo := newMockTenantUserRepo()
	uc, userRepo, tenantRepo := newAuthUsecase(tuRepo)

	tenantA := &domain.Tenant{ID: uuid.New(), Slug: "tenant-a"}
	tenantB := &domain.Tenant{ID: uuid.New(), Slug: "tenant-b"}
	tenantRepo.tenants[tenantA.Slug] = tenantA
	tenantRepo.tenants[tenantB.Slug] = tenantB

	// User mapped to A and B.
	user := &domain.User{ID: uuid.New(), Email: "multi@example.com", Name: "Multi"}
	userRepo.users[user.Email] = user
	tuRepo.mappings[user.ID] = []*domain.TenantUser{
		{TenantID: tenantA.ID, UserID: user.ID, RoleName: domain.RoleAdminRT},
		{TenantID: tenantB.ID, UserID: user.ID, RoleName: domain.RoleResident},
	}

	// Switching to a mapped tenant is allowed.
	token, _, role, err := uc.SwitchTenant(context.Background(), user.ID, tenantB.ID)
	if err != nil {
		t.Fatalf("SwitchTenant to mapped tenant failed: %v", err)
	}
	if token == "" || role != domain.RoleResident {
		t.Errorf("expected resident role for tenant B, got %s", role)
	}

	// Switching to an unmapped tenant is denied.
	tenantC := &domain.Tenant{ID: uuid.New(), Slug: "tenant-c"}
	if _, _, _, err := uc.SwitchTenant(context.Background(), user.ID, tenantC.ID); err == nil {
		t.Error("expected error when switching to unmapped tenant")
	}

	// A user with no mappings cannot switch anywhere.
	loner := &domain.User{ID: uuid.New(), Email: "loner@example.com", Name: "Loner"}
	userRepo.users[loner.Email] = loner
	if _, _, _, err := uc.SwitchTenant(context.Background(), loner.ID, tenantA.ID); err == nil {
		t.Error("expected error when user has no mappings")
	}
}

func TestAuthUsecase_TenantCRUD(t *testing.T) {
	tuRepo := newMockTenantUserRepo()
	uc, _, _ := newAuthUsecase(tuRepo)

	// Create Tenant
	tenant, err := uc.CreateTenant(context.Background(), "RT 05", "rt-05", nil, nil)
	if err != nil {
		t.Fatalf("CreateTenant failed: %v", err)
	}
	if tenant.Name != "RT 05" {
		t.Errorf("expected tenant name RT 05, got %s", tenant.Name)
	}

	// List Tenants
	tenants, total, err := uc.ListTenants(context.Background(), 10, 0)
	if err != nil {
		t.Fatalf("ListTenants failed: %v", err)
	}
	if total != 1 {
		t.Errorf("expected 1 tenant, got %d", total)
	}
	if len(tenants) != 1 {
		t.Errorf("expected len 1, got %d", len(tenants))
	}
}
