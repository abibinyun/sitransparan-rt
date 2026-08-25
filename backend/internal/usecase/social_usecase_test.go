package usecase

import (
	"context"
	"testing"

	"backend/internal/domain"

	"github.com/google/uuid"
)

// Mock repo in-memory yang mensimulasikan kontrak unik per (user, target).
type mockSocialRepo struct {
	reactions map[string]string // "type|target|user" -> reaction
	polls     map[uuid.UUID]*domain.Poll
	votes     map[string]int // "poll|user" -> option_index
}

func newMockSocialRepo() *mockSocialRepo {
	return &mockSocialRepo{
		reactions: map[string]string{},
		polls:     map[uuid.UUID]*domain.Poll{},
		votes:     map[string]int{},
	}
}

func key(t string, target, user uuid.UUID) string { return t + "|" + target.String() + "|" + user.String() }

func (m *mockSocialRepo) SetReaction(ctx context.Context, r *domain.Reaction) error {
	m.reactions[key(r.TargetType, r.TargetID, r.UserID)] = r.Reaction
	return nil
}

func (m *mockSocialRepo) RemoveReaction(ctx context.Context, t string, target, user uuid.UUID) error {
	delete(m.reactions, key(t, target, user))
	return nil
}

func (m *mockSocialRepo) ReactionSummary(ctx context.Context, t string, target, user uuid.UUID) (*domain.ReactionSummary, error) {
	s := &domain.ReactionSummary{Counts: map[string]int64{}}
	for k, v := range m.reactions {
		parts := splitKey(k)
		if parts[0] == t && parts[1] == target.String() {
			s.Counts[v]++
			s.Total++
			if parts[2] == user.String() {
				mine := v
				s.Mine = &mine
			}
		}
	}
	return s, nil
}

func splitKey(k string) []string {
	out := []string{}
	cur := ""
	for _, c := range k {
		if c == '|' {
			out = append(out, cur)
			cur = ""
			continue
		}
		cur += string(c)
	}
	return append(out, cur)
}

func (m *mockSocialRepo) CreatePoll(ctx context.Context, p *domain.Poll) error {
	if len(p.Options) < 2 {
		return errPollOptions
	}
	p.ID = uuid.New()
	if p.Status == "" {
		p.Status = "open" // default DB
	}
	m.polls[p.ID] = p
	return nil
}

func (m *mockSocialRepo) GetPoll(ctx context.Context, id, viewer uuid.UUID, includeViewer bool) (*domain.Poll, error) {
	p, ok := m.polls[id]
	if !ok {
		return nil, errSocialNotFound
	}
	m.attachResults(p, viewer, includeViewer)
	return p, nil
}

// attachResults menghitung agregat + suara viewer, meniru perilaku repo asli.
func (m *mockSocialRepo) attachResults(p *domain.Poll, viewer uuid.UUID, includeViewer bool) {
	p.Votes = make([]int64, len(p.Options))
	p.Total = 0
	for k, idx := range m.votes {
		parts := splitKey(k)
		if parts[0] == p.ID.String() {
			p.Votes[idx]++
			p.Total++
			if includeViewer && parts[1] == viewer.String() {
				i := idx
				p.MyVote = &i
			}
		}
	}
}

func (m *mockSocialRepo) ListOpenPolls(ctx context.Context, viewer uuid.UUID, includeViewer bool) ([]*domain.Poll, error) {
	var out []*domain.Poll
	for _, p := range m.polls {
		if p.Status == "open" {
			m.attachResults(p, viewer, includeViewer)
			out = append(out, p)
		}
	}
	return out, nil
}

func (m *mockSocialRepo) VotePoll(ctx context.Context, pollID, user uuid.UUID, idx int) error {
	p, ok := m.polls[pollID]
	if !ok {
		return errSocialNotFound
	}
	if p.Status != "open" {
		return errPollClosed
	}
	if idx < 0 || idx >= len(p.Options) {
		return errPollRange
	}
	m.votes[pollID.String()+"|"+user.String()] = idx
	return nil
}

func (m *mockSocialRepo) ClosePoll(ctx context.Context, id uuid.UUID) error {
	p, ok := m.polls[id]
	if !ok {
		return errSocialNotFound
	}
	p.Status = "closed"
	return nil
}

var (
	errSocialNotFound = &testErr{"not found"}
	errPollOptions    = &testErr{"poll requires 2..6 options"}
	errPollClosed     = &testErr{"poll is closed"}
	errPollRange      = &testErr{"option_index out of range"}
)

