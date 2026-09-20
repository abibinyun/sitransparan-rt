package http

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"
	"github.com/google/uuid"
)

type FinancialHandler struct {
	usecase    domain.FinancialUsecase
	tenantRepo domain.TenantRepository
	baseDomain string
}

func NewFinancialHandler(usecase domain.FinancialUsecase, tenantRepo domain.TenantRepository, baseDomain string) *FinancialHandler {
	return &FinancialHandler{usecase: usecase, tenantRepo: tenantRepo, baseDomain: baseDomain}
}

func (h *FinancialHandler) RegisterRoutes(mux *http.ServeMux, tenantMw func(http.Handler) http.Handler, authMw func(http.Handler) http.Handler) {
	// Public tenant route: /api/v1/t/{slug}/financial-summary — aggregate-only
	// transparency data for the anonymous public portal (no payer rows).
	mux.HandleFunc("GET /api/v1/t/{slug}/financial-summary", h.handlePublicTenantSummary)
	mux.HandleFunc("GET /api/v1/t/{slug}/financial/categories", h.handlePublicTenantCategories)
	mux.HandleFunc("GET /api/v1/t/{slug}/financial/transactions", h.handlePublicTenantTransactions)

	fundsHandler := authMw(tenantMw(http.HandlerFunc(h.handleFunds)))
	categoriesHandler := authMw(tenantMw(http.HandlerFunc(h.handleCategories)))
	duesHandler := authMw(tenantMw(http.HandlerFunc(h.handleDues)))
	transactionsHandler := authMw(tenantMw(http.HandlerFunc(h.handleTransactions)))
	uploadHandler := authMw(tenantMw(http.HandlerFunc(h.handleUpload)))

	mux.Handle("/api/v1/financial/funds", fundsHandler)
	mux.Handle("/api/v1/financial/funds/", fundsHandler)

	mux.Handle("/api/v1/financial/categories", categoriesHandler)
	mux.Handle("/api/v1/financial/categories/", categoriesHandler)

	mux.Handle("/api/v1/financial/summary", authMw(tenantMw(http.HandlerFunc(h.handleSummary))))
	mux.Handle("POST /api/v1/financial/reset-data", authMw(tenantMw(http.HandlerFunc(h.handleResetFinancialData))))

	mux.Handle("/api/v1/financial/dues", duesHandler)
	mux.Handle("/api/v1/financial/dues/", duesHandler)

	mux.Handle("/api/v1/financial/transactions", transactionsHandler)
	mux.Handle("/api/v1/financial/transactions/", transactionsHandler)

	mux.Handle("/api/v1/financial/upload", uploadHandler)
}

// /api/v1/financial/funds
func (h *FinancialHandler) handleFunds(w http.ResponseWriter, r *http.Request) {
	tenant := middleware.GetTenantFromContext(r.Context())
	if tenant == nil {
		http.Error(w, `{"error":"tenant context missing"}`, http.StatusBadRequest)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/financial/funds")
	path = strings.TrimPrefix(path, "/")

	if path == "" {
		switch r.Method {
		case http.MethodGet:
			h.listFunds(w, r, tenant.ID)
		case http.MethodPost:
			h.createFund(w, r, tenant.ID)
		default:
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
		return
	}

	id, err := uuid.Parse(path)
	if err != nil {
		http.Error(w, `{"error":"invalid fund id"}`, http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.getFundByID(w, r, tenant.ID, id)
	case http.MethodPut:
		h.updateFund(w, r, tenant.ID, id)
	case http.MethodDelete:
		h.deleteFund(w, r, tenant.ID, id)
	default:
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
	}
}

func (h *FinancialHandler) listFunds(w http.ResponseWriter, r *http.Request, tenantID uuid.UUID) {
	funds, err := h.usecase.ListFunds(r.Context(), tenantID)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}
	if funds == nil {
		funds = []*domain.Fund{}
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"data": funds,
	})
}

func (h *FinancialHandler) createFund(w http.ResponseWriter, r *http.Request, tenantID uuid.UUID) {
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
		return
	}
	var fund domain.Fund
	if err := json.NewDecoder(r.Body).Decode(&fund); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}
	if err := h.usecase.CreateFund(r.Context(), tenantID, &fund); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(fund)
}

func (h *FinancialHandler) getFundByID(w http.ResponseWriter, r *http.Request, tenantID, id uuid.UUID) {
	fund, err := h.usecase.GetFundByID(r.Context(), tenantID, id)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(fund)
}

