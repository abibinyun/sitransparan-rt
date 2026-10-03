package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type CommunityPost struct {
	ID             uuid.UUID   `json:"id"`
	UserID         uuid.UUID   `json:"user_id"`
	ResidentID     *uuid.UUID  `json:"resident_id,omitempty"`
	HouseID        *uuid.UUID  `json:"house_id,omitempty"`
	AuthorName     string      `json:"author_name"`
	HouseNumber    *string     `json:"house_number,omitempty"`
	PostType       string      `json:"post_type"` // discussion, marketplace, question
	Category       string      `json:"category"`  // kuliner, jasa, barang, tanya, info, general
	Title          string      `json:"title"`
	Content        string      `json:"content"`
	Price          *float64    `json:"price,omitempty"`
	ContactPhone   *string     `json:"contact_phone,omitempty"`
	MediaURLs      []string    `json:"media_urls,omitempty"`
	IsSolved       bool        `json:"is_solved"`
	SolvedByUserID *uuid.UUID  `json:"solved_by_user_id,omitempty"`
	IsAnonymous    bool        `json:"is_anonymous"`
	ReactionsCount map[string]int `json:"reactions_count,omitempty"`
	UserReaction   *string     `json:"user_reaction,omitempty"`
	CommentsCount  int         `json:"comments_count"`
	CreatedAt      time.Time   `json:"created_at"`
	UpdatedAt      time.Time   `json:"updated_at"`
	DeletedAt      *time.Time  `json:"deleted_at,omitempty"`
}

type CommunityComment struct {
	ID              uuid.UUID   `json:"id"`
	PostID          uuid.UUID   `json:"post_id"`
	ParentCommentID *uuid.UUID  `json:"parent_comment_id,omitempty"`
	UserID          uuid.UUID   `json:"user_id"`
	AuthorName      string      `json:"author_name"`
	Content         string      `json:"content"`
	CreatedAt       time.Time   `json:"created_at"`
	DeletedAt       *time.Time  `json:"deleted_at,omitempty"`
}

type CommunityRepository interface {
	// Posts
	CreatePost(ctx context.Context, p *CommunityPost) error
	GetPostByID(ctx context.Context, id uuid.UUID) (*CommunityPost, error)
	ListPosts(ctx context.Context, postType, category string, limit, offset int) ([]*CommunityPost, int64, error)
	MarkPostSolved(ctx context.Context, postID, helperUserID uuid.UUID) error
	DeletePost(ctx context.Context, id, userID uuid.UUID) error

	// Comments
	CreateComment(ctx context.Context, c *CommunityComment) error
	ListCommentsByPost(ctx context.Context, postID uuid.UUID) ([]*CommunityComment, error)
	DeleteComment(ctx context.Context, id, userID uuid.UUID) error

	// Reactions
	ToggleReaction(ctx context.Context, postID, userID uuid.UUID, reactionType string) error
	GetPostReactionsCount(ctx context.Context, postID uuid.UUID) (map[string]int, error)
}
