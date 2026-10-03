package http

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"backend/internal/delivery/http/middleware"
	"backend/internal/domain"
	"backend/internal/usecase"
)

type CommunityHandler struct {
	usecase usecase.CommunityUsecase
}

func NewCommunityHandler(uc usecase.CommunityUsecase) *CommunityHandler {
	return &CommunityHandler{usecase: uc}
}

func (h *CommunityHandler) RegisterRoutes(mux *http.ServeMux, tenantMw, authMw func(http.Handler) http.Handler) {
	handler := authMw(tenantMw(http.HandlerFunc(h.handleCommunity)))
	mux.Handle("/api/v1/community/posts", handler)
	mux.Handle("/api/v1/community/posts/", handler)
}

func (h *CommunityHandler) handleCommunity(w http.ResponseWriter, r *http.Request) {
	tenant := middleware.GetTenantFromContext(r.Context())
	if tenant == nil {
		http.Error(w, `{"error":"tenant context missing"}`, http.StatusBadRequest)
		return
	}
	userID := middleware.GetUserIDFromContext(r.Context())

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/community/posts")
	path = strings.TrimPrefix(path, "/")

	// 1. GET /api/v1/community/posts: List posts
	if path == "" && r.Method == http.MethodGet {
		postType := r.URL.Query().Get("type")
		category := r.URL.Query().Get("category")
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

		list, total, err := h.usecase.ListPosts(r.Context(), tenant.ID, postType, category, limit, offset)
		if err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
			return
		}
		if list == nil {
			list = []*domain.CommunityPost{}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"data":   list,
			"total":  total,
			"limit":  limit,
			"offset": offset,
		})
		return
	}

	// 2. POST /api/v1/community/posts: Create post
	if path == "" && r.Method == http.MethodPost {
		var p domain.CommunityPost
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
			return
		}

		created, err := h.usecase.CreatePost(r.Context(), tenant.ID, userID, &p)
		if err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(created)
		return
	}

	// 3. Comments sub-routes: /community/posts/{id}/comments
	if strings.Contains(path, "/comments") {
		parts := strings.Split(path, "/")
		postID, err := uuid.Parse(parts[0])
		if err != nil {
			http.Error(w, `{"error":"invalid post id"}`, http.StatusBadRequest)
			return
		}

		// GET comments
		if r.Method == http.MethodGet {
			comments, err := h.usecase.ListComments(r.Context(), tenant.ID, postID)
			if err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
				return
			}
			if comments == nil {
				comments = []*domain.CommunityComment{}
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{"data": comments})
			return
		}

		// POST comment
		if r.Method == http.MethodPost {
			var req struct {
				AuthorName      string     `json:"author_name"`
				ParentCommentID *uuid.UUID `json:"parent_comment_id"`
				Content         string     `json:"content"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
				return
			}

			c, err := h.usecase.AddComment(r.Context(), tenant.ID, postID, userID, req.AuthorName, req.ParentCommentID, req.Content)
			if err != nil {
				http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(c)
			return
		}
	}

	// 4. Reactions: POST /community/posts/{id}/reactions
	if strings.HasSuffix(path, "/reactions") && r.Method == http.MethodPost {
		postIDStr := strings.TrimSuffix(path, "/reactions")
		postID, err := uuid.Parse(postIDStr)
		if err != nil {
			http.Error(w, `{"error":"invalid post id"}`, http.StatusBadRequest)
			return
		}
		var req struct {
			ReactionType string `json:"reaction_type"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ReactionType == "" {
			http.Error(w, `{"error":"reaction_type is required"}`, http.StatusBadRequest)
			return
		}
		if err := h.usecase.ToggleReaction(r.Context(), tenant.ID, postID, userID, req.ReactionType); err != nil {
			http.Error(w, `{"error":"failed to toggle reaction"}`, http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "reaction toggled"})
		return
	}

	// 5. Mark Solved: POST /community/posts/{id}/solve
	if strings.HasSuffix(path, "/solve") && r.Method == http.MethodPost {
		postIDStr := strings.TrimSuffix(path, "/solve")
		postID, err := uuid.Parse(postIDStr)
		if err != nil {
			http.Error(w, `{"error":"invalid post id"}`, http.StatusBadRequest)
			return
		}
		var req struct {
			HelperUserID uuid.UUID `json:"helper_user_id"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)

		if err := h.usecase.MarkPostSolved(r.Context(), tenant.ID, postID, userID, req.HelperUserID); err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "post marked as solved"})
		return
	}

	// 6. Delete Post: DELETE /community/posts/{id}
	if path != "" && r.Method == http.MethodDelete {
		postID, err := uuid.Parse(path)
		if err != nil {
			http.Error(w, `{"error":"invalid post id"}`, http.StatusBadRequest)
			return
		}
		if err := h.usecase.DeletePost(r.Context(), tenant.ID, postID, userID); err != nil {
			http.Error(w, `{"error":"failed to delete post"}`, http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "post deleted"})
		return
	}

	http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
}
