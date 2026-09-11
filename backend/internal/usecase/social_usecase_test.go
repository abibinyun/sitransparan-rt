package usecase

import (
	"context"
	"testing"

	"backend/internal/domain"

	"github.com/google/uuid"
)

// Mock repo in-memory yang mensimulasikan kontrak unik per (user, target).
type mockSocialRepo struct {
	reactions map[string]string // "type|target|actor" -> reaction
	polls     map[uuid.UUID]*domain.Poll
	votes     map[string]int // "poll|actor" -> option_index
}

func newMockSocialRepo() *mockSocialRepo {
	return &mockSocialRepo{
		reactions: map[string]string{},
		polls:     map[uuid.UUID]*domain.Poll{},
		votes:     map[string]int{},
	}
}

func actorKey(user, house *uuid.UUID) string {
	if house != nil && *house != uuid.Nil {
		return "h:" + house.String()
	}
	if user != nil && *user != uuid.Nil {
		return "u:" + user.String()
	}
	return ""
}

func key(t string, target uuid.UUID, user, house *uuid.UUID) string {
	return t + "|" + target.String() + "|" + actorKey(user, house)
}

func (m *mockSocialRepo) SetReaction(ctx context.Context, r *domain.Reaction) error {
	m.reactions[key(r.TargetType, r.TargetID, r.UserID, r.HouseID)] = r.Reaction
	return nil
}

func (m *mockSocialRepo) RemoveReaction(ctx context.Context, t string, target uuid.UUID, user, house *uuid.UUID) error {
	delete(m.reactions, key(t, target, user, house))
	return nil
}

