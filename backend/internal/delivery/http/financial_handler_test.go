package http_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	delivery "backend/internal/delivery/http"
	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"
	"backend/internal/repository"
	"github.com/google/uuid"
)

type mockFinancialUsecase struct {
	categories   map[uuid.UUID]*domain.FeeCategory
	duesPayments map[uuid.UUID]*domain.DuesPayment
	transactions map[uuid.UUID]*domain.FinancialTransaction
}

func newMockFinancialUsecase() *mockFinancialUsecase {
	return &mockFinancialUsecase{
		categories:   make(map[uuid.UUID]*domain.FeeCategory),
		duesPayments: make(map[uuid.UUID]*domain.DuesPayment),
		transactions: make(map[uuid.UUID]*domain.FinancialTransaction),
	}
}

func (m *mockFinancialUsecase) CreateFeeCategory(ctx context.Context, tenantID uuid.UUID, category *domain.FeeCategory) error {
	category.ID = uuid.New()
	category.TenantID = tenantID
	m.categories[category.ID] = category
	return nil
}

func (m *mockFinancialUsecase) GetFeeCategoryByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.FeeCategory, error) {
	cat, ok := m.categories[id]
	if !ok || cat.TenantID != tenantID {
		return nil, repository.ErrNotFound
	}
	return cat, nil
}

func (m *mockFinancialUsecase) UpdateFeeCategory(ctx context.Context, tenantID uuid.UUID, category *domain.FeeCategory) error {
	cat, ok := m.categories[category.ID]
	if !ok || cat.TenantID != tenantID {
		return repository.ErrNotFound
	}
	category.TenantID = tenantID
	m.categories[category.ID] = category
	return nil
}

func (m *mockFinancialUsecase) DeleteFeeCategory(ctx context.Context, tenantID, id uuid.UUID) error {
	cat, ok := m.categories[id]
	if !ok || cat.TenantID != tenantID {
		return repository.ErrNotFound
	}
	delete(m.categories, id)
	return nil
}

func (m *mockFinancialUsecase) ListFeeCategories(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.FeeCategory, int64, error) {
	var res []*domain.FeeCategory
	for _, c := range m.categories {
		if c.TenantID == tenantID {
			res = append(res, c)
		}
	}
	return res, int64(len(res)), nil
}

func (m *mockFinancialUsecase) RecordDuesPayment(ctx context.Context, tenantID uuid.UUID, payment *domain.DuesPayment) error {
	payment.ID = uuid.New()
	payment.TenantID = tenantID
	payment.Status = "pending"
	m.duesPayments[payment.ID] = payment
	return nil
}

func (m *mockFinancialUsecase) VerifyDuesPayment(ctx context.Context, tenantID, id uuid.UUID, status string, verifierID uuid.UUID) (*domain.DuesPayment, error) {
	p, ok := m.duesPayments[id]
	if !ok || p.TenantID != tenantID {
		return nil, repository.ErrNotFound
	}
	p.Status = status
	p.VerifiedBy = &verifierID
	return p, nil
}

func (m *mockFinancialUsecase) ListDuesPayments(ctx context.Context, tenantID uuid.UUID, residentID *uuid.UUID, limit, offset int) ([]*domain.DuesPayment, int64, error) {
	var res []*domain.DuesPayment
	for _, p := range m.duesPayments {
		if p.TenantID == tenantID {
			if residentID != nil && p.ResidentID != *residentID {
				continue
			}
			res = append(res, p)
		}
	}
	return res, int64(len(res)), nil
}

func (m *mockFinancialUsecase) CreateFinancialTransaction(ctx context.Context, tenantID uuid.UUID, tx *domain.FinancialTransaction, createdBy uuid.UUID) error {
	tx.ID = uuid.New()
	tx.TenantID = tenantID
	tx.CreatedBy = &createdBy
	m.transactions[tx.ID] = tx
	return nil
}

func (m *mockFinancialUsecase) GetFinancialTransactionByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.FinancialTransaction, error) {
	tx, ok := m.transactions[id]
	if !ok || tx.TenantID != tenantID {
		return nil, repository.ErrNotFound
	}
	return tx, nil
}

func (m *mockFinancialUsecase) ReverseFinancialTransaction(ctx context.Context, tenantID, transactionID uuid.UUID, reason string, createdBy uuid.UUID) (*domain.FinancialTransaction, error) {
	orig, ok := m.transactions[transactionID]
	if !ok || orig.TenantID != tenantID {
		return nil, repository.ErrNotFound
	}
	revType := "expense"
	if orig.Type == "expense" {
		revType = "income"
	}
	rev := &domain.FinancialTransaction{
		ID:              uuid.New(),
		TenantID:        tenantID,
		Type:            revType,
		Category:        "reversal",
		Amount:          orig.Amount,
		TransactionDate: time.Now(),
		CreatedBy:       &createdBy,
	}
	m.transactions[rev.ID] = rev
	return rev, nil
}

