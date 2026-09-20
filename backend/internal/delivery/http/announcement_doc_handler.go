package http

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"
	"github.com/google/uuid"
)

type AnnouncementDocHandler struct {
	usecase    domain.AnnouncementDocUsecase
	tenantRepo domain.TenantRepository
	houseRepo  domain.HouseRepository
	userRepo   domain.UserRepository
	baseDomain string
	pushUC     domain.PushUsecase // opsional (nil = broadcast dinonaktifkan)
}

func NewAnnouncementDocHandler(usecase domain.AnnouncementDocUsecase, tenantRepo domain.TenantRepository, houseRepo domain.HouseRepository, userRepo domain.UserRepository, baseDomain string, pushUC domain.PushUsecase) *AnnouncementDocHandler {
	return &AnnouncementDocHandler{
		usecase:    usecase,
		tenantRepo: tenantRepo,
		houseRepo:  houseRepo,
		userRepo:   userRepo,
		baseDomain: baseDomain,
		pushUC:     pushUC,
	}
}

func (h *AnnouncementDocHandler) RegisterRoutes(mux *http.ServeMux, tenantMw func(http.Handler) http.Handler, authMw func(http.Handler) http.Handler) {
	// Public Tenant routes: /api/v1/t/:slug/announcements and /api/v1/t/:slug/documents.
	// Use method-specific wildcard patterns so these routes can coexist with
	// other public tenant resources without colliding on /api/v1/t/.
	mux.HandleFunc("GET /api/v1/t/{slug}/announcements", h.handlePublicTenantRoutes)
	mux.HandleFunc("GET /api/v1/t/{slug}/announcements/{id}", h.handlePublicTenantAnnouncementDetail)
	mux.HandleFunc("GET /api/v1/t/{slug}/documents", h.handlePublicTenantRoutes)

	// Private Announcement routes: /api/v1/announcements
	protectedAnnouncements := http.HandlerFunc(h.handlePrivateAnnouncements)
	mux.Handle("/api/v1/announcements", authMw(tenantMw(protectedAnnouncements)))
	mux.Handle("/api/v1/announcements/", authMw(tenantMw(protectedAnnouncements)))

	// Explicit Announcement Comments routes
	mux.HandleFunc("/api/v1/t/{slug}/announcements/{id}/comments", h.handlePublicAnnouncementComments)
	mux.Handle("GET /api/v1/announcements/{id}/comments", authMw(tenantMw(http.HandlerFunc(h.handleGetCommentsPrivate))))
	mux.Handle("POST /api/v1/announcements/{id}/comments", authMw(tenantMw(http.HandlerFunc(h.handleCreateComment))))
	mux.Handle("DELETE /api/v1/announcements/{id}/comments/{commentId}", authMw(tenantMw(http.HandlerFunc(h.handleDeleteComment))))

	// Private Document routes: /api/v1/documents
	protectedDocuments := http.HandlerFunc(h.handlePrivateDocuments)
	mux.Handle("/api/v1/documents", authMw(tenantMw(protectedDocuments)))
	mux.Handle("/api/v1/documents/", authMw(tenantMw(protectedDocuments)))
}

