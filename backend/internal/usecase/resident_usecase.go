package usecase

import (
	"context"
	"errors"
	"io"

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

func (u *residentUsecase) List(ctx context.Context, tenantID uuid.UUID, query string, isHead *bool, limit, offset int) ([]*domain.Resident, int64, error) {
	if tenantID == uuid.Nil {
		return nil, 0, ErrInvalidInput
	}
	if limit <= 0 {
		limit = 10
	}
	if offset < 0 {
		offset = 0
	}
	return u.repo.List(ctx, tenantID, query, isHead, limit, offset)
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

func (u *residentUsecase) Approve(ctx context.Context, tenantID, id, adminUserID uuid.UUID) error {
	if tenantID == uuid.Nil || id == uuid.Nil {
		return ErrInvalidInput
	}
	res, err := u.repo.GetByID(ctx, tenantID, id)
	if err != nil {
		return err
	}

	if err := u.repo.UpdateStatus(ctx, tenantID, id, "approved"); err != nil {
		return err
	}

	_ = u.repo.LogAudit(ctx, tenantID, adminUserID, "approve_resident", "residents", map[string]interface{}{
		"resident_id": id,
		"old_status":  res.Status,
		"new_status":  "approved",
	})

	return nil
}

func (u *residentUsecase) Reject(ctx context.Context, tenantID, id, adminUserID uuid.UUID) error {
	if tenantID == uuid.Nil || id == uuid.Nil {
		return ErrInvalidInput
	}
	res, err := u.repo.GetByID(ctx, tenantID, id)
	if err != nil {
		return err
	}

	if err := u.repo.UpdateStatus(ctx, tenantID, id, "rejected"); err != nil {
		return err
	}

	_ = u.repo.LogAudit(ctx, tenantID, adminUserID, "reject_resident", "residents", map[string]interface{}{
		"resident_id": id,
		"old_status":  res.Status,
		"new_status":  "rejected",
	})

	return nil
}

func (u *residentUsecase) UploadDocument(ctx context.Context, docType, filename string, content io.Reader, contentType string) (string, error) {
	return u.repo.UploadDocument(ctx, docType, filename, content, contentType)
}