func (h *FinancialHandler) updateFund(w http.ResponseWriter, r *http.Request, tenantID, id uuid.UUID) {
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
		return
	}
	var fund domain.Fund
	if err := json.NewDecoder(r.Body).Decode(&fund); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}
	fund.ID = id
	if err := h.usecase.UpdateFund(r.Context(), tenantID, &fund); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(fund)
}

func (h *FinancialHandler) deleteFund(w http.ResponseWriter, r *http.Request, tenantID, id uuid.UUID) {
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
		return
	}
	if err := h.usecase.DeleteFund(r.Context(), tenantID, id); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"message": "deleted"})
}

// /api/v1/financial/categories
func (h *FinancialHandler) handleCategories(w http.ResponseWriter, r *http.Request) {
	tenant := middleware.GetTenantFromContext(r.Context())
	if tenant == nil {
		http.Error(w, `{"error":"tenant context missing"}`, http.StatusBadRequest)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/financial/categories")
	path = strings.TrimPrefix(path, "/")

	if path == "" {
		switch r.Method {
		case http.MethodGet:
			h.listCategories(w, r, tenant.ID)
		case http.MethodPost:
			h.createCategory(w, r, tenant.ID)
		default:
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
		return
	}

	id, err := uuid.Parse(path)
	if err != nil {
		http.Error(w, `{"error":"invalid category id"}`, http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.getCategoryByID(w, r, tenant.ID, id)
	case http.MethodPut:
		h.updateCategory(w, r, tenant.ID, id)
	case http.MethodDelete:
		h.deleteCategory(w, r, tenant.ID, id)
	default:
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
	}
}

func (h *FinancialHandler) listCategories(w http.ResponseWriter, r *http.Request, tenantID uuid.UUID) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	if limit <= 0 {
		limit = 10
	}

	cats, total, err := h.usecase.ListFeeCategories(r.Context(), tenantID, limit, offset)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	if cats == nil {
		cats = []*domain.FeeCategory{}
	}

	resp := map[string]interface{}{
		"data":   cats,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}

func (h *FinancialHandler) createCategory(w http.ResponseWriter, r *http.Request, tenantID uuid.UUID) {
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
		return
	}
	var cat domain.FeeCategory
	if err := json.NewDecoder(r.Body).Decode(&cat); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}

	if err := h.usecase.CreateFeeCategory(r.Context(), tenantID, &cat); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(cat)
}

func (h *FinancialHandler) getCategoryByID(w http.ResponseWriter, r *http.Request, tenantID, id uuid.UUID) {
	cat, err := h.usecase.GetFeeCategoryByID(r.Context(), tenantID, id)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(cat)
}

func (h *FinancialHandler) updateCategory(w http.ResponseWriter, r *http.Request, tenantID, id uuid.UUID) {
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
		return
	}
	var cat domain.FeeCategory
	if err := json.NewDecoder(r.Body).Decode(&cat); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}

	cat.ID = id
	if err := h.usecase.UpdateFeeCategory(r.Context(), tenantID, &cat); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(cat)
}

func (h *FinancialHandler) deleteCategory(w http.ResponseWriter, r *http.Request, tenantID, id uuid.UUID) {
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
		return
	}
	if err := h.usecase.DeleteFeeCategory(r.Context(), tenantID, id); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"message": "deleted"})
}

