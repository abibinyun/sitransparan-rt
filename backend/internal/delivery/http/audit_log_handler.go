package http

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"

	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"
)

type AuditLogHandler struct {
	auditUC domain.AuditLogUsecase
}

func NewAuditLogHandler(auditUC domain.AuditLogUsecase) *AuditLogHandler {
	return &AuditLogHandler{auditUC: auditUC}
}

func (h *AuditLogHandler) List(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	role := middleware.GetRoleFromContext(r.Context())
	isSuper := role == domain.RoleSuperAdmin || string(role) == "super_admin"
	var tenantIDVal uuid.UUID
	if t := middleware.GetTenantFromContext(r.Context()); t != nil {
		tenantIDVal = t.ID
	}
	if tenantIDVal == uuid.Nil {
		tenantIDVal = middleware.GetTenantIDFromClaims(r.Context())
	}

	query := r.URL.Query()
	limit, _ := strconv.Atoi(query.Get("limit"))
	offset, _ := strconv.Atoi(query.Get("offset"))

	filter := domain.AuditLogFilter{
		Action:   query.Get("action"),
		Resource: query.Get("resource"),
		Limit:    limit,
		Offset:   offset,
	}

	// SuperAdmin can filter any tenant or view all; Admin RT is strictly scoped to own tenant
	if isSuper {
		if tStr := query.Get("tenant_id"); tStr != "" {
			if tUUID, err := uuid.Parse(tStr); err == nil {
				filter.TenantID = &tUUID
			}
		}
	} else {
		if tenantIDVal == uuid.Nil {
			http.Error(w, `{"error":"unauthorized tenant scope"}`, http.StatusForbidden)
			return
		}
		filter.TenantID = &tenantIDVal
	}

	if uStr := query.Get("user_id"); uStr != "" {
		if uUUID, err := uuid.Parse(uStr); err == nil {
			filter.UserID = &uUUID
		}
	}

	if startStr := query.Get("start_date"); startStr != "" {
		if t, err := time.Parse(time.RFC3339, startStr); err == nil {
			filter.StartDate = &t
		}
	}
	if endStr := query.Get("end_date"); endStr != "" {
		if t, err := time.Parse(time.RFC3339, endStr); err == nil {
			filter.EndDate = &t
		}
	}

	logs, total, err := h.auditUC.ListLogs(r.Context(), filter)
	if err != nil {
		http.Error(w, `{"error":"failed to fetch audit logs"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"data":  logs,
		"total": total,
		"limit": filter.Limit,
		"offset": filter.Offset,
	})
}

func (h *AuditLogHandler) RegisterRoutes(mux *http.ServeMux, tenantMw, authMw, adminMw func(http.Handler) http.Handler) {
	protected := authMw(adminMw(tenantMw(http.HandlerFunc(h.List))))
	mux.Handle("/api/v1/admin/audit-logs", protected)
}

