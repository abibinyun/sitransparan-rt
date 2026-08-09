package usecase_test

import (
	"context"
	"testing"

	"backend/internal/domain"
	"backend/internal/usecase"

	"github.com/google/uuid"
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

type mockTenantUserRepo struct{}

func (m *mockTenantUserRepo) Create(ctx context.Context, tu *domain.TenantUser) error { return nil }
func (m *mockTenantUserRepo) GetByTenantAndUser(ctx context.Context, tenantID, userID uuid.UUID) (*domain.TenantUser, error) {
	return &domain.TenantUser{TenantID: tenantID, UserID: userID, RoleName: domain.RoleAdminRT}, nil
}
func (m *mockTenantUserRepo) ListByUser(ctx context.Context, userID uuid.UUID) ([]*domain.TenantUser, error) {
	return nil, nil
}
func (m *mockTenantUserRepo) ListTenantsByUserID(ctx context.Context, userID uuid.UUID) ([]*domain.Tenant, error) {
	return nil, nil
}

type mockRoleRepo struct{}

func (m *mockRoleRepo) GetByName(ctx context.Context, name domain.RoleName) (*domain.Role, error) {
	return &domain.Role{ID: uuid.New(), Name: name}, nil
}

func TestAuthUsecase_RegisterAndLogin(t *testing.T) {
	userRepo := &mockUserRepo{users: make(map[string]*domain.User)}
	tenantRepo := &mockTenantRepo{tenants: make(map[string]*domain.Tenant)}
	tuRepo := &mockTenantUserRepo{}
	roleRepo := &mockRoleRepo{}

	uc := usecase.NewAuthUsecase(tenantRepo, userRepo, tuRepo, roleRepo, "secret-key", 0)

	// Register User
	user, err := uc.Register(context.Background(), "Jane Doe", "jane@example.com", "password123", nil)
	if err != nil {
		t.Fatalf("Register failed: %v", err)
	}

	if user.Name != "Jane Doe" {
		t.Errorf("expected name Jane Doe, got %s", user.Name)
	}

	// Login User
	token, loggedUser, err := uc.Login(context.Background(), "jane@example.com", "password123", nil)
	if err != nil {
		t.Fatalf("Login failed: %v", err)
	}

	if token == "" {
		t.Error("expected non-empty token")
	}
	if loggedUser.ID != user.ID {
		t.Errorf("expected user ID %s, got %s", user.ID, loggedUser.ID)
	}

	// Login Superadmin admin@gmail.com
	superAdminUser, err := uc.Register(context.Background(), "Super Admin", "admin@gmail.com", "admin123", nil)
	if err != nil {
		t.Fatalf("Register superadmin failed: %v", err)
	}

	adminToken, loggedSuperAdmin, err := uc.Login(context.Background(), "admin@gmail.com", "admin123", nil)
	if err != nil {
		t.Fatalf("Login superadmin failed: %v", err)
	}

	if adminToken == "" || loggedSuperAdmin.ID != superAdminUser.ID {
		t.Error("superadmin login assertion failed")
	}
}

func TestAuthUsecase_TenantCRUD(t *testing.T) {
	userRepo := &mockUserRepo{users: make(map[string]*domain.User)}
	tenantRepo := &mockTenantRepo{tenants: make(map[string]*domain.Tenant)}
	tuRepo := &mockTenantUserRepo{}
	roleRepo := &mockRoleRepo{}

	uc := usecase.NewAuthUsecase(tenantRepo, userRepo, tuRepo, roleRepo, "secret-key", 0)

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
