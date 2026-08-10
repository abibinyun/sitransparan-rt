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

type AnnouncementDocHandler struct {
	usecase    domain.AnnouncementDocUsecase
	tenantRepo domain.TenantRepository
}

func NewAnnouncementDocHandler(usecase domain.AnnouncementDocUsecase, tenantRepo domain.TenantRepository) *AnnouncementDocHandler {
	return &AnnouncementDocHandler{
		usecase:    usecase,
		tenantRepo: tenantRepo,
	}
}

func (h *AnnouncementDocHandler) RegisterRoutes(mux *http.ServeMux, tenantMw func(http.Handler) http.Handler, authMw func(http.Handler) http.Handler) {
	// Public Tenant routes: /api/v1/t/:slug/announcements and /api/v1/t/:slug/documents.
	// Use method-specific wildcard patterns so these routes can coexist with
	// other public tenant resources without colliding on /api/v1/t/.
	mux.HandleFunc("GET /api/v1/t/{slug}/announcements", h.handlePublicTenantRoutes)
	mux.HandleFunc("GET /api/v1/t/{slug}/documents", h.handlePublicTenantRoutes)

	// Private Announcement routes: /api/v1/announcements
	protectedAnnouncements := http.HandlerFunc(h.handlePrivateAnnouncements)
	mux.Handle("/api/v1/announcements", authMw(tenantMw(protectedAnnouncements)))
	mux.Handle("/api/v1/announcements/", authMw(tenantMw(protectedAnnouncements)))

	// Private Document routes: /api/v1/documents
	protectedDocuments := http.HandlerFunc(h.handlePrivateDocuments)
	mux.Handle("/api/v1/documents", authMw(tenantMw(protectedDocuments)))
	mux.Handle("/api/v1/documents/", authMw(tenantMw(protectedDocuments)))
}

