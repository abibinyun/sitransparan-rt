package http_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	delivery "backend/internal/delivery/http"
	"backend/internal/domain"
	"backend/internal/usecase"
	"github.com/google/uuid"
)

type mockUserUsecase struct {
	users map[uuid.UUID]*domain.UserWithRole
}

func newMockUserUsecase() *mockUserUsecase {
	return &mockUserUsecase{
		users: make(map[uuid.UUID]*domain.UserWithRole),
	}
}

func (m *mockUserUsecase) CreateUser(ctx context.Context, p usecase.CreateUserParam) (*domain.UserWithRole, error) {
	u := &domain.UserWithRole{
		User: domain.User{
			ID:    uuid.New(),
			Name:  p.Name,
			Email: p.Email,
			Phone: p.Phone,
		},
		RoleName: p.Role,
		TenantID: &p.TenantID,
	}
	m.users[u.ID] = u
	return u, nil
}

func (m *mockUserUsecase) GetUserByID(ctx context.Context, tenantID, userID uuid.UUID) (*domain.UserWithRole, error) {
	u, ok := m.users[userID]
	if !ok {
		return nil, usecase.ErrUserNotFound
	}
	return u, nil
}

func (m *mockUserUsecase) UpdateUser(ctx context.Context, p usecase.UpdateUserParam) (*domain.UserWithRole, error) {
	u, ok := m.users[p.UserID]
	if !ok {
		return nil, usecase.ErrUserNotFound
	}
	u.Name = p.Name
	u.Email = p.Email
	u.Phone = p.Phone
	u.RoleName = p.Role
	return u, nil
}

func (m *mockUserUsecase) DeleteUser(ctx context.Context, tenantID, userID uuid.UUID) error {
	if _, ok := m.users[userID]; !ok {
		return usecase.ErrUserNotFound
	}
	delete(m.users, userID)
	return nil
}

func (m *mockUserUsecase) ListUsers(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.UserWithRole, int64, error) {
	var list []*domain.UserWithRole
	for _, u := range m.users {
		if u.TenantID != nil && *u.TenantID == tenantID {
			list = append(list, u)
		}
	}
	return list, int64(len(list)), nil
}

func (m *mockUserUsecase) ListAllUsers(ctx context.Context, limit, offset int) ([]*domain.UserWithRole, int64, error) {
	var list []*domain.UserWithRole
	for _, u := range m.users {
		list = append(list, u)
	}
	return list, int64(len(list)), nil
}

func TestUserHandler_CRUD(t *testing.T) {
	uc := newMockUserUsecase()
	handler := delivery.NewUserHandler(uc)

	tenantID := uuid.New()
	dummyTenantMw := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := context.WithValue(r.Context(), domain.TenantContextKey, &domain.Tenant{ID: tenantID})
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
	dummyMw := func(next http.Handler) http.Handler { return next }

	mux := http.NewServeMux()
	handler.RegisterRoutes(mux, dummyTenantMw, dummyMw, dummyMw)

	// 1. Create User
	createReqBody, _ := json.Marshal(map[string]string{
		"name":     "Test Warga",
		"email":    "testwarga@example.com",
		"password": "Password123!",
		"role":     "resident",
	})
	req := httptest.NewRequest("POST", "/api/v1/users", bytes.NewBuffer(createReqBody))
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", rec.Code, rec.Body.String())
	}

	var created domain.UserWithRole
	json.NewDecoder(rec.Body).Decode(&created)
	if created.Name != "Test Warga" {
		t.Errorf("expected name 'Test Warga', got '%s'", created.Name)
	}

	// 2. List Users
	req = httptest.NewRequest("GET", "/api/v1/users", nil)
	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	// 3. Delete User
	req = httptest.NewRequest("DELETE", "/api/v1/users/"+created.ID.String(), nil)
	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
}
