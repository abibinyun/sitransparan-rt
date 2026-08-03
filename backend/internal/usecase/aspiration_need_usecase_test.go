package usecase_test

import (
	"context"
	"errors"
	"testing"

	"backend/internal/domain"
	"backend/internal/usecase"
	"github.com/google/uuid"
)

type mockAspirationNeedRepo struct {
	aspirations    map[uuid.UUID]*domain.Aspiration
	communityNeeds map[uuid.UUID]*domain.CommunityNeed
	eventSponsors  map[uuid.UUID]*domain.EventSponsor
}

func newMockAspirationNeedRepo() *mockAspirationNeedRepo {
	return &mockAspirationNeedRepo{
		aspirations:    make(map[uuid.UUID]*domain.Aspiration),
		communityNeeds: make(map[uuid.UUID]*domain.CommunityNeed),
		eventSponsors:  make(map[uuid.UUID]*domain.EventSponsor),
	}
}

func (m *mockAspirationNeedRepo) CreateAspiration(ctx context.Context, asp *domain.Aspiration) error {
	if asp.ID == uuid.Nil {
		asp.ID = uuid.New()
	}
	m.aspirations[asp.ID] = asp
	return nil
}

func (m *mockAspirationNeedRepo) GetAspirationByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Aspiration, error) {
	asp, ok := m.aspirations[id]
	if !ok || asp.TenantID != tenantID {
		return nil, errors.New("not found")
	}
	return asp, nil
}

func (m *mockAspirationNeedRepo) ListAspirations(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.Aspiration, int64, error) {
	var res []*domain.Aspiration
	for _, asp := range m.aspirations {
		if asp.TenantID == tenantID {
			res = append(res, asp)
		}
	}
	return res, int64(len(res)), nil
}

func (m *mockAspirationNeedRepo) UpdateAspiration(ctx context.Context, asp *domain.Aspiration) error {
	if _, ok := m.aspirations[asp.ID]; !ok {
		return errors.New("not found")
	}
	m.aspirations[asp.ID] = asp
	return nil
}

func (m *mockAspirationNeedRepo) CreateCommunityNeed(ctx context.Context, need *domain.CommunityNeed) error {
	if need.ID == uuid.Nil {
		need.ID = uuid.New()
	}
	m.communityNeeds[need.ID] = need
	return nil
}

func (m *mockAspirationNeedRepo) GetCommunityNeedByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.CommunityNeed, error) {
	need, ok := m.communityNeeds[id]
	if !ok || need.TenantID != tenantID {
		return nil, errors.New("not found")
	}
	return need, nil
}

func (m *mockAspirationNeedRepo) ListCommunityNeeds(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.CommunityNeed, int64, error) {
	var res []*domain.CommunityNeed
	for _, need := range m.communityNeeds {
		if need.TenantID == tenantID {
			res = append(res, need)
		}
	}
	return res, int64(len(res)), nil
}

func (m *mockAspirationNeedRepo) UpdateCommunityNeed(ctx context.Context, need *domain.CommunityNeed) error {
	if _, ok := m.communityNeeds[need.ID]; !ok {
		return errors.New("not found")
	}
	m.communityNeeds[need.ID] = need
	return nil
}

func (m *mockAspirationNeedRepo) CreateEventSponsor(ctx context.Context, sponsor *domain.EventSponsor) error {
	if sponsor.ID == uuid.Nil {
		sponsor.ID = uuid.New()
	}
	m.eventSponsors[sponsor.ID] = sponsor
	return nil
}

func (m *mockAspirationNeedRepo) ListEventSponsorsByEventID(ctx context.Context, tenantID, eventID uuid.UUID) ([]*domain.EventSponsor, error) {
	var res []*domain.EventSponsor
	for _, s := range m.eventSponsors {
		if s.EventID == eventID {
			res = append(res, s)
		}
	}
	return res, nil
}

func (m *mockAspirationNeedRepo) DeleteEventSponsor(ctx context.Context, tenantID, sponsorID uuid.UUID) error {
	if _, ok := m.eventSponsors[sponsorID]; !ok {
		return errors.New("not found")
	}
	delete(m.eventSponsors, sponsorID)
	return nil
}

func TestSubmitAspirationAnonymous(t *testing.T) {
	repo := newMockAspirationNeedRepo()
	uc := usecase.NewAspirationNeedUsecase(repo)

	tenantID := uuid.New()
	resID := uuid.New()

	asp := &domain.Aspiration{
		Title:       "Test Aspiration",
		Content:     "Test Content",
		Category:    "suggestion",
		IsAnonymous: true,
		ResidentID:  &resID,
	}

	err := uc.SubmitAspiration(context.Background(), tenantID, asp)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if asp.ResidentID != nil {
		t.Errorf("expected ResidentID to be nil when IsAnonymous is true, got %v", asp.ResidentID)
	}
}

func TestUpdateAspirationStatusAndResponse(t *testing.T) {
	repo := newMockAspirationNeedRepo()
	uc := usecase.NewAspirationNeedUsecase(repo)

	tenantID := uuid.New()
	asp := &domain.Aspiration{
		Title:    "Issue",
		Content:  "Broken lamp",
		Category: "complaint",
		Status:   "submitted",
	}

	if err := uc.SubmitAspiration(context.Background(), tenantID, asp); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	respMsg := "Will fix tomorrow"
	updated, err := uc.UpdateAspirationStatus(context.Background(), tenantID, asp.ID, "under_review", &respMsg)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if updated.Status != "under_review" {
		t.Errorf("expected status 'under_review', got %s", updated.Status)
	}
	if updated.Response == nil || *updated.Response != respMsg {
		t.Errorf("expected response '%s', got %v", respMsg, updated.Response)
	}
}