type testErr struct{ msg string }

func (e *testErr) Error() string { return e.msg }

func TestSocialUsecase_Reactions(t *testing.T) {
	uc := NewSocialUsecase(newMockSocialRepo())
	ctx := context.Background()
	user := uuid.New()
	target := uuid.New()

	// Valid reaction
	rx := &domain.Reaction{TargetType: "announcement", TargetID: target, UserID: user, Reaction: "support"}
	if err := uc.React(ctx, rx); err != nil {
		t.Fatalf("React failed: %v", err)
	}

	// Invalid type rejected
	if err := uc.React(ctx, &domain.Reaction{TargetType: "announcement", TargetID: target, UserID: user, Reaction: "fire"}); err == nil {
		t.Fatal("expected invalid reaction type to be rejected")
	}

	// Anonymous rejected
	if err := uc.React(ctx, &domain.Reaction{TargetType: "announcement", TargetID: target, UserID: uuid.Nil, Reaction: "like"}); err == nil {
		t.Fatal("expected anonymous reaction to be rejected")
	}

	// Invalid target rejected
	if err := uc.React(ctx, &domain.Reaction{TargetType: "resident", TargetID: target, UserID: user, Reaction: "like"}); err == nil {
		t.Fatal("expected invalid target_type to be rejected")
	}

	// Summary reflects one reaction
	sum, err := uc.Summary(ctx, "announcement", target, user)
	if err != nil {
		t.Fatalf("Summary failed: %v", err)
	}
	if sum.Total != 1 || sum.Counts["support"] != 1 || sum.Mine == nil || *sum.Mine != "support" {
		t.Fatalf("unexpected summary: %+v", sum)
	}

	// Unreact clears
	if err := uc.Unreact(ctx, "announcement", target, user); err != nil {
		t.Fatalf("Unreact failed: %v", err)
	}
	sum, _ = uc.Summary(ctx, "announcement", target, user)
	if sum.Total != 0 || sum.Mine != nil {
		t.Fatalf("expected empty summary after unreact: %+v", sum)
	}
}

func TestSocialUsecase_Polls(t *testing.T) {
	repo := newMockSocialRepo()
	uc := NewSocialUsecase(repo)
	ctx := context.Background()
	admin := uuid.New()
	voter := uuid.New()

	// Too few options rejected
	if err := uc.CreatePoll(ctx, &domain.Poll{Question: "Q", Options: []string{"satu"}}); err == nil {
		t.Fatal("expected 1-option poll to be rejected")
	}

	poll := &domain.Poll{Question: "Jadwal ronda?", Options: []string{"Senin", "Selasa"}, CreatedBy: &admin}
	if err := uc.CreatePoll(ctx, poll); err != nil {
		t.Fatalf("CreatePoll failed: %v", err)
	}

	// Vote valid
	if err := uc.Vote(ctx, poll.ID, voter, 0); err != nil {
		t.Fatalf("Vote failed: %v", err)
	}
	// Change vote (1 orang 1 suara — upsert)
	if err := uc.Vote(ctx, poll.ID, voter, 1); err != nil {
		t.Fatalf("Vote change failed: %v", err)
	}
	// Out of range rejected
	if err := uc.Vote(ctx, poll.ID, voter, 5); err == nil {
		t.Fatal("expected out-of-range option to be rejected")
	}

	got, err := uc.Poll(ctx, poll.ID, voter, true)
	if err != nil {
		t.Fatalf("Poll failed: %v", err)
	}
	if got.Total != 1 || got.Votes[0] != 0 || got.Votes[1] != 1 {
		t.Fatalf("expected 1 vote moved to option 1, got %+v", got.Votes)
	}
	if got.MyVote == nil || *got.MyVote != 1 {
		t.Fatalf("expected my_vote=1, got %v", got.MyVote)
	}

	// Closed poll rejects votes
	if err := uc.ClosePoll(ctx, poll.ID); err != nil {
		t.Fatalf("ClosePoll failed: %v", err)
	}
	if err := uc.Vote(ctx, poll.ID, admin, 0); err == nil {
		t.Fatal("expected vote on closed poll to be rejected")
	}
}

func (m *mockSocialRepo) RecordPortalEvent(ctx context.Context, slug, eventType string, targetID, userID *uuid.UUID) error {
	return nil
}