func (h *AnnouncementDocHandler) handlePublicTenantAnnouncementDetail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}
	slug := r.PathValue("slug")
	idStr := r.PathValue("id")
	if slug == "" || idStr == "" {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}

	if hostSlug, matched := middleware.HostnameSlug(r.Host, h.baseDomain); matched && hostSlug != slug {
		http.Error(w, `{"error":"tenant not found"}`, http.StatusNotFound)
		return
	}

	tenant, err := h.tenantRepo.GetBySlug(r.Context(), slug)
	if err != nil || tenant == nil || !tenant.IsActive() {
		http.Error(w, `{"error":"tenant not found"}`, http.StatusNotFound)
		return
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, `{"error":"invalid announcement id"}`, http.StatusBadRequest)
		return
	}

	r = r.WithContext(context.WithValue(r.Context(), domain.TenantContextKey, tenant))
	item, err := h.usecase.GetAnnouncement(r.Context(), tenant.ID, id)
	if err != nil || item == nil || item.Target != "all" {
		http.Error(w, `{"error":"announcement not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(item)
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

	// Hostname/tenant consistency: when the request arrives on a tenant subdomain
	// of the base domain, the path slug must match the hostname tenant, otherwise
	// the request is rejected (404) and the hostname can never select a different
	// tenant's public resources.
	if hostSlug, matched := middleware.HostnameSlug(r.Host, h.baseDomain); matched && hostSlug != slug {
		http.Error(w, `{"error":"tenant not found"}`, http.StatusNotFound)
		return
	}

	tenant, err := h.tenantRepo.GetBySlug(r.Context(), slug)
	if err != nil || tenant == nil || !tenant.IsActive() {
		http.Error(w, `{"error":"tenant not found"}`, http.StatusNotFound)
		return
	}

	// Make the resolved tenant available to repositories so that tenant-scoped
	// queries are schema-qualified against tenant_<slug>.
	r = r.WithContext(context.WithValue(r.Context(), domain.TenantContextKey, tenant))

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

func (h *AnnouncementDocHandler) handleGetCommentsPrivate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}
	tenant := middleware.GetTenantFromContext(r.Context())
	if tenant == nil {
		http.Error(w, `{"error":"tenant context missing"}`, http.StatusBadRequest)
		return
	}
	announcementID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, `{"error":"invalid announcement id"}`, http.StatusBadRequest)
		return
	}

	comments, err := h.usecase.ListComments(r.Context(), tenant.ID, announcementID)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{"data": comments})
}

func (h *AnnouncementDocHandler) handlePublicAnnouncementComments(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}
	slug := r.PathValue("slug")
	idStr := r.PathValue("id")
	announcementID, err := uuid.Parse(idStr)
	if slug == "" || err != nil {
		http.Error(w, `{"error":"invalid parameters"}`, http.StatusBadRequest)
		return
	}

	tenant, err := h.tenantRepo.GetBySlug(r.Context(), slug)
	if err != nil || tenant == nil || !tenant.IsActive() {
		http.Error(w, `{"error":"tenant not found"}`, http.StatusNotFound)
		return
	}

	ctx := context.WithValue(r.Context(), domain.TenantContextKey, tenant)
	comments, err := h.usecase.ListComments(ctx, tenant.ID, announcementID)
	if err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{"data": comments})
}

func (h *AnnouncementDocHandler) handleCreateComment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}
	tenant := middleware.GetTenantFromContext(r.Context())
	if tenant == nil {
		http.Error(w, `{"error":"tenant context missing"}`, http.StatusBadRequest)
		return
	}
	userID := middleware.GetUserIDFromContext(r.Context())
	if userID == uuid.Nil {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}
	authorName := "Warga RT"
	if h.userRepo != nil {
		if u, err := h.userRepo.GetByID(r.Context(), userID); err == nil && u != nil && u.Name != "" {
			authorName = u.Name
		}
	}

	announcementID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, `{"error":"invalid announcement id"}`, http.StatusBadRequest)
		return
	}

	var req struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid payload"}`, http.StatusBadRequest)
		return
	}

	var houseBlock *string
	if h.houseRepo != nil {
		if house, err := h.houseRepo.GetByUserID(r.Context(), tenant.ID, userID); err == nil && house != nil {
			b := house.BlockNumber
			houseBlock = &b
		}
	}

	comment := &domain.AnnouncementComment{
		AnnouncementID: announcementID,
		UserID:         userID,
		AuthorName:     authorName,
		HouseBlock:     houseBlock,
		Content:        req.Content,
	}

	if err := h.usecase.CreateComment(r.Context(), tenant.ID, comment); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"data":    comment,
		"message": "Komentar berhasil dikirim",
	})
}

func (h *AnnouncementDocHandler) handleDeleteComment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}
	tenant := middleware.GetTenantFromContext(r.Context())
	if tenant == nil {
		http.Error(w, `{"error":"tenant context missing"}`, http.StatusBadRequest)
		return
	}
	if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
		http.Error(w, `{"error":"forbidden: hanya pengurus RT yang dapat menghapus komentar"}`, http.StatusForbidden)
		return
	}

	commentID, err := uuid.Parse(r.PathValue("commentId"))
	if err != nil {
		http.Error(w, `{"error":"invalid comment id"}`, http.StatusBadRequest)
		return
	}

	if err := h.usecase.DeleteComment(r.Context(), tenant.ID, commentID); err != nil {
		http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"message": "Komentar berhasil dihapus"})
}

