package usecase

import (
	"context"
	"errors"

	"backend/internal/domain"
	"github.com/google/uuid"
)

type aspirationNeedUsecase struct {
	repo domain.AspirationNeedRepository
}

func NewAspirationNeedUsecase(repo domain.AspirationNeedRepository) domain.AspirationNeedUsecase {
	return &aspirationNeedUsecase{repo: repo}
}

func (u *aspirationNeedUsecase) SubmitAspiration(ctx context.Context, tenantID uuid.UUID, asp *domain.Aspiration) error {
	if asp.Title == "" || asp.Content == "" || asp.Category == "" {
		return errors.New("title, content, and category are required")
	}
	asp.TenantID = tenantID
	if asp.IsAnonymous {
		asp.ResidentID = nil
	}
	return u.repo.CreateAspiration(ctx, asp)
}

func (u *aspirationNeedUsecase) GetAspiration(ctx context.Context, tenantID, id uuid.UUID) (*domain.Aspiration, error) {
	return u.repo.GetAspirationByID(ctx, tenantID, id)
}

func (u *aspirationNeedUsecase) ListAspirations(ctx context.Context, tenantID uuid.UUID, isPublic bool, limit, offset int) ([]*domain.Aspiration, int64, error) {
	if limit <= 0 {
		limit = 10
	}
	items, total, err := u.repo.ListAspirations(ctx, tenantID, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	if isPublic {
		sanitized := make([]*domain.Aspiration, 0, len(items))
		for _, item := range items {
			cp := *item
			if cp.IsAnonymous {
				cp.ResidentID = nil
			}
			sanitized = append(sanitized, &cp)
		}
		return sanitized, total, nil
	}

	return items, total, nil
}

func (u *aspirationNeedUsecase) UpdateAspirationStatus(ctx context.Context, tenantID, id uuid.UUID, status string, response *string) (*domain.Aspiration, error) {
	asp, err := u.repo.GetAspirationByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}

	if status != "" {
		asp.Status = status
	}
	if response != nil {
		asp.Response = response
	}

	if err := u.repo.UpdateAspiration(ctx, asp); err != nil {
		return nil, err
	}
	return asp, nil
}

func (u *aspirationNeedUsecase) CreateCommunityNeed(ctx context.Context, tenantID uuid.UUID, need *domain.CommunityNeed) error {
	if need.Title == "" {
		return errors.New("title is required")
	}
	need.TenantID = tenantID
	return u.repo.CreateCommunityNeed(ctx, need)
}

func (u *aspirationNeedUsecase) GetCommunityNeed(ctx context.Context, tenantID, id uuid.UUID) (*domain.CommunityNeed, error) {
	return u.repo.GetCommunityNeedByID(ctx, tenantID, id)
}

func (u *aspirationNeedUsecase) ListCommunityNeeds(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.CommunityNeed, int64, error) {
	if limit <= 0 {
		limit = 10
	}
	return u.repo.ListCommunityNeeds(ctx, tenantID, limit, offset)
}

func (u *aspirationNeedUsecase) UpdateCommunityNeed(ctx context.Context, tenantID uuid.UUID, need *domain.CommunityNeed) error {
	existing, err := u.repo.GetCommunityNeedByID(ctx, tenantID, need.ID)
	if err != nil {
		return err
	}

	if need.Title != "" {
		existing.Title = need.Title
	}
	if need.Description != nil {
		existing.Description = need.Description
	}
	if need.EstimatedCost >= 0 {
		existing.EstimatedCost = need.EstimatedCost
	}
	if need.Status != "" {
		existing.Status = need.Status
	}
	if need.ProgressNotes != nil {
		existing.ProgressNotes = need.ProgressNotes
	}

	return u.repo.UpdateCommunityNeed(ctx, existing)
}

func (u *aspirationNeedUsecase) CreateEventSponsor(ctx context.Context, tenantID uuid.UUID, sponsor *domain.EventSponsor) error {
	if sponsor.Name == "" || sponsor.Type == "" || sponsor.EventID == uuid.Nil {
		return errors.New("event_id, name, and type are required")
	}
	return u.repo.CreateEventSponsor(ctx, sponsor)
}

func (u *aspirationNeedUsecase) ListEventSponsors(ctx context.Context, tenantID, eventID uuid.UUID) ([]*domain.EventSponsor, error) {
	return u.repo.ListEventSponsorsByEventID(ctx, tenantID, eventID)
}

func (u *aspirationNeedUsecase) DeleteEventSponsor(ctx context.Context, tenantID, sponsorID uuid.UUID) error {
	return u.repo.DeleteEventSponsor(ctx, tenantID, sponsorID)
}