// /api/v1/financial/dues
func (h *FinancialHandler) handleDues(w http.ResponseWriter, r *http.Request) {
	tenant := middleware.GetTenantFromContext(r.Context())
	if tenant == nil {
		http.Error(w, `{"error":"tenant context missing"}`, http.StatusBadRequest)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/financial/dues")
	path = strings.TrimPrefix(path, "/")

	if path == "" {
		switch r.Method {
		case http.MethodGet:
			h.listDues(w, r, tenant.ID)
		case http.MethodPost:
			h.recordDues(w, r, tenant.ID)
		default:
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
		return
	}

	parts := strings.Split(path, "/")
	id, err := uuid.Parse(parts[0])
	if err != nil {
		http.Error(w, `{"error":"invalid dues id"}`, http.StatusBadRequest)
		return
	}

	if len(parts) == 2 && parts[1] == "verify" && r.Method == http.MethodPost {
		h.verifyDues(w, r, tenant.ID, id)
		return
	}

	http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
}

func (h *FinancialHandler) listDues(w http.ResponseWriter, r *http.Request, tenantID uuid.UUID) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	if limit <= 0 {
		limit = 10
	}

	var resID *uuid.UUID
	if resIDStr := r.URL.Query().Get("resident_id"); resIDStr != "" {
		if parsed, err := uuid.Parse(resIDStr); err == nil {
			resID = &parsed
		}
	}
	status := r.URL.Query().Get("status")
	if status != "pending" && status != "verified" && status != "rejected" {
		status = ""
	}

	dues, total, err := h.usecase.ListDuesPayments(r.Context(), tenantID, resID, status, limit, offset)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	if dues == nil {
		dues = []*domain.DuesPayment{}
	}

	resp := map[string]interface{}{
		"data":   dues,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}

func (h *FinancialHandler) recordDues(w http.ResponseWriter, r *http.Request, tenantID uuid.UUID) {
	// SuperAdmin, AdminRT, atau PIC kategori iuran
	userID := middleware.GetUserIDFromContext(r.Context())
	role := middleware.GetRoleFromContext(r.Context())

	var payment domain.DuesPayment
	if err := json.NewDecoder(r.Body).Decode(&payment); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}

	if role != domain.RoleSuperAdmin && role != domain.RoleAdminRT {
		// Periksa apakah user adalah PIC dari fee_category ini
		cat, err := h.usecase.GetFeeCategoryByID(r.Context(), tenantID, payment.FeeCategoryID)
		if err != nil || cat == nil || cat.PICUserID == nil || *cat.PICUserID != userID {
			http.Error(w, `{"error":"forbidden: hanya PIC pos iuran ini atau Pengurus RT yang berwenang mencatat pembayaran"}`, http.StatusForbidden)
			return
		}
	}

	if err := h.usecase.RecordDuesPayment(r.Context(), tenantID, &payment); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(payment)
}

func (h *FinancialHandler) verifyDues(w http.ResponseWriter, r *http.Request, tenantID, id uuid.UUID) {
	userID := middleware.GetUserIDFromContext(r.Context())
	role := middleware.GetRoleFromContext(r.Context())

	payment, err := h.usecase.GetDuesPaymentByID(r.Context(), tenantID, id)
	if err != nil || payment == nil {
		http.Error(w, `{"error":"pembayaran iuran tidak ditemukan"}`, http.StatusNotFound)
		return
	}

	if role != domain.RoleSuperAdmin && role != domain.RoleAdminRT {
		// Periksa apakah user adalah PIC dari fee_category ini
		cat, err := h.usecase.GetFeeCategoryByID(r.Context(), tenantID, payment.FeeCategoryID)
		if err != nil || cat == nil || cat.PICUserID == nil || *cat.PICUserID != userID {
			http.Error(w, `{"error":"forbidden: hanya PIC pos iuran ini atau Pengurus RT yang berwenang memverifikasi"}`, http.StatusForbidden)
			return
		}
	}

	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}

	verifiedPayment, err := h.usecase.VerifyDuesPayment(r.Context(), tenantID, id, req.Status, userID)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(verifiedPayment)
}

