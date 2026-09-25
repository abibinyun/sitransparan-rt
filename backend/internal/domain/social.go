package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Reaction adalah apresiasi ringan 1-warga-1-reaksi per target.
// Identitas wajib: tidak ada reaksi anonim (gerbang §7 konsep portal).
type Reaction struct {
	ID         uuid.UUID  `json:"id"`
	TargetType string     `json:"target_type"` // announcement | event | meeting
	TargetID   uuid.UUID  `json:"target_id"`
	UserID     *uuid.UUID `json:"user_id,omitempty"`
	HouseID    *uuid.UUID `json:"house_id,omitempty"`
	Reaction   string     `json:"reaction"` // support | like | applause
	CreatedAt  time.Time  `json:"created_at"`
}

type ReactionSummary struct {
	Counts map[string]int64 `json:"counts"` // reaction -> jumlah
	Mine   *string          `json:"mine"`   // reaksi si-peminta (null = belum bereaksi)
	Total  int64            `json:"total"`
}

type Poll struct {
	ID        uuid.UUID  `json:"id"`
	Question  string     `json:"question"`
	Options   []string   `json:"options"`
	VoteScope string     `json:"vote_scope"` // 'house' (1 rumah 1 suara) | 'resident' (1 warga 1 suara)
	Status    string     `json:"status"`     // open | closed
	CreatedBy *uuid.UUID `json:"created_by,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	ClosedAt  *time.Time `json:"closed_at,omitempty"`

	// Hasil agregat (diisi pada Get/List):
	Votes  []int64 `json:"votes,omitempty"` // jumlah suara per opsi
	Total  int64   `json:"total_votes,omitempty"`
	MyVote *int    `json:"my_vote,omitempty"` // indeks opsi si-peminta
}

type SocialRepository interface {
	// Reactions
	SetReaction(ctx context.Context, r *Reaction) error
	RemoveReaction(ctx context.Context, targetType string, targetID uuid.UUID, userID, houseID *uuid.UUID) error
	ReactionSummary(ctx context.Context, targetType string, targetID uuid.UUID, userID, houseID *uuid.UUID) (*ReactionSummary, error)

	// Polls
	CreatePoll(ctx context.Context, p *Poll) error
	GetPoll(ctx context.Context, id uuid.UUID, viewerID, houseID, residentID *uuid.UUID, includeViewer bool) (*Poll, error)
	ListOpenPolls(ctx context.Context, viewerID, houseID, residentID *uuid.UUID, includeViewer bool) ([]*Poll, error)
	VotePoll(ctx context.Context, pollID uuid.UUID, userID, houseID, residentID *uuid.UUID, optionIndex int) error
	ClosePoll(ctx context.Context, id uuid.UUID) error

	// KPI instrumentasi (konsep portal §4)
	RecordPortalEvent(ctx context.Context, slug, eventType string, targetID, userID *uuid.UUID) error
}

type SocialUsecase interface {
	React(ctx context.Context, r *Reaction) error
	Unreact(ctx context.Context, targetType string, targetID uuid.UUID, userID, houseID *uuid.UUID) error
	Summary(ctx context.Context, targetType string, targetID uuid.UUID, userID, houseID *uuid.UUID) (*ReactionSummary, error)

	CreatePoll(ctx context.Context, p *Poll) error
	Poll(ctx context.Context, id uuid.UUID, viewerID, houseID, residentID *uuid.UUID, includeViewer bool) (*Poll, error)
	OpenPolls(ctx context.Context, viewerID, houseID, residentID *uuid.UUID, includeViewer bool) ([]*Poll, error)
	Vote(ctx context.Context, pollID uuid.UUID, userID, houseID, residentID *uuid.UUID, optionIndex int) error
	ClosePoll(ctx context.Context, id uuid.UUID) error

	// KPI instrumentasi (konsep portal §4): event ringan sisi server.
	RecordPortalEvent(ctx context.Context, slug, eventType string, targetID, userID *uuid.UUID) error
}
