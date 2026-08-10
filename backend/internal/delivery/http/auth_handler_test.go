package http_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	deliveryHttp "backend/internal/delivery/http"
	"backend/internal/domain"

	"github.com/google/uuid"
)

type mockAuthUsecase struct {
	tenants []*domain.Tenant
	user    *domain.User
	token   string
}

func (m *mockAuthUsecase) Login(ctx context.Context, email, password string, tenantID *uuid.UUID) (string, *domain.User, domain.RoleName, error) {
	return m.token, m.user, domain.RoleResident, nil
}
func (m *mockAuthUsecase) SwitchTenant(ctx context.Context, userID, tenantID uuid.UUID) (string, *domain.User, domain.RoleName, error) {
	return m.token, m.user, domain.RoleAdminRT, nil
}
func (m *mockAuthUsecase) Register(ctx context.Context, name, email, password string, phone *string) (*domain.User, error) {
	return m.user, nil
}
func (m *mockAuthUsecase) GetUserTenants(ctx context.Context, userID uuid.UUID) ([]*domain.Tenant, error) {
	return m.tenants, nil
}
func (m *mockAuthUsecase) CreateTenant(ctx context.Context, name, slug string, domainName, logoURL *string) (*domain.Tenant, error) {
	t := &domain.Tenant{ID: uuid.New(), Name: name, Slug: slug, Domain: domainName, LogoURL: logoURL}
	m.tenants = append(m.tenants, t)
	return t, nil
}
func (m *mockAuthUsecase) GetTenantByID(ctx context.Context, id uuid.UUID) (*domain.Tenant, error) {
	for _, t := range m.tenants {
		if t.ID == id {
			return t, nil
		}
	}
	return nil, nil
}
func (m *mockAuthUsecase) GetTenantBySlug(ctx context.Context, slug string) (*domain.Tenant, error) {
	for _, t := range m.tenants {
		if t.Slug == slug {
			return t, nil
		}
	}
	return nil, nil
}
func (m *mockAuthUsecase) UpdateTenant(ctx context.Context, id uuid.UUID, name, slug string, domainName, logoURL *string) (*domain.Tenant, error) {
	return &domain.Tenant{ID: id, Name: name, Slug: slug}, nil
}
func (m *mockAuthUsecase) DeleteTenant(ctx context.Context, id uuid.UUID) error {
	return nil
}
func (m *mockAuthUsecase) ListTenants(ctx context.Context, limit, offset int) ([]*domain.Tenant, int64, error) {
	return m.tenants, int64(len(m.tenants)), nil
}

func TestAuthHandler_Login(t *testing.T) {
	user := &domain.User{ID: uuid.New(), Email: "test@example.com", Name: "Test User"}
	usecase := &mockAuthUsecase{user: user, token: "mock-jwt-token"}
	handler := deliveryHttp.NewAuthHandler(usecase)

	body, _ := json.Marshal(map[string]string{
		"email":    "test@example.com",
		"password": "password123",
	})
	req := httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewBuffer(body))
	rec := httptest.NewRecorder()

	handler.Login(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var res map[string]interface{}
	if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if res["token"] != "mock-jwt-token" {
		t.Errorf("expected token mock-jwt-token, got %v", res["token"])
	}
}

func TestAuthHandler_SuperAdminTenants(t *testing.T) {
	usecase := &mockAuthUsecase{}
	handler := deliveryHttp.NewAuthHandler(usecase)

	// Create Tenant
	body, _ := json.Marshal(map[string]string{
		"name": "RT 01 Tenant",
		"slug": "rt-01",
	})
	req := httptest.NewRequest("POST", "/api/v1/superadmin/tenants", bytes.NewBuffer(body))
	rec := httptest.NewRecorder()

	handler.SuperAdminTenants(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", rec.Code)
	}

	// List Tenants
	reqList := httptest.NewRequest("GET", "/api/v1/superadmin/tenants", nil)
	recList := httptest.NewRecorder()

	handler.SuperAdminTenants(recList, reqList)

	if recList.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recList.Code)
	}
}