func (h *AnnouncementDocHandler) publicListAnnouncements(w http.ResponseWriter, r *http.Request, tenantID uuid.UUID) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	category := r.URL.Query().Get("category")
	var categoryFilter *string
	if category != "" && category != "all" {
		categoryFilter = &category
	}

	// The anonymous public feed may only see announcements targeted at
	// everyone ("all"). Never honor a caller-supplied target filter here —
	// otherwise residents-only/internal announcements would leak publicly.
	all := "all"
	targetFilter := &all

	announcements, total, err := h.usecase.ListAnnouncements(r.Context(), tenantID, targetFilter, categoryFilter, limit, offset)
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

	reqPath := r.URL.Path
	var path string
	if idx := strings.Index(reqPath, "/announcements"); idx != -1 {
		path = reqPath[idx+len("/announcements"):]
	} else {
		path = strings.TrimPrefix(reqPath, "/api/v1/announcements")
	}
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
			category := r.URL.Query().Get("category")
			var categoryFilter *string
			if category != "" && category != "all" {
				categoryFilter = &category
			}

			list, total, err := h.usecase.ListAnnouncements(r.Context(), tenant.ID, targetFilter, categoryFilter, limit, offset)
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
			if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
				http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
				return
			}
			var req domain.Announcement
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
				return
			}
			userID := middleware.GetUserIDFromContext(r.Context())
			if userID != uuid.Nil {
				req.CreatedBy = &userID
			}
			if req.Category == "" {
				req.Category = "pengumuman"
			}
			if err := h.usecase.CreateAnnouncement(r.Context(), tenant.ID, &req); err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
				return
			}
			if h.pushUC != nil {
				go func(tID uuid.UUID, title string) {
					log.Printf("announcement: memicu push broadcast untuk tenant %s, judul: %s", tID, title)
					broadcastCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
					defer cancel()
					if err := h.pushUC.BroadcastTenant(broadcastCtx, tID, "Pengumuman Baru", title, "/kabar"); err != nil {
						log.Printf("announcement: error broadcast push: %v", err)
					}
				}(tenant.ID, req.Title)
			} else {
				log.Printf("announcement: pushUC nil, broadcast diabaikan")
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
			if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
				http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
				return
			}
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
			if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
				http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
				return
			}
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

	if len(parts) >= 2 && parts[1] == "comments" {
		if len(parts) == 2 {
			switch r.Method {
			case http.MethodGet:
				comments, err := h.usecase.ListComments(r.Context(), tenant.ID, id)
				if err != nil {
					http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
					return
				}
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusOK)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{"data": comments})
			case http.MethodPost:
				userID := middleware.GetUserIDFromContext(r.Context())
				if userID == uuid.Nil {
					http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
					return
				}
				authorName := "Warga RT"
				if h.userRepo != nil {
					if u, err := h.userRepo.GetByID(r.Context(), userID); err == nil && u != nil && u.Name != "" {
						authorName = u.Name
					}
				}
				var req struct {
					Content string `json:"content"`
				}
				if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
					http.Error(w, `{"error":"invalid payload"}`, http.StatusBadRequest)
					return
				}
				var houseBlock *string
				if h.houseRepo != nil {
					if house, err := h.houseRepo.GetByUserID(r.Context(), tenant.ID, userID); err == nil && house != nil {
						b := house.BlockNumber
						houseBlock = &b
					}
				}
				comment := &domain.AnnouncementComment{
					AnnouncementID: id,
					UserID:         userID,
					AuthorName:     authorName,
					HouseBlock:     houseBlock,
					Content:        req.Content,
				}
				if err := h.usecase.CreateComment(r.Context(), tenant.ID, comment); err != nil {
					http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
					return
				}
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusCreated)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{
					"data":    comment,
					"message": "Komentar berhasil dikirim",
				})
			default:
				http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			}
			return
		}
		if len(parts) == 3 && r.Method == http.MethodDelete {
			if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
				http.Error(w, `{"error":"forbidden: hanya pengurus RT yang dapat menghapus komentar"}`, http.StatusForbidden)
				return
			}
			commentID, err := uuid.Parse(parts[2])
			if err != nil {
				http.Error(w, `{"error":"invalid comment id"}`, http.StatusBadRequest)
				return
			}
			if err := h.usecase.DeleteComment(r.Context(), tenant.ID, commentID); err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(map[string]string{"message": "Komentar berhasil dihapus"})
			return
		}
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
			if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
				http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
				return
			}
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
					if msg := validateUploadFile(header.Filename, header.Header.Get("Content-Type"), header.Size); msg != "" {
						http.Error(w, `{"error":"`+msg+`"}`, http.StatusBadRequest)
						return
					}
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
		case http.MethodPut:
			if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
				http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
				return
			}
			var req domain.Document
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
				return
			}
			req.ID = id
			if err := h.usecase.UpdateDocument(r.Context(), tenant.ID, &req); err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(req)
		case http.MethodDelete:
			if !middleware.RequireAnyRole(r, domain.RoleSuperAdmin, domain.RoleAdminRT) {
				http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
				return
			}
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
