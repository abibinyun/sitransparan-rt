package http

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"
	"github.com/google/uuid"
)

type FinancialHandler struct {
	usecase domain.FinancialUsecase
}

func NewFinancialHandler(usecase domain.FinancialUsecase) *FinancialHandler {
	return &FinancialHandler{usecase: usecase}
}

func (h *FinancialHandler) RegisterRoutes(mux *http.ServeMux, tenantMw func(http.Handler) http.Handler, authMw func(http.Handler) http.Handler) {
	categoriesHandler := authMw(tenantMw(http.HandlerFunc(h.handleCategories)))
	duesHandler := authMw(tenantMw(http.HandlerFunc(h.handleDues)))
	transactionsHandler := authMw(tenantMw(http.HandlerFunc(h.handleTransactions)))
	uploadHandler := authMw(tenantMw(http.HandlerFunc(h.handleUpload)))

	mux.Handle("/api/v1/financial/categories", categoriesHandler)
	mux.Handle("/api/v1/financial/categories/", categoriesHandler)

	mux.Handle("/api/v1/financial/summary", authMw(tenantMw(http.HandlerFunc(h.handleSummary))))

	mux.Handle("/api/v1/financial/dues", duesHandler)
	mux.Handle("/api/v1/financial/dues/", duesHandler)

	mux.Handle("/api/v1/financial/transactions", transactionsHandler)
	mux.Handle("/api/v1/financial/transactions/", transactionsHandler)

	mux.Handle("/api/v1/financial/upload", uploadHandler)
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

	dues, total, err := h.usecase.ListDuesPayments(r.Context(), tenantID, resID, limit, offset)
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
	var payment domain.DuesPayment
	if err := json.NewDecoder(r.Body).Decode(&payment); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
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
	verifierID := middleware.GetUserIDFromContext(r.Context())
	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
	}

	payment, err := h.usecase.VerifyDuesPayment(r.Context(), tenantID, id, req.Status, verifierID)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(payment)
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
	var tx domain.FinancialTransaction
	if err := json.NewDecoder(r.Body).Decode(&tx); err != nil {
		http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
		return
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

// /api/v1/financial/upload
func (h *FinancialHandler) handleUpload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, `{"error":"file is required"}`, http.StatusBadRequest)
		return
	}
	defer file.Close()

	contentType := header.Header.Get("Content-Type")
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
