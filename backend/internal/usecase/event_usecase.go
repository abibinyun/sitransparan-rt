package usecase

import (
	"context"
	"errors"

	"backend/internal/domain"
	"github.com/google/uuid"
)

var ErrEventNotFound = errors.New("event not found")

type eventUsecase struct {
	repo domain.EventRepository
}

func NewEventUsecase(repo domain.EventRepository) domain.EventUsecase {
	return &eventUsecase{repo: repo}
}

func (u *eventUsecase) CreateEvent(ctx context.Context, tenantID uuid.UUID, event *domain.Event) error {
	event.TenantID = tenantID
	return u.repo.CreateEvent(ctx, event)
}

func (u *eventUsecase) ListEvents(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*domain.Event, int64, error) {
	if limit <= 0 {
		limit = 10
	}
	if offset < 0 {
		offset = 0
	}
	return u.repo.ListEvents(ctx, tenantID, limit, offset)
}

func (u *eventUsecase) GetEvent(ctx context.Context, tenantID, id uuid.UUID) (*domain.Event, error) {
	event, err := u.repo.GetEventByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	return event, nil
}

func (u *eventUsecase) UpdateEvent(ctx context.Context, tenantID uuid.UUID, event *domain.Event) error {
	existing, err := u.repo.GetEventByID(ctx, tenantID, event.ID)
	if err != nil {
		return err
	}
	event.TenantID = tenantID
	if event.CreatedBy == nil {
		event.CreatedBy = existing.CreatedBy
	}
	return u.repo.UpdateEvent(ctx, event)
}

func (u *eventUsecase) DeleteEvent(ctx context.Context, tenantID, id uuid.UUID) error {
	return u.repo.DeleteEvent(ctx, tenantID, id)
}

func (u *eventUsecase) AddOrUpdateBudget(ctx context.Context, tenantID, eventID uuid.UUID, budget *domain.EventBudget) error {
	_, err := u.repo.GetEventByID(ctx, tenantID, eventID)
	if err != nil {
		return err
	}
	budget.EventID = eventID
	return u.repo.AddOrUpdateBudget(ctx, budget)
}

func (u *eventUsecase) RSVP(ctx context.Context, tenantID, eventID uuid.UUID, participant *domain.EventParticipant) error {
	_, err := u.repo.GetEventByID(ctx, tenantID, eventID)
	if err != nil {
		return err
	}
	participant.EventID = eventID
	return u.repo.AddOrUpdateParticipant(ctx, participant)
}
