package usecase_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"backend/internal/domain"
	"backend/internal/usecase"
)

type mockCommunityRepo struct {
	posts     map[uuid.UUID]*domain.CommunityPost
	comments  map[uuid.UUID][]*domain.CommunityComment
	reactions map[uuid.UUID]map[string]int
}

func newMockCommunityRepo() *mockCommunityRepo {
	return &mockCommunityRepo{
		posts:     make(map[uuid.UUID]*domain.CommunityPost),
		comments:  make(map[uuid.UUID][]*domain.CommunityComment),
		reactions: make(map[uuid.UUID]map[string]int),
	}
}

func (m *mockCommunityRepo) CreatePost(ctx context.Context, p *domain.CommunityPost) error {
	m.posts[p.ID] = p
	return nil
}
func (m *mockCommunityRepo) GetPostByID(ctx context.Context, id uuid.UUID) (*domain.CommunityPost, error) {
	return m.posts[id], nil
}
func (m *mockCommunityRepo) ListPosts(ctx context.Context, postType, category string, limit, offset int) ([]*domain.CommunityPost, int64, error) {
	var list []*domain.CommunityPost
	for _, p := range m.posts {
		if postType != "" && p.PostType != postType {
			continue
		}
		list = append(list, p)
	}
	return list, int64(len(list)), nil
}
func (m *mockCommunityRepo) MarkPostSolved(ctx context.Context, postID, helperUserID uuid.UUID) error {
	if p, ok := m.posts[postID]; ok {
		p.IsSolved = true
		p.SolvedByUserID = &helperUserID
	}
	return nil
}
func (m *mockCommunityRepo) DeletePost(ctx context.Context, id, userID uuid.UUID) error {
	delete(m.posts, id)
	return nil
}
func (m *mockCommunityRepo) CreateComment(ctx context.Context, c *domain.CommunityComment) error {
	m.comments[c.PostID] = append(m.comments[c.PostID], c)
	return nil
}
func (m *mockCommunityRepo) ListCommentsByPost(ctx context.Context, postID uuid.UUID) ([]*domain.CommunityComment, error) {
	return m.comments[postID], nil
}
func (m *mockCommunityRepo) DeleteComment(ctx context.Context, id, userID uuid.UUID) error {
	return nil
}
func (m *mockCommunityRepo) ToggleReaction(ctx context.Context, postID, userID uuid.UUID, reactionType string) error {
	if m.reactions[postID] == nil {
		m.reactions[postID] = make(map[string]int)
	}
	m.reactions[postID][reactionType]++
	return nil
}
func (m *mockCommunityRepo) GetPostReactionsCount(ctx context.Context, postID uuid.UUID) (map[string]int, error) {
	return m.reactions[postID], nil
}

func TestCommunityUsecase_PostAndCommentWorkflow(t *testing.T) {
	repo := newMockCommunityRepo()
	notifRepo := newMockNotificationRepo()
	notifUC := usecase.NewNotificationUsecase(notifRepo, nil)
	uc := usecase.NewCommunityUsecase(repo, notifUC)
	ctx := context.Background()

	tenantID := uuid.New()
	authorID := uuid.New()
	commenterID := uuid.New()

	// 1. Buat postingan Tanya Tetangga
	post := &domain.CommunityPost{
		ID:          uuid.New(),
		UserID:      authorID,
		AuthorName:  "Pak Joko",
		PostType:    "question",
		Category:    "tanya",
		Title:       "Cari Rekomendasi Tukang Ledeng",
		Content:     "Pipa air depan bocor, ada info tukang?",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	_, err := uc.CreatePost(ctx, tenantID, authorID, post)
	if err != nil {
		t.Fatalf("CreatePost failed: %v", err)
	}

	// 2. Beri komentar & mention
	comment, err := uc.AddComment(ctx, tenantID, post.ID, commenterID, "Pak Budi", nil, "Coba hubungi Pak Slamet di @Blok-A02")
	if err != nil {
		t.Fatalf("AddComment failed: %v", err)
	}
	if comment == nil {
		t.Fatal("expected comment returned")
	}

	// 3. Verifikasi notifikasi terkirim ke pemilik post
	unread, _ := notifRepo.GetUnreadCount(ctx, authorID)
	if unread != 1 {
		t.Errorf("expected 1 notification for post owner, got %d", unread)
	}

	// 4. Tandai Selesai / Terbantu
	err = uc.MarkPostSolved(ctx, tenantID, post.ID, authorID, commenterID)
	if err != nil {
		t.Fatalf("MarkPostSolved failed: %v", err)
	}
	savedPost, _ := uc.GetPostByID(ctx, tenantID, post.ID)
	if !savedPost.IsSolved || *savedPost.SolvedByUserID != commenterID {
		t.Errorf("expected post to be marked solved by commenter")
	}
}
