package usecase

import (
	"context"
	"errors"
	"time"

	"backend/internal/domain"
	"github.com/google/uuid"
)

type rtStructureUsecase struct {
	repo domain.RTStructureRepository
}

func NewRTStructureUsecase(repo domain.RTStructureRepository) domain.RTStructureUsecase {
	return &rtStructureUsecase{repo: repo}
}

func (u *rtStructureUsecase) CreatePeriod(ctx context.Context, tenantID uuid.UUID, p *domain.RTPeriod) error {
	if p.Name == "" || p.StartDate.IsZero() || p.EndDate.IsZero() {
		return errors.New("nama periode, tanggal mulai, dan tanggal selesai wajib diisi")
	}
	if p.EndDate.Before(p.StartDate) {
		return errors.New("tanggal selesai harus setelah tanggal mulai")
	}
	p.TenantID = tenantID
	return u.repo.CreatePeriod(ctx, p)
}

func (u *rtStructureUsecase) GetPeriod(ctx context.Context, tenantID, id uuid.UUID) (*domain.RTPeriod, error) {
	return u.repo.GetPeriodByID(ctx, tenantID, id)
}

func (u *rtStructureUsecase) GetActivePeriod(ctx context.Context, tenantID uuid.UUID) (*domain.RTPeriod, error) {
	return u.repo.GetActivePeriod(ctx, tenantID)
}

func (u *rtStructureUsecase) ListPeriods(ctx context.Context, tenantID uuid.UUID, status string) ([]*domain.RTPeriod, error) {
	return u.repo.ListPeriods(ctx, tenantID, status)
}

func (u *rtStructureUsecase) UpdatePeriod(ctx context.Context, tenantID uuid.UUID, p *domain.RTPeriod) error {
	if p.Name == "" || p.StartDate.IsZero() || p.EndDate.IsZero() {
		return errors.New("nama periode, tanggal mulai, dan tanggal selesai wajib diisi")
	}
	p.TenantID = tenantID
	return u.repo.UpdatePeriod(ctx, p)
}

func (u *rtStructureUsecase) AddMember(ctx context.Context, tenantID uuid.UUID, m *domain.RTMember) error {
	if m.PeriodID == uuid.Nil || m.ResidentID == uuid.Nil || m.Role == "" {
		return errors.New("periode, warga, dan jabatan wajib diisi")
	}
	if m.JoinedAt.IsZero() {
		m.JoinedAt = time.Now()
	}
	return u.repo.AddMember(ctx, m)
}

func (u *rtStructureUsecase) ListMembers(ctx context.Context, tenantID, periodID uuid.UUID, section, role, status string) ([]*domain.RTMember, error) {
	return u.repo.ListMembers(ctx, tenantID, periodID, section, role, status)
}

func (u *rtStructureUsecase) UpdateMember(ctx context.Context, tenantID uuid.UUID, m *domain.RTMember) error {
	if m.ID == uuid.Nil || m.Role == "" {
		return errors.New("id anggota dan jabatan wajib diisi")
	}
	return u.repo.UpdateMember(ctx, m)
}

func (u *rtStructureUsecase) DeleteMember(ctx context.Context, tenantID, id uuid.UUID) error {
	return u.repo.DeleteMember(ctx, tenantID, id)
}
