package http_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	delivery "backend/internal/delivery/http"
	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"
	"backend/internal/usecase"
	"github.com/google/uuid"
)

type mockResidentUsecase struct {
	residents map[uuid.UUID]*domain.Resident
	members   map[uuid.UUID][]*domain.FamilyMember
}

func newMockResidentUsecase() *mockResidentUsecase {
	return &mockResidentUsecase{
		residents: make(map[uuid.UUID]*domain.Resident),
		members:   make(map[uuid.UUID][]*domain.FamilyMember),
	}
}

func (m *mockResidentUsecase) Create(ctx context.Context, tenantID uuid.UUID, resident *domain.Resident) error {
	resident.ID = uuid.New()
	resident.TenantID = tenantID
	m.residents[resident.ID] = resident
	return nil
}

func (m *mockResidentUsecase) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Resident, error) {
	r, ok := m.residents[id]
	if !ok || r.TenantID != tenantID {
		return nil, usecase.ErrResidentNotFound
	}
	r.FamilyMembers = m.members[id]
	return r, nil
}

func (m *mockResidentUsecase) Update(ctx context.Context, tenantID uuid.UUID, resident *domain.Resident) error {
	r, ok := m.residents[resident.ID]
	if !ok || r.TenantID != tenantID {
		return usecase.ErrResidentNotFound
	}
	resident.TenantID = tenantID
	m.residents[resident.ID] = resident
	return nil
}

func (m *mockResidentUsecase) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	r, ok := m.residents[id]
	if !ok || r.TenantID != tenantID {
		return usecase.ErrResidentNotFound
	}
	delete(m.residents, id)
	return nil
}

func (m *mockResidentUsecase) List(ctx context.Context, tenantID uuid.UUID, query string, limit, offset int) ([]*domain.Resident, int64, error) {
	var list []*domain.Resident
	for _, r := range m.residents {
		if r.TenantID == tenantID {
			list = append(list, r)
		}
	}
	return list, int64(len(list)), nil
}

func (m *mockResidentUsecase) AddFamilyMember(ctx context.Context, tenantID uuid.UUID, member *domain.FamilyMember) error {
	r, ok := m.residents[member.ResidentID]
	if !ok || r.TenantID != tenantID {
		return usecase.ErrResidentNotFound
	}
	member.ID = uuid.New()
	m.members[member.ResidentID] = append(m.members[member.ResidentID], member)
	return nil
}

func (m *mockResidentUsecase) RemoveFamilyMember(ctx context.Context, tenantID, residentID, memberID uuid.UUID) error {
	r, ok := m.residents[residentID]
	if !ok || r.TenantID != tenantID {
		return usecase.ErrResidentNotFound
	}
	list := m.members[residentID]
	var newList []*domain.FamilyMember
	for _, mem := range list {
		if mem.ID != memberID {
			newList = append(newList, mem)
		}
	}
	m.members[residentID] = newList
	return nil
}

func (m *mockResidentUsecase) Approve(ctx context.Context, tenantID, id, adminUserID uuid.UUID) error {
	r, ok := m.residents[id]
	if !ok || r.TenantID != tenantID {
		return usecase.ErrResidentNotFound
	}
	r.Status = "approved"
	return nil
}

func (m *mockResidentUsecase) Reject(ctx context.Context, tenantID, id, adminUserID uuid.UUID) error {
	r, ok := m.residents[id]
	if !ok || r.TenantID != tenantID {
		return usecase.ErrResidentNotFound
	}
	r.Status = "rejected"
	return nil
}

func (m *mockResidentUsecase) UploadDocument(ctx context.Context, docType, filename string, content io.Reader, contentType string) (string, error) {
	return "/uploads/" + docType + "/" + filename, nil
}

func mockTenantAuthMiddleware(tenant *domain.Tenant) (func(http.Handler) http.Handler, func(http.Handler) http.Handler) {
	tenantMw := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := context.WithValue(r.Context(), middleware.TenantContextKey, tenant)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
	authMw := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			next.ServeHTTP(w, r)
		})
	}
	return tenantMw, authMw
}

func TestResidentHandler(t *testing.T) {
	uc := newMockResidentUsecase()
	handler := delivery.NewResidentHandler(uc)

	tenant := &domain.Tenant{ID: uuid.New(), Name: "RT 01"}
	tenantMw, authMw := mockTenantAuthMiddleware(tenant)

	mux := http.NewServeMux()
	handler.RegisterRoutes(mux, tenantMw, authMw)

	// 1. Create Resident
	body := []byte(`{"full_name":"Ahmad"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/residents", bytes.NewBuffer(body))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", w.Code, w.Body.String())
	}

	var created domain.Resident
	if err := json.Unmarshal(w.Body.Bytes(), &created); err != nil {
		t.Fatalf("unmarshal created resident: %v", err)
	}

	// 2. Get Resident by ID
	req = httptest.NewRequest(http.MethodGet, "/api/v1/residents/"+created.ID.String(), nil)
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	// 3. Add Family Member
	fmBody := []byte(`{"full_name":"Siti","relation":"Istri"}`)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/residents/"+created.ID.String()+"/family", bytes.NewBuffer(fmBody))
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", w.Code)
	}

	// 4. List Residents
	req = httptest.NewRequest(http.MethodGet, "/api/v1/residents", nil)
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	// 5. Approve Resident
	req = httptest.NewRequest(http.MethodPost, "/api/v1/residents/"+created.ID.String()+"/approve", nil)
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200 on approve, got %d", w.Code)
	}

	// 6. Reject Resident
	req = httptest.NewRequest(http.MethodPost, "/api/v1/residents/"+created.ID.String()+"/reject", nil)
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200 on reject, got %d", w.Code)
	}

	// 7. Delete Resident
	req = httptest.NewRequest(http.MethodDelete, "/api/v1/residents/"+created.ID.String(), nil)
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}
}