func (h *AnnouncementDocHandler) handlePublicTenantRoutes(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/t/")
	parts := strings.Split(path, "/")
	if len(parts) < 2 {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}

	slug := parts[0]
	resource := parts[1]

	tenant, err := h.tenantRepo.GetBySlug(r.Context(), slug)
	if err != nil || tenant == nil {
		http.Error(w, `{"error":"tenant not found"}`, http.StatusNotFound)
		return
	}

	switch resource {
	case "announcements":
		if r.Method == http.MethodGet {
			h.publicListAnnouncements(w, r, tenant.ID)
		} else {
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
	case "documents":
		if r.Method == http.MethodGet {
			h.publicListDocuments(w, r, tenant.ID)
		} else {
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
	default:
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
	}
}

func (h *AnnouncementDocHandler) publicListAnnouncements(w http.ResponseWriter, r *http.Request, tenantID uuid.UUID) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	target := r.URL.Query().Get("target")
	var targetFilter *string
	if target != "" {
		targetFilter = &target
	}

	announcements, total, err := h.usecase.ListAnnouncements(r.Context(), tenantID, targetFilter, limit, offset)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	if announcements == nil {
		announcements = []*domain.Announcement{}
	}

	resp := map[string]interface{}{
		"data":   announcements,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}

func (h *AnnouncementDocHandler) publicListDocuments(w http.ResponseWriter, r *http.Request, tenantID uuid.UUID) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	docs, total, err := h.usecase.ListDocuments(r.Context(), tenantID, limit, offset)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	if docs == nil {
		docs = []*domain.Document{}
	}

	resp := map[string]interface{}{
		"data":   docs,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}

func (h *AnnouncementDocHandler) handlePrivateAnnouncements(w http.ResponseWriter, r *http.Request) {
	tenant := middleware.GetTenantFromContext(r.Context())
	if tenant == nil {
		http.Error(w, `{"error":"tenant context missing"}`, http.StatusBadRequest)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/announcements")
	path = strings.TrimPrefix(path, "/")

	if path == "" {
		switch r.Method {
		case http.MethodGet:
			limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
			offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
			target := r.URL.Query().Get("target")
			var targetFilter *string
			if target != "" {
				targetFilter = &target
			}

			list, total, err := h.usecase.ListAnnouncements(r.Context(), tenant.ID, targetFilter, limit, offset)
			if err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
				return
			}
			if list == nil {
				list = []*domain.Announcement{}
			}
			resp := map[string]interface{}{
				"data":   list,
				"total":  total,
				"limit":  limit,
				"offset": offset,
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(resp)
		case http.MethodPost:
			var req domain.Announcement
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
				return
			}
			userID := middleware.GetUserIDFromContext(r.Context())
			if userID != uuid.Nil {
				req.CreatedBy = &userID
			}
			if err := h.usecase.CreateAnnouncement(r.Context(), tenant.ID, &req); err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			_ = json.NewEncoder(w).Encode(req)
		default:
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
		return
	}

	parts := strings.Split(path, "/")
	id, err := uuid.Parse(parts[0])
	if err != nil {
		http.Error(w, `{"error":"invalid announcement id"}`, http.StatusBadRequest)
		return
	}

	if len(parts) == 1 {
		switch r.Method {
		case http.MethodGet:
			item, err := h.usecase.GetAnnouncement(r.Context(), tenant.ID, id)
			if err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusNotFound)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(item)
		case http.MethodPut:
			var req domain.Announcement
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
				return
			}
			req.ID = id
			if err := h.usecase.UpdateAnnouncement(r.Context(), tenant.ID, &req); err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(req)
		case http.MethodDelete:
			if err := h.usecase.DeleteAnnouncement(r.Context(), tenant.ID, id); err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(map[string]string{"message": "deleted"})
		default:
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
		return
	}

	http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
}

func (h *AnnouncementDocHandler) handlePrivateDocuments(w http.ResponseWriter, r *http.Request) {
	tenant := middleware.GetTenantFromContext(r.Context())
	if tenant == nil {
		http.Error(w, `{"error":"tenant context missing"}`, http.StatusBadRequest)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/documents")
	path = strings.TrimPrefix(path, "/")

	if path == "" {
		switch r.Method {
		case http.MethodGet:
			limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
			offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

			list, total, err := h.usecase.ListDocuments(r.Context(), tenant.ID, limit, offset)
			if err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
				return
			}
			if list == nil {
				list = []*domain.Document{}
			}
			resp := map[string]interface{}{
				"data":   list,
				"total":  total,
				"limit":  limit,
				"offset": offset,
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(resp)
		case http.MethodPost:
			var doc domain.Document
			var filename string
			var contentType string
			var fileReader strings.Reader

			if strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/form-data") {
				if err := r.ParseMultipartForm(10 << 20); err != nil { // 10MB limit
					http.Error(w, `{"error":"failed to parse multipart form"}`, http.StatusBadRequest)
					return
				}
				doc.Title = r.FormValue("title")
				doc.Category = r.FormValue("category")
				file, header, err := r.FormFile("file")
				if err == nil {
					defer file.Close()
					filename = header.Filename
					contentType = header.Header.Get("Content-Type")
					userID := middleware.GetUserIDFromContext(r.Context())
					if userID != uuid.Nil {
						doc.UploadedBy = &userID
					}
					if err := h.usecase.CreateDocument(r.Context(), tenant.ID, &doc, filename, file, contentType); err != nil {
						http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
						return
					}
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusCreated)
					_ = json.NewEncoder(w).Encode(doc)
					return
				}
			}

			// Fallback: JSON body
			if err := json.NewDecoder(r.Body).Decode(&doc); err != nil {
				http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
				return
			}
			userID := middleware.GetUserIDFromContext(r.Context())
			if userID != uuid.Nil {
				doc.UploadedBy = &userID
			}
			if err := h.usecase.CreateDocument(r.Context(), tenant.ID, &doc, "", &fileReader, ""); err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			_ = json.NewEncoder(w).Encode(doc)
		default:
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
		return
	}

	parts := strings.Split(path, "/")
	id, err := uuid.Parse(parts[0])
	if err != nil {
		http.Error(w, `{"error":"invalid document id"}`, http.StatusBadRequest)
		return
	}

	if len(parts) == 1 {
		switch r.Method {
		case http.MethodGet:
			item, err := h.usecase.GetDocument(r.Context(), tenant.ID, id)
			if err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusNotFound)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(item)
		case http.MethodDelete:
			if err := h.usecase.DeleteDocument(r.Context(), tenant.ID, id); err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(map[string]string{"message": "deleted"})
		default:
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
		return
	}

	http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
}
