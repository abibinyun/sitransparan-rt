package http

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"
)

type InventoryHandler struct {
	inventoryUsecase domain.InventoryUsecase
}

func NewInventoryHandler(inventoryUsecase domain.InventoryUsecase) *InventoryHandler {
	return &InventoryHandler{inventoryUsecase: inventoryUsecase}
}

func (h *InventoryHandler) RegisterRoutes(mux *http.ServeMux, tenantMw func(http.Handler) http.Handler, authMw func(http.Handler) http.Handler) {
	// Warga / resident can view items and list of borrowings, but only admin can create/update/delete
	mux.Handle("GET /api/v1/inventory/items", authMw(tenantMw(http.HandlerFunc(h.ListItems))))
	mux.Handle("GET /api/v1/inventory/items/{id}", authMw(tenantMw(http.HandlerFunc(h.GetItem))))
	mux.Handle("POST /api/v1/inventory/items", authMw(tenantMw(http.HandlerFunc(h.CreateItem))))
	mux.Handle("PUT /api/v1/inventory/items/{id}", authMw(tenantMw(http.HandlerFunc(h.UpdateItem))))
	mux.Handle("DELETE /api/v1/inventory/items/{id}", authMw(tenantMw(http.HandlerFunc(h.DeleteItem))))

	// Borrowings
	mux.Handle("GET /api/v1/inventory/borrowings", authMw(tenantMw(http.HandlerFunc(h.ListBorrowings))))
	mux.Handle("POST /api/v1/inventory/borrowings", authMw(tenantMw(http.HandlerFunc(h.CreateBorrowing))))
	mux.Handle("PATCH /api/v1/inventory/borrowings/{id}/status", authMw(tenantMw(http.HandlerFunc(h.UpdateBorrowingStatus))))
}

func (h *InventoryHandler) ListItems(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	category := r.URL.Query().Get("category")
	condition := r.URL.Query().Get("condition")
	search := r.URL.Query().Get("search")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	var isBorrowable *bool
	if bStr := r.URL.Query().Get("is_borrowable"); bStr != "" {
		val := bStr == "true" || bStr == "1"
		isBorrowable = &val
	}

	filter := domain.InventoryFilter{
		Category:     category,
		Condition:    condition,
		Search:       search,
		IsBorrowable: isBorrowable,
		Limit:        limit,
		Offset:       offset,
	}

	items, total, err := h.inventoryUsecase.ListItems(ctx, filter)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}
	if items == nil {
		items = []domain.InventoryItem{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data":  items,
		"total": total,
	})
}

