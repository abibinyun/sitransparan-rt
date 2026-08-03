package http

import (
	"encoding/json"
	"net/http"
	"time"

	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"
	"github.com/google/uuid"
)

type DashboardHandler struct {
	usecase domain.DashboardUsecase
}

func NewDashboardHandler(usecase domain.DashboardUsecase) *DashboardHandler {
	return &DashboardHandler{usecase: usecase}
}

func (h *DashboardHandler) RegisterRoutes(mux *http.ServeMux, tenantMw func(http.Handler) http.Handler, authMw func(http.Handler) http.Handler) {
	summaryHandler := http.HandlerFunc(h.GetSummary)
	exportReportHandler := http.HandlerFunc(h.ExportFinancialReport)

	mux.Handle("GET /api/v1/dashboard/summary", tenantMw(authMw(summaryHandler)))
	mux.Handle("GET /api/v1/dashboard/reports/financial/export", tenantMw(authMw(exportReportHandler)))
}

func (h *DashboardHandler) getTenantID(r *http.Request) uuid.UUID {
	if tenant := middleware.GetTenantFromContext(r.Context()); tenant != nil {
		return tenant.ID
	}
	return middleware.GetTenantIDFromClaims(r.Context())
}

func (h *DashboardHandler) GetSummary(w http.ResponseWriter, r *http.Request) {
	tenantID := h.getTenantID(r)
	if tenantID == uuid.Nil {
		http.Error(w, `{"error":"tenant context missing"}`, http.StatusBadRequest)
		return
	}

	summary, err := h.usecase.GetSummary(r.Context(), tenantID)
	if err != nil {
		http.Error(w, `{"error":"failed to fetch dashboard summary"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summary)
}

func (h *DashboardHandler) ExportFinancialReport(w http.ResponseWriter, r *http.Request) {
	tenantID := h.getTenantID(r)
	if tenantID == uuid.Nil {
		http.Error(w, `{"error":"tenant context missing"}`, http.StatusBadRequest)
		return
	}

	q := r.URL.Query()
	format := q.Get("format")
	if format == "" {
		format = "csv"
	}

	filter := domain.FinancialReportFilter{
		Format: format,
	}

	if startStr := q.Get("start_date"); startStr != "" {
		if t, err := time.Parse("2006-01-02", startStr); err == nil {
			filter.StartDate = &t
		}
	}
	if endStr := q.Get("end_date"); endStr != "" {
		if t, err := time.Parse("2006-01-02", endStr); err == nil {
			filter.EndDate = &t
		}
	}

	data, contentType, filename, err := h.usecase.ExportFinancialReport(r.Context(), tenantID, filter)
	if err != nil {
		http.Error(w, `{"error":"failed to export financial report"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Disposition", "attachment; filename="+filename)
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}
