package usecase

import (
	"context"
	"errors"

	"backend/internal/domain"
	"github.com/google/uuid"
)

var (
	ErrResidentNotFound = errors.New("resident not found")
	ErrInvalidInput     = errors.New("invalid input")
)

type residentUsecase struct {
	repo domain.ResidentRepository
}

func NewResidentUsecase(repo domain.ResidentRepository) domain.ResidentUsecase {
	return &residentUsecase{repo: repo}
}

func (u *residentUsecase) Create(ctx context.Context, tenantID uuid.UUID, resident *domain.Resident) error {
	if tenantID == uuid.Nil {
		return ErrInvalidInput
	}
	resident.TenantID = tenantID
	return u.repo.Create(ctx, resident)
}

func (u *residentUsecase) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Resident, error) {
	if tenantID == uuid.Nil || id == uuid.Nil {
		return nil, ErrInvalidInput
	}
	res, err := u.repo.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	return res, nil
}

func (u *residentUsecase) Update(ctx context.Context, tenantID uuid.UUID, resident *domain.Resident) error {
	if tenantID == uuid.Nil || resident.ID == uuid.Nil {
		return ErrInvalidInput
	}
	resident.TenantID = tenantID
	return u.repo.Update(ctx, resident)
}

func (u *residentUsecase) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	if tenantID == uuid.Nil || id == uuid.Nil {
		return ErrInvalidInput
	}
	return u.repo.Delete(ctx, tenantID, id)
}

func (u *residentUsecase) List(ctx context.Context, tenantID uuid.UUID, query string, limit, offset int) ([]*domain.Resident, int64, error) {
	if tenantID == uuid.Nil {
		return nil, 0, ErrInvalidInput
	}
	if limit <= 0 {
		limit = 10
	}
	if offset < 0 {
		offset = 0
	}
	return u.repo.List(ctx, tenantID, query, limit, offset)
}

func (u *residentUsecase) AddFamilyMember(ctx context.Context, tenantID uuid.UUID, member *domain.FamilyMember) error {
	if tenantID == uuid.Nil || member.ResidentID == uuid.Nil {
		return ErrInvalidInput
	}
	// Verify resident exists and belongs to tenant
	_, err := u.repo.GetByID(ctx, tenantID, member.ResidentID)
	if err != nil {
		return err
	}
	return u.repo.AddFamilyMember(ctx, member)
}

func (u *residentUsecase) RemoveFamilyMember(ctx context.Context, tenantID, residentID, memberID uuid.UUID) error {
	if tenantID == uuid.Nil || residentID == uuid.Nil || memberID == uuid.Nil {
		return ErrInvalidInput
	}
	return u.repo.RemoveFamilyMember(ctx, tenantID, residentID, memberID)
}
