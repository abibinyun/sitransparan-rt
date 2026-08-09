package usecase

import (
	"context"
	"errors"
	"io"

	"backend/internal/domain"
	"github.com/google/uuid"
)

var ErrEventNotFound = errors.New("event not found")

type eventUsecase struct {
	repo               domain.EventRepository
	aspirationNeedRepo domain.AspirationNeedRepository
}

func NewEventUsecase(repo domain.EventRepository, aspirationNeedRepo ...domain.AspirationNeedRepository) domain.EventUsecase {
	uc := &eventUsecase{repo: repo}
	if len(aspirationNeedRepo) > 0 {
		uc.aspirationNeedRepo = aspirationNeedRepo[0]
	}
	return uc
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
	if budget.PlannedAmount == 0 && budget.EstimatedCost > 0 {
		budget.PlannedAmount = budget.EstimatedCost
	}
	if budget.ActualAmount == 0 && budget.ActualCost > 0 {
		budget.ActualAmount = budget.ActualCost
	}
	budget.EstimatedCost = budget.PlannedAmount
	budget.ActualCost = budget.ActualAmount

	return u.repo.AddOrUpdateBudget(ctx, budget)
}

func (u *eventUsecase) ListBudgets(ctx context.Context, tenantID, eventID uuid.UUID) ([]*domain.EventBudget, error) {
	_, err := u.repo.GetEventByID(ctx, tenantID, eventID)
	if err != nil {
		return nil, err
	}
	return u.repo.ListBudgetsByEventID(ctx, eventID)
}

func (u *eventUsecase) RSVP(ctx context.Context, tenantID, eventID uuid.UUID, participant *domain.EventParticipant) error {
	_, err := u.repo.GetEventByID(ctx, tenantID, eventID)
	if err != nil {
		return err
	}
	participant.EventID = eventID
	return u.repo.AddOrUpdateParticipant(ctx, participant)
}

func (u *eventUsecase) AssignRole(ctx context.Context, tenantID, eventID uuid.UUID, role *domain.EventRole) error {
	_, err := u.repo.GetEventByID(ctx, tenantID, eventID)
	if err != nil {
		return err
	}
	role.EventID = eventID
	return u.repo.AssignRole(ctx, role)
}

func (u *eventUsecase) ListRoles(ctx context.Context, tenantID, eventID uuid.UUID) ([]*domain.EventRole, error) {
	_, err := u.repo.GetEventByID(ctx, tenantID, eventID)
	if err != nil {
		return nil, err
	}
	return u.repo.ListRolesByEventID(ctx, eventID)
}

func (u *eventUsecase) RemoveRole(ctx context.Context, tenantID, eventID, roleID uuid.UUID) error {
	_, err := u.repo.GetEventByID(ctx, tenantID, eventID)
	if err != nil {
		return err
	}
	return u.repo.RemoveRole(ctx, eventID, roleID)
}

func (u *eventUsecase) UploadDonationReceipt(ctx context.Context, tenantID, eventID uuid.UUID, residentID *uuid.UUID, filename string, content io.Reader, contentType string, amount float64, description string) (*domain.EventReceipt, error) {
	_, err := u.repo.GetEventByID(ctx, tenantID, eventID)
	if err != nil {
		return nil, err
	}

	fileURL, err := u.repo.UploadReceiptFile(ctx, filename, content, contentType)
	if err != nil {
		return nil, err
	}

	receipt := &domain.EventReceipt{
		ID:          uuid.New(),
		EventID:     eventID,
		ResidentID:  residentID,
		ReceiptURL:  fileURL,
		Amount:      amount,
		Description: description,
	}

	if err := u.repo.CreateReceipt(ctx, receipt); err != nil {
		return nil, err
	}

	return receipt, nil
}

func (u *eventUsecase) ListReceipts(ctx context.Context, tenantID, eventID uuid.UUID) ([]*domain.EventReceipt, error) {
	_, err := u.repo.GetEventByID(ctx, tenantID, eventID)
	if err != nil {
		return nil, err
	}
	return u.repo.ListReceiptsByEventID(ctx, eventID)
}

func (u *eventUsecase) GetTransparency(ctx context.Context, tenantID, eventID uuid.UUID) (*domain.EventTransparency, error) {
	event, err := u.repo.GetEventByID(ctx, tenantID, eventID)
	if err != nil {
		return nil, err
	}

	budgets, err := u.repo.ListBudgetsByEventID(ctx, eventID)
	if err != nil {
		budgets = []*domain.EventBudget{}
	}

	receipts, err := u.repo.ListReceiptsByEventID(ctx, eventID)
	if err != nil {
		receipts = []*domain.EventReceipt{}
	}

	var totalPlanned, totalActual float64
	for _, b := range budgets {
		totalPlanned += b.PlannedAmount
		totalActual += b.ActualAmount
	}

	var totalDonations float64
	for _, r := range receipts {
		totalDonations += r.Amount
	}

	var sponsors []*domain.EventSponsor
	if u.aspirationNeedRepo != nil {
		sponsors, _ = u.aspirationNeedRepo.ListEventSponsorsByEventID(ctx, tenantID, eventID)
	}
	for _, s := range sponsors {
		totalDonations += s.Amount
	}

	fundingProgress := 0.0
	if totalPlanned > 0 {
		fundingProgress = (totalDonations / totalPlanned) * 100
		if fundingProgress > 100 {
			fundingProgress = 100
		}
	}

	timeline, _, _ := u.repo.ListEvents(ctx, tenantID, 100, 0)

	return &domain.EventTransparency{
		Event:           event,
		Timeline:        timeline,
		Status:          event.Status,
		FundingProgress: fundingProgress,
		Budgets:         budgets,
		TotalPlanned:    totalPlanned,
		TotalActual:     totalActual,
		TotalDonations:  totalDonations,
		DonationDetails: sponsors,
		Receipts:        receipts,
	}, nil
}