// /api/v1/financial/transactions
func (h *FinancialHandler) handleTransactions(w http.ResponseWriter, r *http.Request) {
	tenant := middleware.GetTenantFromContext(r.Context())
	if tenant == nil {
		http.Error(w, `{"error":"tenant context missing"}`, http.StatusBadRequest)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/financial/transactions")
	path = strings.TrimPrefix(path, "/")

	if path == "" {
		switch r.Method {
		case http.MethodGet:
			h.listTransactions(w, r, tenant.ID)
		case http.MethodPost:
			h.createTransaction(w, r, tenant.ID)
		default:
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
		return
	}

	id, err := uuid.Parse(path)
	if err != nil {
		http.Error(w, `{"error":"invalid transaction id"}`, http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.getTransactionByID(w, r, tenant.ID, id)
	case http.MethodPut:
		h.updateTransaction(w, r, tenant.ID, id)
	case http.MethodDelete:
		h.deleteTransaction(w, r, tenant.ID, id)
	default:
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
	}
}

func (h *FinancialHandler) listTransactions(w http.ResponseWriter, r *http.Request, tenantID uuid.UUID) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	if limit <= 0 {
		limit = 10
	}
	txType := r.URL.Query().Get("type")

	txs, total, err := h.usecase.ListFinancialTransactions(r.Context(), tenantID, txType, limit, offset)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	if txs == nil {
		txs = []*domain.FinancialTransaction{}
	}

	resp := map[string]interface{}{
		"data":   txs,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}

func (h *FinancialHandler) createTransaction(w http.ResponseWriter, r *http.Request, tenantID uuid.UUID) {
	userID := middleware.GetUserIDFromContext(r.Context())
	role := middleware.GetRoleFromContext(r.Context())

	var tx domain.FinancialTransaction
	if err := json.NewDecoder(r.Body).Decode(&tx); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}

	if role != domain.RoleSuperAdmin && role != domain.RoleAdminRT {
		// Validasi apakah user adalah PIC dari fund yang dituju atau PIC dari fee_category sumber
		isAuthorized := false

		// Cek apakah user adalah PIC dari Fund
		if tx.FundID != nil && *tx.FundID != uuid.Nil {
			fund, err := h.usecase.GetFundByID(r.Context(), tenantID, *tx.FundID)
			if err == nil && fund != nil && fund.PICUserID != nil && *fund.PICUserID == userID {
				isAuthorized = true
			}
		}

		// Cek jika kategori iuran (IURAN_KELUAR atau IURAN_PINDAH_KAS)
		if !isAuthorized && (strings.HasPrefix(tx.Category, "IURAN_KELUAR: ") || strings.HasPrefix(tx.Category, "IURAN_PINDAH_KAS: ")) {
			catName := strings.TrimSpace(strings.TrimPrefix(strings.TrimPrefix(tx.Category, "IURAN_KELUAR: "), "IURAN_PINDAH_KAS: "))
			feeCats, _, catErr := h.usecase.ListFeeCategories(r.Context(), tenantID, 100, 0)
			if catErr == nil {
				for _, fc := range feeCats {
					if fc.Name == catName && fc.PICUserID != nil && *fc.PICUserID == userID {
						isAuthorized = true
						break
					}
				}
			}
		}

		if !isAuthorized {
			http.Error(w, `{"error":"forbidden: hanya PIC pos kas/iuran terkait atau Pengurus RT yang berwenang mencatat transaksi"}`, http.StatusForbidden)
			return
		}
	}

	if err := h.usecase.CreateFinancialTransaction(r.Context(), tenantID, &tx, userID); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(tx)
}

func (h *FinancialHandler) getTransactionByID(w http.ResponseWriter, r *http.Request, tenantID, id uuid.UUID) {
	tx, err := h.usecase.GetFinancialTransactionByID(r.Context(), tenantID, id)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(tx)
}

func (h *FinancialHandler) updateTransaction(w http.ResponseWriter, r *http.Request, tenantID, id uuid.UUID) {
	http.Error(w, `{"error":"financial transactions are append-only; use reverse endpoint"}`, http.StatusMethodNotAllowed)
}

func (h *FinancialHandler) deleteTransaction(w http.ResponseWriter, r *http.Request, tenantID, id uuid.UUID) {
	http.Error(w, `{"error":"financial transactions are append-only; deletion is disabled"}`, http.StatusMethodNotAllowed)
}

// /api/v1/financial/summary
func (h *FinancialHandler) handleSummary(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	tenant := middleware.GetTenantFromContext(r.Context())
	if tenant == nil {
		http.Error(w, `{"error":"tenant context missing"}`, http.StatusBadRequest)
		return
	}

	summary, err := h.usecase.GetFinancialSummary(r.Context(), tenant.ID)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(summary)
}

// POST /api/v1/financial/reset-data
func (h *FinancialHandler) handleResetFinancialData(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	tenant := middleware.GetTenantFromContext(r.Context())
	if tenant == nil {
		http.Error(w, `{"error":"tenant context missing"}`, http.StatusBadRequest)
		return
	}

	err := h.usecase.ResetFinancialData(r.Context(), tenant.ID)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"message": "Data keuangan berhasil direset ke state awal",
	})
}

type publicFundView struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Type      string    `json:"type"`
	IsDefault bool      `json:"is_default"`
	Balance   float64   `json:"balance"`
}

// publicFinancialSummaryView is the anonymous-safe projection of the kas
// summary: aggregates only — never individual payer rows or notes.
type publicFinancialSummaryView struct {
	CurrentBalance    float64                    `json:"current_balance"`
	MonthlyIncome     float64                    `json:"monthly_income"`
	MonthlyExpense    float64                    `json:"monthly_expense"`
	SpendingBreakdown []domain.CategoryBreakdown `json:"spending_breakdown"`
	Funds             []publicFundView           `json:"funds"`
}