func (m *mockFinancialUsecase) GetFinancialSummary(ctx context.Context, tenantID uuid.UUID) (*domain.FinancialSummary, error) {
	var income, expense float64
	for _, tx := range m.transactions {
		if tx.TenantID == tenantID {
			if tx.Type == "income" {
				income += tx.Amount
			} else if tx.Type == "expense" {
				expense += tx.Amount
			}
		}
	}
	return &domain.FinancialSummary{
		CurrentBalance: income - expense,
		MonthlyIncome:  income,
		MonthlyExpense: expense,
	}, nil
}

func (m *mockFinancialUsecase) ListFinancialTransactions(ctx context.Context, tenantID uuid.UUID, txType string, limit, offset int) ([]*domain.FinancialTransaction, int64, error) {
	var res []*domain.FinancialTransaction
	for _, t := range m.transactions {
		if t.TenantID == tenantID {
			if txType != "" && t.Type != txType {
				continue
			}
			res = append(res, t)
		}
	}
	return res, int64(len(res)), nil
}

func (m *mockFinancialUsecase) UploadProof(ctx context.Context, filename string, content io.Reader, contentType string) (string, error) {
	return "/uploads/proofs/test_" + filename, nil
}

func mockFinancialAuthMiddleware(tenant *domain.Tenant, userID uuid.UUID) (func(http.Handler) http.Handler, func(http.Handler) http.Handler) {
	tenantMw := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := context.WithValue(r.Context(), middleware.TenantContextKey, tenant)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
	authMw := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := context.WithValue(r.Context(), middleware.UserContextKey, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
	return tenantMw, authMw
}

func TestFinancialHandler(t *testing.T) {
	uc := newMockFinancialUsecase()
	handler := delivery.NewFinancialHandler(uc)

	tenant := &domain.Tenant{ID: uuid.New(), Name: "RT 01"}
	userID := uuid.New()
	tenantMw, authMw := mockFinancialAuthMiddleware(tenant, userID)

	mux := http.NewServeMux()
	handler.RegisterRoutes(mux, tenantMw, authMw)

	// 1. Fee Category Routes
	catBody := []byte(`{"name":"Iuran Sampah","amount":20000,"period":"monthly"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/financial/categories", bytes.NewBuffer(catBody))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Create FeeCategory failed, got status %d: %s", w.Code, w.Body.String())
	}

	var cat domain.FeeCategory
	_ = json.Unmarshal(w.Body.Bytes(), &cat)

	req = httptest.NewRequest(http.MethodGet, "/api/v1/financial/categories", nil)
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("List FeeCategories failed, got status %d", w.Code)
	}

	// 2. Dues Routes
	duesBody, _ := json.Marshal(map[string]interface{}{
		"resident_id":     uuid.New().String(),
		"fee_category_id": cat.ID.String(),
		"amount":          20000,
		"period_month":    8,
		"period_year":     2026,
	})
	req = httptest.NewRequest(http.MethodPost, "/api/v1/financial/dues", bytes.NewBuffer(duesBody))
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("Record Dues failed, got status %d: %s", w.Code, w.Body.String())
	}

	var dues domain.DuesPayment
	_ = json.Unmarshal(w.Body.Bytes(), &dues)

	verifyBody := []byte(`{"status":"verified"}`)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/financial/dues/"+dues.ID.String()+"/verify", bytes.NewBuffer(verifyBody))
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("Verify Dues failed, got status %d: %s", w.Code, w.Body.String())
	}

	// 3. Transactions Routes
	txBody := []byte(`{"type":"expense","category":"Perbaikan Jalan","amount":150000}`)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/financial/transactions", bytes.NewBuffer(txBody))
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("Create Transaction failed, got status %d: %s", w.Code, w.Body.String())
	}

	// 4. Upload Route
	bodyBuf := &bytes.Buffer{}
	writer := multipart.NewWriter(bodyBuf)
	part, _ := writer.CreateFormFile("file", "bukti_transfer.png")
	part.Write([]byte("fake image data"))
	writer.Close()

	req = httptest.NewRequest(http.MethodPost, "/api/v1/financial/upload", bodyBuf)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("Upload proof failed, got status %d: %s", w.Code, w.Body.String())
	}
}
