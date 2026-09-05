package usecase

import (
	"context"
	"errors"
	"strings"

	"backend/internal/domain"

	"github.com/google/uuid"
)

type socialUsecase struct {
	repo domain.SocialRepository
}

func NewSocialUsecase(repo domain.SocialRepository) domain.SocialUsecase {
	return &socialUsecase{repo: repo}
}

var validReactionTypes = map[string]bool{"support": true, "like": true, "applause": true}

var validReactionTargets = map[string]bool{"announcement": true, "event": true, "meeting": true}

func (u *socialUsecase) React(ctx context.Context, r *domain.Reaction) error {
	if !validReactionTypes[r.Reaction] {
		return errors.New("reaction must be one of: support, like, applause")
	}
	if !validReactionTargets[r.TargetType] {
		return errors.New("target_type must be one of: announcement, event, meeting")
	}
	if (r.UserID == nil || *r.UserID == uuid.Nil) && (r.HouseID == nil || *r.HouseID == uuid.Nil) {
		return errors.New("user or house context required")
	}
	return u.repo.SetReaction(ctx, r)
}

func (u *socialUsecase) Unreact(ctx context.Context, targetType string, targetID uuid.UUID, userID, houseID *uuid.UUID) error {
	if !validReactionTargets[targetType] {
		return errors.New("target_type must be one of: announcement, event, meeting")
	}
	return u.repo.RemoveReaction(ctx, targetType, targetID, userID, houseID)
}

func (u *socialUsecase) Summary(ctx context.Context, targetType string, targetID uuid.UUID, userID, houseID *uuid.UUID) (*domain.ReactionSummary, error) {
	if !validReactionTargets[targetType] {
		return nil, errors.New("target_type must be one of: announcement, event, meeting")
	}
	return u.repo.ReactionSummary(ctx, targetType, targetID, userID, houseID)
}

func (u *socialUsecase) CreatePoll(ctx context.Context, p *domain.Poll) error {
	if strings.TrimSpace(p.Question) == "" {
		return errors.New("question is required")
	}
	if len(p.Options) < 2 || len(p.Options) > 6 {
		return errors.New("poll requires 2..6 options")
	}
	for _, o := range p.Options {
		if strings.TrimSpace(o) == "" {
			return errors.New("poll options must not be empty")
		}
	}
	return u.repo.CreatePoll(ctx, p)
}

func (u *socialUsecase) Poll(ctx context.Context, id uuid.UUID, viewerID, houseID *uuid.UUID, includeViewer bool) (*domain.Poll, error) {
	return u.repo.GetPoll(ctx, id, viewerID, houseID, includeViewer)
}

func (u *socialUsecase) OpenPolls(ctx context.Context, viewerID, houseID *uuid.UUID, includeViewer bool) ([]*domain.Poll, error) {
	return u.repo.ListOpenPolls(ctx, viewerID, houseID, includeViewer)
}

func (u *socialUsecase) Vote(ctx context.Context, pollID uuid.UUID, userID, houseID *uuid.UUID, optionIndex int) error {
	if (userID == nil || *userID == uuid.Nil) && (houseID == nil || *houseID == uuid.Nil) {
		return errors.New("user or house context required")
	}
	return u.repo.VotePoll(ctx, pollID, userID, houseID, optionIndex)
}

func (u *socialUsecase) ClosePoll(ctx context.Context, id uuid.UUID) error {
	return u.repo.ClosePoll(ctx, id)
}

var validPortalEventTypes = map[string]bool{"feed_view": true, "share_opened": true}

func (u *socialUsecase) RecordPortalEvent(ctx context.Context, slug, eventType string, targetID, userID *uuid.UUID) error {
	if strings.TrimSpace(slug) == "" {
		return errors.New("tenant slug required")
	}
	if !validPortalEventTypes[eventType] {
		return errors.New("event_type must be one of: feed_view, share_opened")
	}
	return u.repo.RecordPortalEvent(ctx, slug, eventType, targetID, userID)
}
