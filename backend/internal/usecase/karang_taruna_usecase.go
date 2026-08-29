package usecase

import (
	"context"
	"errors"
	"strings"

	"backend/internal/domain"
	"github.com/google/uuid"
)

type karangTarunaUsecase struct {
	repo domain.KarangTarunaRepository
}

func NewKarangTarunaUsecase(repo domain.KarangTarunaRepository) domain.KarangTarunaUsecase {
	return &karangTarunaUsecase{repo: repo}
}

func (u *karangTarunaUsecase) CanManage(ctx context.Context, tenantID, userID uuid.UUID, callerRole domain.RoleName) bool {
	r := strings.ToLower(string(callerRole))
	if r == "superadmin" || r == "super_admin" || r == "admin_rt" || r == "rt_admin" {
		return true
	}
	isKetua, _ := u.repo.IsKetua(ctx, tenantID, userID)
	return isKetua
}

func (u *karangTarunaUsecase) CreatePeriod(ctx context.Context, tenantID uuid.UUID, p *domain.KarangTarunaPeriod) error {
	if tenantID == uuid.Nil {
		return errors.New("tenant_id is required")
	}
	if strings.TrimSpace(p.Name) == "" {
		return errors.New("period name is required")
	}
	if p.StartDate.IsZero() || p.EndDate.IsZero() {
		return errors.New("start_date and end_date are required")
	}
	if p.EndDate.Before(p.StartDate) {
		return errors.New("end_date must be after start_date")
	}
	p.TenantID = tenantID
	return u.repo.CreatePeriod(ctx, p)
}

func (u *karangTarunaUsecase) GetPeriod(ctx context.Context, tenantID, id uuid.UUID) (*domain.KarangTarunaPeriod, error) {
	if tenantID == uuid.Nil || id == uuid.Nil {
		return nil, errors.New("tenant_id and id are required")
	}
	return u.repo.GetPeriodByID(ctx, tenantID, id)
}

func (u *karangTarunaUsecase) GetActivePeriod(ctx context.Context, tenantID uuid.UUID) (*domain.KarangTarunaPeriod, error) {
	if tenantID == uuid.Nil {
		return nil, errors.New("tenant_id is required")
	}
	return u.repo.GetActivePeriod(ctx, tenantID)
}

func (u *karangTarunaUsecase) ListPeriods(ctx context.Context, tenantID uuid.UUID, status string) ([]*domain.KarangTarunaPeriod, error) {
	if tenantID == uuid.Nil {
		return nil, errors.New("tenant_id is required")
	}
	return u.repo.ListPeriods(ctx, tenantID, status)
}

func (u *karangTarunaUsecase) UpdatePeriod(ctx context.Context, tenantID uuid.UUID, p *domain.KarangTarunaPeriod) error {
	if tenantID == uuid.Nil || p.ID == uuid.Nil {
		return errors.New("tenant_id and period_id are required")
	}
	if strings.TrimSpace(p.Name) == "" {
		return errors.New("period name is required")
	}
	p.TenantID = tenantID
	return u.repo.UpdatePeriod(ctx, p)
}

func (u *karangTarunaUsecase) UpdateConfig(ctx context.Context, tenantID, periodID uuid.UUID, allowedRoles, allowedSections []string) error {
	if tenantID == uuid.Nil || periodID == uuid.Nil {
		return errors.New("tenant_id and period_id are required")
	}
	cfg := &domain.KarangTarunaConfig{
		PeriodID:        periodID,
		AllowedRoles:    allowedRoles,
		AllowedSections: allowedSections,
	}
	return u.repo.SaveConfig(ctx, cfg)
}

func (u *karangTarunaUsecase) AddMember(ctx context.Context, tenantID uuid.UUID, m *domain.KarangTarunaMember) error {
	if tenantID == uuid.Nil || m.PeriodID == uuid.Nil || m.ResidentID == uuid.Nil {
		return errors.New("period_id and resident_id are required")
	}
	if strings.TrimSpace(m.Role) == "" {
		m.Role = "anggota"
	}
	return u.repo.AddMember(ctx, m)
}

func (u *karangTarunaUsecase) ListMembers(ctx context.Context, tenantID, periodID uuid.UUID, section, role, status string) ([]*domain.KarangTarunaMember, error) {
	if tenantID == uuid.Nil || periodID == uuid.Nil {
		return nil, errors.New("tenant_id and period_id are required")
	}
	return u.repo.ListMembers(ctx, tenantID, periodID, section, role, status)
}

func (u *karangTarunaUsecase) UpdateMember(ctx context.Context, tenantID uuid.UUID, m *domain.KarangTarunaMember) error {
	if tenantID == uuid.Nil || m.ID == uuid.Nil || m.PeriodID == uuid.Nil {
		return errors.New("member_id and period_id are required")
	}
	return u.repo.UpdateMember(ctx, m)
}

func (u *karangTarunaUsecase) DeleteMember(ctx context.Context, tenantID, id uuid.UUID) error {
	if tenantID == uuid.Nil || id == uuid.Nil {
		return errors.New("tenant_id and id are required")
	}
	return u.repo.DeleteMember(ctx, tenantID, id)
}
