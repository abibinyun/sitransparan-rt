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
func (m *mockAuthUsecase) GetTenantByDomain(ctx context.Context, domainName string) (*domain.Tenant, error) {
	for _, t := range m.tenants {
		if t.Domain != nil && *t.Domain == domainName {
			return t, nil
		}
	}
	return nil, nil
}
func (m *mockAuthUsecase) UpdateTenant(ctx context.Context, id uuid.UUID, name, slug string, domainName, logoURL *string, status string) (*domain.Tenant, error) {
	return &domain.Tenant{ID: id, Name: name, Slug: slug, Status: status}, nil
}
func (m *mockAuthUsecase) DeleteTenant(ctx context.Context, id uuid.UUID) error {
	return nil
}
func (m *mockAuthUsecase) ListTenants(ctx context.Context, limit, offset int) ([]*domain.Tenant, int64, error) {
	return m.tenants, int64(len(m.tenants)), nil
}

func TestAuthHandler_ResolveHost(t *testing.T) {
	activeTenant := &domain.Tenant{
		ID:     uuid.New(),
		Name:   "RT 01",
		Slug:   "rt01",
		Status: "active",
	}
	customTenant := &domain.Tenant{
		ID:     uuid.New(),
		Name:   "Perumahan Indah",
		Slug:   "perum-indah",
		Domain: func() *string { s := "rt01.perumahan.com"; return &s }(),
		Status: "active",
	}
	defaultTenant := &domain.Tenant{
		ID:     uuid.New(),
		Name:   "SiTransparan RT",
		Slug:   "sitransparan-rt",
		Status: "active",
	}

	usecase := &mockAuthUsecase{
		tenants: []*domain.Tenant{activeTenant, customTenant, defaultTenant},
	}
	handler := deliveryHttp.NewAuthHandler(usecase, "openrt.local")

	tests := []struct {
		name       string
		hostParam  string
		reqHost    string
		wantStatus int
		wantSlug   string
	}{
		{
			name:       "Subdomain of baseDomain",
			hostParam:  "rt01.openrt.local",
			wantStatus: http.StatusOK,
			wantSlug:   "rt01",
		},
		{
			name:       "Custom registered domain",
			hostParam:  "rt01.perumahan.com",
			wantStatus: http.StatusOK,
			wantSlug:   "perum-indah",
		},
		{
			name:       "Platform host (localhost) fallback",
			hostParam:  "localhost",
			wantStatus: http.StatusOK,
			wantSlug:   "sitransparan-rt",
		},
		{
			name:       "Unknown custom domain",
			hostParam:  "unknown-domain.com",
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			url := "/api/v1/t/resolve"
			if tt.hostParam != "" {
				url += "?host=" + tt.hostParam
			}
			req := httptest.NewRequest(http.MethodGet, url, nil)
			if tt.reqHost != "" {
				req.Host = tt.reqHost
			}
			rec := httptest.NewRecorder()
			handler.ResolveHost(rec, req)

			if rec.Code != tt.wantStatus {
				t.Fatalf("expected status %d, got %d", tt.wantStatus, rec.Code)
			}
			if tt.wantStatus == http.StatusOK {
				var res map[string]string
				if err := json.NewDecoder(rec.Body).Decode(&res); err != nil {
					t.Fatalf("failed to decode response: %v", err)
				}
				if res["slug"] != tt.wantSlug {
					t.Fatalf("expected slug %s, got %s", tt.wantSlug, res["slug"])
				}
			}
		})
	}
}

func TestAuthHandler_Login(t *testing.T) {
	user := &domain.User{ID: uuid.New(), Email: "test@example.com", Name: "Test User"}
	usecase := &mockAuthUsecase{user: user, token: "mock-jwt-token"}
	handler := deliveryHttp.NewAuthHandler(usecase, "openrt.local")

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
	handler := deliveryHttp.NewAuthHandler(usecase, "openrt.local")

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