func (h *InventoryHandler) GetItem(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	idStr := r.PathValue("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, `{"error":"invalid item id"}`, http.StatusBadRequest)
		return
	}

	item, err := h.inventoryUsecase.GetItemByID(ctx, id)
	if err != nil {
		http.Error(w, `{"error":"item not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data": item,
	})
}

type createItemRequest struct {
	ItemCode      *string  `json:"item_code"`
	Name          string   `json:"name"`
	Category      string   `json:"category"`
	Description   *string  `json:"description"`
	Quantity      int      `json:"quantity"`
	Unit          string   `json:"unit"`
	Condition     string   `json:"condition"`
	Location      *string  `json:"location"`
	SourceFund    *string  `json:"source_fund"`
	PurchaseDate  *string  `json:"purchase_date"`
	PurchasePrice *float64 `json:"purchase_price"`
	PhotoURL      *string  `json:"photo_url"`
	IsBorrowable  bool     `json:"is_borrowable"`
	Notes         *string  `json:"notes"`
}

func (h *InventoryHandler) CreateItem(w http.ResponseWriter, r *http.Request) {
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		http.Error(w, `{"error":"forbidden: admin access required"}`, http.StatusForbidden)
		return
	}
	ctx := r.Context()
	var req createItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	item := &domain.InventoryItem{
		ItemCode:     req.ItemCode,
		Name:         strings.TrimSpace(req.Name),
		Category:     strings.TrimSpace(req.Category),
		Description:  req.Description,
		Quantity:     req.Quantity,
		Unit:         strings.TrimSpace(req.Unit),
		Condition:    strings.TrimSpace(req.Condition),
		Location:     req.Location,
		SourceFund:   req.SourceFund,
		PhotoURL:     req.PhotoURL,
		IsBorrowable: req.IsBorrowable,
		Notes:        req.Notes,
	}

	if req.PurchasePrice != nil {
		item.PurchasePrice = *req.PurchasePrice
	}

	if req.PurchaseDate != nil && *req.PurchaseDate != "" {
		t, err := time.Parse("2006-01-02", *req.PurchaseDate)
		if err == nil {
			item.PurchaseDate = &t
		}
	}

	if uid := middleware.GetUserIDFromContext(ctx); uid != uuid.Nil {
		item.CreatedBy = &uid
	}

	if err := h.inventoryUsecase.CreateItem(ctx, item); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data":    item,
		"message": "Barang inventaris berhasil ditambahkan",
	})
}

func (h *InventoryHandler) UpdateItem(w http.ResponseWriter, r *http.Request) {
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		http.Error(w, `{"error":"forbidden: admin access required"}`, http.StatusForbidden)
		return
	}
	ctx := r.Context()
	idStr := r.PathValue("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, `{"error":"invalid item id"}`, http.StatusBadRequest)
		return
	}

	var req createItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	item := &domain.InventoryItem{
		ID:           id,
		ItemCode:     req.ItemCode,
		Name:         strings.TrimSpace(req.Name),
		Category:     strings.TrimSpace(req.Category),
		Description:  req.Description,
		Quantity:     req.Quantity,
		Unit:         strings.TrimSpace(req.Unit),
		Condition:    strings.TrimSpace(req.Condition),
		Location:     req.Location,
		SourceFund:   req.SourceFund,
		PhotoURL:     req.PhotoURL,
		IsBorrowable: req.IsBorrowable,
		Notes:        req.Notes,
	}

	if req.PurchasePrice != nil {
		item.PurchasePrice = *req.PurchasePrice
	}

	if req.PurchaseDate != nil && *req.PurchaseDate != "" {
		t, err := time.Parse("2006-01-02", *req.PurchaseDate)
		if err == nil {
			item.PurchaseDate = &t
		}
	}

	if err := h.inventoryUsecase.UpdateItem(ctx, item); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data":    item,
		"message": "Barang inventaris berhasil diperbarui",
	})
}

func (h *InventoryHandler) DeleteItem(w http.ResponseWriter, r *http.Request) {
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		http.Error(w, `{"error":"forbidden: admin access required"}`, http.StatusForbidden)
		return
	}
	ctx := r.Context()
	idStr := r.PathValue("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, `{"error":"invalid item id"}`, http.StatusBadRequest)
		return
	}

	if err := h.inventoryUsecase.DeleteItem(ctx, id); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Barang inventaris berhasil dihapus",
	})
}

type createBorrowingRequest struct {
	ItemID             uuid.UUID  `json:"item_id"`
	BorrowerName       string     `json:"borrower_name"`
	BorrowerPhone      *string    `json:"borrower_phone"`
	BorrowerResidentID *uuid.UUID `json:"borrower_resident_id"`
	BorrowerHouseID    *uuid.UUID `json:"borrower_house_id"`
	Quantity           int        `json:"quantity"`
	Purpose            *string    `json:"purpose"`
	BorrowDate         *string    `json:"borrow_date"`
	ExpectedReturnDate *string    `json:"expected_return_date"`
	ConditionBefore    *string    `json:"condition_before"`
	AdminNotes         *string    `json:"admin_notes"`
	Status             string     `json:"status"`
}

func (h *InventoryHandler) CreateBorrowing(w http.ResponseWriter, r *http.Request) {
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		http.Error(w, `{"error":"forbidden: admin access required"}`, http.StatusForbidden)
		return
	}
	ctx := r.Context()
	var req createBorrowingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	b := &domain.InventoryBorrowing{
		ItemID:             req.ItemID,
		BorrowerName:       strings.TrimSpace(req.BorrowerName),
		BorrowerPhone:      req.BorrowerPhone,
		BorrowerResidentID: req.BorrowerResidentID,
		BorrowerHouseID:    req.BorrowerHouseID,
		Quantity:           req.Quantity,
		Purpose:            req.Purpose,
		ConditionBefore:    req.ConditionBefore,
		AdminNotes:         req.AdminNotes,
		Status:             req.Status,
	}

	b.BorrowDate = time.Now()
	if req.BorrowDate != nil && *req.BorrowDate != "" {
		if t, err := time.Parse("2006-01-02", *req.BorrowDate); err == nil {
			b.BorrowDate = t
		}
	}

	if req.ExpectedReturnDate != nil && *req.ExpectedReturnDate != "" {
		if t, err := time.Parse("2006-01-02", *req.ExpectedReturnDate); err == nil {
			b.ExpectedReturnDate = &t
		}
	}

	if uid := middleware.GetUserIDFromContext(ctx); uid != uuid.Nil {
		b.ApprovedBy = &uid
	}

	if err := h.inventoryUsecase.CreateBorrowing(ctx, b); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data":    b,
		"message": "Peminjaman barang berhasil dicatat",
	})
}

func (h *InventoryHandler) ListBorrowings(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	status := r.URL.Query().Get("status")
	search := r.URL.Query().Get("search")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	var itemID *uuid.UUID
	if idStr := r.URL.Query().Get("item_id"); idStr != "" {
		if id, err := uuid.Parse(idStr); err == nil {
			itemID = &id
		}
	}

	filter := domain.BorrowingFilter{
		ItemID: itemID,
		Status: status,
		Search: search,
		Limit:  limit,
		Offset: offset,
	}

	list, total, err := h.inventoryUsecase.ListBorrowings(ctx, filter)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}
	if list == nil {
		list = []domain.InventoryBorrowing{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data":  list,
		"total": total,
	})
}

type updateBorrowingStatusRequest struct {
	Status         string  `json:"status"` // returned, rejected, borrowed, approved, overdue
	ConditionAfter *string `json:"condition_after"`
	AdminNotes     *string `json:"admin_notes"`
}

func (h *InventoryHandler) UpdateBorrowingStatus(w http.ResponseWriter, r *http.Request) {
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		http.Error(w, `{"error":"forbidden: admin access required"}`, http.StatusForbidden)
		return
	}
	ctx := r.Context()
	idStr := r.PathValue("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, `{"error":"invalid borrowing id"}`, http.StatusBadRequest)
		return
	}

	var req updateBorrowingStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	var approverID *uuid.UUID
	if uid := middleware.GetUserIDFromContext(ctx); uid != uuid.Nil {
		approverID = &uid
	}

	if err := h.inventoryUsecase.UpdateBorrowingStatus(ctx, id, req.Status, req.ConditionAfter, req.AdminNotes, approverID); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Status peminjaman berhasil diperbarui",
	})
}
