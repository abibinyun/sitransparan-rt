package usecase

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"backend/internal/domain"
)

type meetingUsecase struct {
	meetingRepo domain.MeetingRepository
}

func NewMeetingUsecase(meetingRepo domain.MeetingRepository) domain.MeetingUsecase {
	return &meetingUsecase{
		meetingRepo: meetingRepo,
	}
}

func (u *meetingUsecase) CreateMeeting(ctx context.Context, m *domain.Meeting) (*domain.Meeting, error) {
	if strings.TrimSpace(m.Title) == "" {
		return nil, errors.New("title is required")
	}
	if strings.TrimSpace(m.Agenda) == "" {
		return nil, errors.New("agenda is required")
	}
	if m.MeetingDate.IsZero() {
		return nil, errors.New("meeting_date is required")
	}
	if strings.TrimSpace(m.Location) == "" {
		m.Location = "Balai Pertemuan Warga"
	}
	if m.MeetingType == "" {
		m.MeetingType = "regular"
	}
	if m.Visibility == "" {
		m.Visibility = "internal"
	}
	if m.Status == "" {
		m.Status = "scheduled"
	}

	if err := u.meetingRepo.Create(ctx, m); err != nil {
		return nil, err
	}
	return m, nil
}

func (u *meetingUsecase) GetMeetingByID(ctx context.Context, id uuid.UUID) (*domain.Meeting, error) {
	return u.meetingRepo.GetByID(ctx, id)
}

func (u *meetingUsecase) ListMeetings(ctx context.Context, visibility string) ([]domain.Meeting, error) {
	return u.meetingRepo.List(ctx, visibility)
}

func (u *meetingUsecase) UpdateMeeting(ctx context.Context, m *domain.Meeting) (*domain.Meeting, error) {
	if strings.TrimSpace(m.Title) == "" {
		return nil, errors.New("title is required")
	}
	if err := u.meetingRepo.Update(ctx, m); err != nil {
		return nil, err
	}
	return u.meetingRepo.GetByID(ctx, m.ID)
}

func (u *meetingUsecase) DeleteMeeting(ctx context.Context, id uuid.UUID) error {
	return u.meetingRepo.Delete(ctx, id)
}

func (u *meetingUsecase) AddAttendee(ctx context.Context, a *domain.MeetingAttendee) (*domain.MeetingAttendee, error) {
	if strings.TrimSpace(a.Name) == "" {
		return nil, errors.New("name is required")
	}
	if a.RoleOrTitle == "" {
		a.RoleOrTitle = "Warga"
	}
	if err := u.meetingRepo.AddAttendee(ctx, a); err != nil {
		return nil, err
	}
	return a, nil
}

func (u *meetingUsecase) DeleteAttendee(ctx context.Context, id uuid.UUID) error {
	return u.meetingRepo.DeleteAttendee(ctx, id)
}

func (u *meetingUsecase) AddDecision(ctx context.Context, d *domain.MeetingDecision) (*domain.MeetingDecision, error) {
	if strings.TrimSpace(d.DecisionText) == "" {
		return nil, errors.New("decision_text is required")
	}
	if d.Category == "" {
		d.Category = "Umum"
	}
	if err := u.meetingRepo.AddDecision(ctx, d); err != nil {
		return nil, err
	}
	return d, nil
}

func (u *meetingUsecase) DeleteDecision(ctx context.Context, id uuid.UUID) error {
	return u.meetingRepo.DeleteDecision(ctx, id)
}

func (u *meetingUsecase) CreateActionItem(ctx context.Context, item *domain.MeetingActionItem) (*domain.MeetingActionItem, error) {
	if strings.TrimSpace(item.Task) == "" {
		return nil, errors.New("task is required")
	}
	if strings.TrimSpace(item.AssigneeName) == "" {
		return nil, errors.New("assignee_name is required")
	}
	if item.Status == "" {
		item.Status = "pending"
	}
	if err := u.meetingRepo.CreateActionItem(ctx, item); err != nil {
		return nil, err
	}
	return item, nil
}

func (u *meetingUsecase) UpdateActionItem(ctx context.Context, item *domain.MeetingActionItem) (*domain.MeetingActionItem, error) {
	if err := u.meetingRepo.UpdateActionItem(ctx, item); err != nil {
		return nil, err
	}
	return item, nil
}

func (u *meetingUsecase) DeleteActionItem(ctx context.Context, id uuid.UUID) error {
	return u.meetingRepo.DeleteActionItem(ctx, id)
}

func (u *meetingUsecase) ListActionItems(ctx context.Context, status string) ([]domain.MeetingActionItem, error) {
	return u.meetingRepo.ListActionItems(ctx, status)
}
