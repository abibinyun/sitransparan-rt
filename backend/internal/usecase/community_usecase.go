package usecase

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"backend/internal/domain"
)

type CommunityUsecase interface {
	CreatePost(ctx context.Context, tenantID, userID uuid.UUID, p *domain.CommunityPost) (*domain.CommunityPost, error)
	GetPostByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.CommunityPost, error)
	ListPosts(ctx context.Context, tenantID uuid.UUID, postType, category string, limit, offset int) ([]*domain.CommunityPost, int64, error)
	MarkPostSolved(ctx context.Context, tenantID, postID, ownerUserID, helperUserID uuid.UUID) error
	DeletePost(ctx context.Context, tenantID, id, userID uuid.UUID) error

	AddComment(ctx context.Context, tenantID, postID, userID uuid.UUID, authorName string, parentCommentID *uuid.UUID, content string) (*domain.CommunityComment, error)
	ListComments(ctx context.Context, tenantID, postID uuid.UUID) ([]*domain.CommunityComment, error)
	DeleteComment(ctx context.Context, tenantID, id, userID uuid.UUID) error

	ToggleReaction(ctx context.Context, tenantID, postID, userID uuid.UUID, reactionType string) error
}

type communityUsecase struct {
	repo    domain.CommunityRepository
	notifUC NotificationUsecase
}

func NewCommunityUsecase(repo domain.CommunityRepository, notifUC NotificationUsecase) CommunityUsecase {
	return &communityUsecase{
		repo:    repo,
		notifUC: notifUC,
	}
}

func (u *communityUsecase) CreatePost(ctx context.Context, tenantID, userID uuid.UUID, p *domain.CommunityPost) (*domain.CommunityPost, error) {
	if strings.TrimSpace(p.Title) == "" {
		return nil, errors.New("judul postingan wajib diisi")
	}
	if strings.TrimSpace(p.Content) == "" {
		return nil, errors.New("isi postingan wajib diisi")
	}

	p.ID = uuid.New()
	p.UserID = userID
	p.CreatedAt = time.Now()
	p.UpdatedAt = time.Now()

	if err := u.repo.CreatePost(ctx, p); err != nil {
		return nil, err
	}

	return p, nil
}

func (u *communityUsecase) GetPostByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.CommunityPost, error) {
	post, err := u.repo.GetPostByID(ctx, id)
	if err != nil || post == nil {
		return nil, err
	}
	counts, _ := u.repo.GetPostReactionsCount(ctx, id)
	post.ReactionsCount = counts
	comments, _ := u.repo.ListCommentsByPost(ctx, id)
	post.CommentsCount = len(comments)
	return post, nil
}

func (u *communityUsecase) ListPosts(ctx context.Context, tenantID uuid.UUID, postType, category string, limit, offset int) ([]*domain.CommunityPost, int64, error) {
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	posts, total, err := u.repo.ListPosts(ctx, postType, category, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	for _, p := range posts {
		counts, _ := u.repo.GetPostReactionsCount(ctx, p.ID)
		p.ReactionsCount = counts
		comments, _ := u.repo.ListCommentsByPost(ctx, p.ID)
		p.CommentsCount = len(comments)
	}

	return posts, total, nil
}

func (u *communityUsecase) MarkPostSolved(ctx context.Context, tenantID, postID, ownerUserID, helperUserID uuid.UUID) error {
	post, err := u.repo.GetPostByID(ctx, postID)
	if err != nil || post == nil {
		return errors.New("postingan tidak ditemukan")
	}
	if post.UserID != ownerUserID {
		return errors.New("hanya pemilik postingan yang dapat menandai selesai")
	}

	if err := u.repo.MarkPostSolved(ctx, postID, helperUserID); err != nil {
		return err
	}

	// Notifikasi apresiasi ke tetangga yang membantu
	if u.notifUC != nil && helperUserID != uuid.Nil {
		title := "Apresiasi Tetangga!"
		body := fmt.Sprintf("%s menandai usulan/bantuan Anda sebagai solusi yang sangat membantu!", post.AuthorName)
		_ = u.notifUC.Dispatch(ctx, tenantID, &helperUserID, title, body, "community", "/admin/community", map[string]interface{}{
			"post_id": postID,
		})
	}

	return nil
}

func (u *communityUsecase) DeletePost(ctx context.Context, tenantID, id, userID uuid.UUID) error {
	return u.repo.DeletePost(ctx, id, userID)
}

func (u *communityUsecase) AddComment(ctx context.Context, tenantID, postID, userID uuid.UUID, authorName string, parentCommentID *uuid.UUID, content string) (*domain.CommunityComment, error) {
	if strings.TrimSpace(content) == "" {
		return nil, errors.New("isi komentar tidak boleh kosong")
	}

	post, err := u.repo.GetPostByID(ctx, postID)
	if err != nil || post == nil {
		return nil, errors.New("postingan tidak ditemukan")
	}

	comment := &domain.CommunityComment{
		ID:              uuid.New(),
		PostID:          postID,
		ParentCommentID: parentCommentID,
		UserID:          userID,
		AuthorName:      authorName,
		Content:         content,
		CreatedAt:       time.Now(),
	}

	if err := u.repo.CreateComment(ctx, comment); err != nil {
		return nil, err
	}

	// Dispatch notifikasi ke pemilik postingan jika yang komentar bukan dirinya sendiri
	if u.notifUC != nil && post.UserID != userID {
		title := fmt.Sprintf("Komentar Baru dari %s", authorName)
		body := fmt.Sprintf("%s mengomentari: \"%s\"", authorName, content)
		_ = u.notifUC.Dispatch(ctx, tenantID, &post.UserID, title, body, "comment_reply", "/admin/community", map[string]interface{}{
			"post_id": postID,
		})
	}

	return comment, nil
}

func (u *communityUsecase) ListComments(ctx context.Context, tenantID, postID uuid.UUID) ([]*domain.CommunityComment, error) {
	return u.repo.ListCommentsByPost(ctx, postID)
}

func (u *communityUsecase) DeleteComment(ctx context.Context, tenantID, id, userID uuid.UUID) error {
	return u.repo.DeleteComment(ctx, id, userID)
}

func (u *communityUsecase) ToggleReaction(ctx context.Context, tenantID, postID, userID uuid.UUID, reactionType string) error {
	return u.repo.ToggleReaction(ctx, postID, userID, reactionType)
}