func (m *mockSocialRepo) ReactionSummary(ctx context.Context, t string, target uuid.UUID, user, house *uuid.UUID) (*domain.ReactionSummary, error) {
	s := &domain.ReactionSummary{Counts: map[string]int64{}}
	aKey := actorKey(user, house)
	for k, v := range m.reactions {
		parts := splitKey(k)
		if parts[0] == t && parts[1] == target.String() {
			s.Counts[v]++
			s.Total++
			if aKey != "" && parts[2] == aKey {
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

func (m *mockSocialRepo) GetPoll(ctx context.Context, id uuid.UUID, viewer, house *uuid.UUID, includeViewer bool) (*domain.Poll, error) {
	p, ok := m.polls[id]
	if !ok {
		return nil, errSocialNotFound
	}
	m.attachResults(p, viewer, house, includeViewer)
	return p, nil
}

// attachResults menghitung agregat + suara viewer, meniru perilaku repo asli.
func (m *mockSocialRepo) attachResults(p *domain.Poll, viewer, house *uuid.UUID, includeViewer bool) {
	p.Votes = make([]int64, len(p.Options))
	p.Total = 0
	aKey := actorKey(viewer, house)
	for k, idx := range m.votes {
		parts := splitKey(k)
		if parts[0] == p.ID.String() {
			p.Votes[idx]++
			p.Total++
			if includeViewer && aKey != "" && parts[1] == aKey {
				i := idx
				p.MyVote = &i
			}
		}
	}
}

func (m *mockSocialRepo) ListOpenPolls(ctx context.Context, viewer, house *uuid.UUID, includeViewer bool) ([]*domain.Poll, error) {
	var out []*domain.Poll
	for _, p := range m.polls {
		if p.Status == "open" || p.Status == "closed" {
			m.attachResults(p, viewer, house, includeViewer)
			out = append(out, p)
		}
	}
	return out, nil
}

func (m *mockSocialRepo) VotePoll(ctx context.Context, pollID uuid.UUID, user, house *uuid.UUID, idx int) error {
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
	aKey := actorKey(user, house)
	m.votes[pollID.String()+"|"+aKey] = idx
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
	rx := &domain.Reaction{TargetType: "announcement", TargetID: target, UserID: &user, Reaction: "support"}
	if err := uc.React(ctx, rx); err != nil {
		t.Fatalf("React failed: %v", err)
	}

	// Invalid type rejected
	if err := uc.React(ctx, &domain.Reaction{TargetType: "announcement", TargetID: target, UserID: &user, Reaction: "fire"}); err == nil {
		t.Fatal("expected invalid reaction type to be rejected")
	}

	// Anonymous rejected
	nilUser := uuid.Nil
	if err := uc.React(ctx, &domain.Reaction{TargetType: "announcement", TargetID: target, UserID: &nilUser, Reaction: "like"}); err == nil {
		t.Fatal("expected anonymous reaction to be rejected")
	}

	// Invalid target rejected
	if err := uc.React(ctx, &domain.Reaction{TargetType: "resident", TargetID: target, UserID: &user, Reaction: "like"}); err == nil {
		t.Fatal("expected invalid target_type to be rejected")
	}

	// Summary reflects one reaction
	sum, err := uc.Summary(ctx, "announcement", target, &user, nil)
	if err != nil {
		t.Fatalf("Summary failed: %v", err)
	}
	if sum.Total != 1 || sum.Counts["support"] != 1 || sum.Mine == nil || *sum.Mine != "support" {
		t.Fatalf("unexpected summary: %+v", sum)
	}

	// Unreact clears
	if err := uc.Unreact(ctx, "announcement", target, &user, nil); err != nil {
		t.Fatalf("Unreact failed: %v", err)
	}
	sum, _ = uc.Summary(ctx, "announcement", target, &user, nil)
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
	if err := uc.Vote(ctx, poll.ID, &voter, nil, 0); err != nil {
		t.Fatalf("Vote failed: %v", err)
	}
	// Change vote (1 orang 1 suara — upsert)
	if err := uc.Vote(ctx, poll.ID, &voter, nil, 1); err != nil {
		t.Fatalf("Vote change failed: %v", err)
	}
	// Out of range rejected
	if err := uc.Vote(ctx, poll.ID, &voter, nil, 5); err == nil {
		t.Fatal("expected out-of-range option to be rejected")
	}

	got, err := uc.Poll(ctx, poll.ID, &voter, nil, true)
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
	if err := uc.Vote(ctx, poll.ID, &admin, nil, 0); err == nil {
		t.Fatal("expected vote on closed poll to be rejected")
	}

	// Test House QR Session Voting (1 Rumah = 1 Suara)
	pollHouse := &domain.Poll{Question: "Pilih cat pos ronda?", Options: []string{"Hijau", "Biru"}, CreatedBy: &admin}
	if err := uc.CreatePoll(ctx, pollHouse); err != nil {
		t.Fatalf("CreatePoll failed: %v", err)
	}
	houseA := uuid.New()
	if err := uc.Vote(ctx, pollHouse.ID, nil, &houseA, 0); err != nil {
		t.Fatalf("House QR vote failed: %v", err)
	}
	// Suara rumah yang sama memperbarui opsi (upsert 1 rumah 1 suara)
	if err := uc.Vote(ctx, pollHouse.ID, nil, &houseA, 1); err != nil {
		t.Fatalf("House QR vote change failed: %v", err)
	}
	gotHouse, err := uc.Poll(ctx, pollHouse.ID, nil, &houseA, true)
	if err != nil {
		t.Fatalf("Poll failed: %v", err)
	}
	if gotHouse.Total != 1 || gotHouse.Votes[1] != 1 {
		t.Fatalf("expected 1 vote on option 1 from house, got %+v", gotHouse.Votes)
	}
	if gotHouse.MyVote == nil || *gotHouse.MyVote != 1 {
		t.Fatalf("expected my_vote=1 for house, got %v", gotHouse.MyVote)
	}
}

func (m *mockSocialRepo) RecordPortalEvent(ctx context.Context, slug, eventType string, targetID, userID *uuid.UUID) error {
	return nil
}