// handlePublicTenantSummary serves GET /api/v1/t/{slug}/financial-summary for
// the anonymous transparency portal. Aggregate figures only.
func (h *FinancialHandler) handlePublicTenantSummary(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")

	if hostSlug, matched := middleware.HostnameSlug(r.Host, h.baseDomain); matched && hostSlug != slug {
		http.Error(w, `{"error":"tenant not found"}`, http.StatusNotFound)
		return
	}

	tenant, err := h.tenantRepo.GetBySlug(r.Context(), slug)
	if err != nil || tenant == nil || !tenant.IsActive() {
		http.Error(w, `{"error":"tenant not found"}`, http.StatusNotFound)
		return
	}

	r = r.WithContext(context.WithValue(r.Context(), domain.TenantContextKey, tenant))

	summary, err := h.usecase.GetFinancialSummary(r.Context(), tenant.ID)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	breakdown := summary.SpendingBreakdown
	if breakdown == nil {
		breakdown = []domain.CategoryBreakdown{}
	}

	publicFunds := make([]publicFundView, 0, len(summary.Funds))
	for _, f := range summary.Funds {
		publicFunds = append(publicFunds, publicFundView{
			ID:        f.ID,
			Name:      f.Name,
			Type:      f.Type,
			IsDefault: f.IsDefault,
			Balance:   f.Balance,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(publicFinancialSummaryView{
		CurrentBalance:    summary.CurrentBalance,
		MonthlyIncome:     summary.MonthlyIncome,
		MonthlyExpense:    summary.MonthlyExpense,
		SpendingBreakdown: breakdown,
		Funds:             publicFunds,
	})
}

type publicCategoryView struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Amount      float64   `json:"amount"`
	Period      string    `json:"period"`
	Description *string   `json:"description,omitempty"`
	Collected   float64   `json:"collected"`
	Spent       float64   `json:"spent"`
	Balance     float64   `json:"balance"`
}

// handlePublicTenantCategories serves GET /api/v1/t/{slug}/financial/categories
// for public transparency: lists active fee categories with aggregated collected,
// spent, and net balance (without exposing any resident identity).
func (h *FinancialHandler) handlePublicTenantCategories(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")

	if hostSlug, matched := middleware.HostnameSlug(r.Host, h.baseDomain); matched && hostSlug != slug {
		http.Error(w, `{"error":"tenant not found"}`, http.StatusNotFound)
		return
	}

	tenant, err := h.tenantRepo.GetBySlug(r.Context(), slug)
	if err != nil || tenant == nil || !tenant.IsActive() {
		http.Error(w, `{"error":"tenant not found"}`, http.StatusNotFound)
		return
	}

	r = r.WithContext(context.WithValue(r.Context(), domain.TenantContextKey, tenant))

	cats, _, err := h.usecase.ListFeeCategories(r.Context(), tenant.ID, 100, 0)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	dues, _, _ := h.usecase.ListDuesPayments(r.Context(), tenant.ID, nil, "verified", 5000, 0)
	txs, _, _ := h.usecase.ListFinancialTransactions(r.Context(), tenant.ID, "", 5000, 0)

	res := make([]publicCategoryView, 0, len(cats))
	for _, c := range cats {
		var collected, spent float64
		for _, d := range dues {
			if d.FeeCategoryID == c.ID {
				collected += d.Amount
			}
		}
		keluarPrefix := "IURAN_KELUAR: " + c.Name
		transferPrefix := "IURAN_PINDAH_KAS: " + c.Name
		for _, tx := range txs {
			if (tx.Type == "expense" && (tx.Category == keluarPrefix || tx.Category == c.Name || tx.Category == "IURAN: "+c.Name)) ||
				(tx.Type == "income" && tx.Category == transferPrefix) {
				spent += tx.Amount
			}
		}
		res = append(res, publicCategoryView{
			ID:          c.ID,
			Name:        c.Name,
			Amount:      c.Amount,
			Period:      c.Period,
			Description: c.Description,
			Collected:   collected,
			Spent:       spent,
			Balance:     collected - spent,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"data": res,
	})
}

type publicTransactionView struct {
	ID              uuid.UUID  `json:"id"`
	FundID          *uuid.UUID `json:"fund_id,omitempty"`
	FundName        *string    `json:"fund_name,omitempty"`
	Type            string     `json:"type"`
	Category        string     `json:"category"`
	Amount          float64    `json:"amount"`
	TransactionDate time.Time  `json:"transaction_date"`
	Description     *string    `json:"description,omitempty"`
}

// handlePublicTenantTransactions serves GET /api/v1/t/{slug}/financial/transactions
// for public transparency: lists transparent ledger transactions filtered by fund_id
// or category name, omitting sensitive proof URLs and user identity.
func (h *FinancialHandler) handlePublicTenantTransactions(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")

	if hostSlug, matched := middleware.HostnameSlug(r.Host, h.baseDomain); matched && hostSlug != slug {
		http.Error(w, `{"error":"tenant not found"}`, http.StatusNotFound)
		return
	}

	tenant, err := h.tenantRepo.GetBySlug(r.Context(), slug)
	if err != nil || tenant == nil || !tenant.IsActive() {
		http.Error(w, `{"error":"tenant not found"}`, http.StatusNotFound)
		return
	}

	r = r.WithContext(context.WithValue(r.Context(), domain.TenantContextKey, tenant))

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 || limit > 100 {
		limit = 10
	}
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page <= 0 {
		page = 1
	}

	fundIDStr := r.URL.Query().Get("fund_id")
	categoryQuery := strings.TrimSpace(r.URL.Query().Get("category"))
	typeQuery := strings.TrimSpace(r.URL.Query().Get("type")) // "income", "expense", or empty
	searchQuery := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("search")))
	monthQuery, _ := strconv.Atoi(r.URL.Query().Get("month"))
	yearQuery, _ := strconv.Atoi(r.URL.Query().Get("year"))

	txs, _, err := h.usecase.ListFinancialTransactions(r.Context(), tenant.ID, "", 2000, 0)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	var targetFundID *uuid.UUID
	if fundIDStr != "" {
		if parsed, pErr := uuid.Parse(fundIDStr); pErr == nil {
			targetFundID = &parsed
		}
	}

	filtered := make([]publicTransactionView, 0, len(txs))
	for _, t := range txs {
		if targetFundID != nil && (t.FundID == nil || *t.FundID != *targetFundID) {
			continue
		}
		if categoryQuery != "" {
			keluarPrefix := "IURAN_KELUAR: " + categoryQuery
			transferPrefix := "IURAN_PINDAH_KAS: " + categoryQuery
			if t.Category != categoryQuery && t.Category != keluarPrefix && t.Category != transferPrefix && t.Category != ("IURAN: "+categoryQuery) {
				continue
			}
		}
		if typeQuery != "" && string(t.Type) != typeQuery {
			continue
		}
		if monthQuery >= 1 && monthQuery <= 12 && int(t.TransactionDate.Month()) != monthQuery {
			continue
		}
		if yearQuery > 2000 && t.TransactionDate.Year() != yearQuery {
			continue
		}
		if searchQuery != "" {
			desc := ""
			if t.Description != nil {
				desc = strings.ToLower(*t.Description)
			}
			cat := strings.ToLower(t.Category)
			if !strings.Contains(desc, searchQuery) && !strings.Contains(cat, searchQuery) {
				continue
			}
		}

		filtered = append(filtered, publicTransactionView{
			ID:              t.ID,
			FundID:          t.FundID,
			FundName:        t.FundName,
			Type:            t.Type,
			Category:        t.Category,
			Amount:          t.Amount,
			TransactionDate: t.TransactionDate,
			Description:     t.Description,
		})
	}

	total := len(filtered)
	start := (page - 1) * limit
	if start > total {
		start = total
	}
	end := start + limit
	if end > total {
		end = total
	}
	paged := filtered[start:end]

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"data":  paged,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// /api/v1/financial/upload
func (h *FinancialHandler) handleUpload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	limitUploadBody(r)
	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, `{"error":"file is required atau melebihi 5 MB"}`, http.StatusBadRequest)
		return
	}
	defer file.Close()

	contentType := header.Header.Get("Content-Type")
	if msg := validateUploadFile(header.Filename, contentType, header.Size); msg != "" {
		http.Error(w, `{"error":"`+msg+`"}`, http.StatusBadRequest)
		return
	}
	proofURL, err := h.usecase.UploadProof(r.Context(), header.Filename, file, contentType)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	resp := map[string]string{
		"proof_url": proofURL,
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}
