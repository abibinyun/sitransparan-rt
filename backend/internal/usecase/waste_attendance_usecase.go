package usecase

import (
	"context"
	"errors"
	"strings"

	"backend/internal/domain"
	"github.com/google/uuid"
)

type wasteAttendanceUsecase struct {
	repo domain.WasteAttendanceRepository
}

func NewWasteAttendanceUsecase(repo domain.WasteAttendanceRepository) domain.WasteAttendanceUsecase {
	return &wasteAttendanceUsecase{repo: repo}
}

func (u *wasteAttendanceUsecase) ListCollectors(ctx context.Context, tenantID uuid.UUID, onlyActive bool) ([]domain.WasteCollector, error) {
	return u.repo.ListCollectors(ctx, tenantID, onlyActive)
}

func (u *wasteAttendanceUsecase) CreateCollector(ctx context.Context, tenantID uuid.UUID, residentID *uuid.UUID, name, phone string) (*domain.WasteCollector, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("nama petugas tidak boleh kosong")
	}

	c := &domain.WasteCollector{
		TenantID:   tenantID,
		ResidentID: residentID,
		Name:       name,
		Phone:      strings.TrimSpace(phone),
		IsActive:   true,
	}

	if err := u.repo.CreateCollector(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

func (u *wasteAttendanceUsecase) UpdateCollector(ctx context.Context, tenantID, id uuid.UUID, residentID *uuid.UUID, name, phone string, isActive bool) (*domain.WasteCollector, error) {
	c, err := u.repo.GetCollectorByID(ctx, tenantID, id)
	if err != nil {
		return nil, errors.New("petugas tidak ditemukan")
	}

	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("nama petugas tidak boleh kosong")
	}

	c.ResidentID = residentID
	c.Name = name
	c.Phone = strings.TrimSpace(phone)
	c.IsActive = isActive

	if err := u.repo.UpdateCollector(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

func (u *wasteAttendanceUsecase) DeleteCollector(ctx context.Context, tenantID, id uuid.UUID) error {
	return u.repo.DeleteCollector(ctx, tenantID, id)
}

func (u *wasteAttendanceUsecase) ListAttendance(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]domain.WasteAttendance, int, error) {
	return u.repo.ListAttendance(ctx, tenantID, limit, offset)
}

func (u *wasteAttendanceUsecase) CreateAttendance(ctx context.Context, tenantID uuid.UUID, date string, collectorIDs []uuid.UUID, wagePerPerson float64, notes string, createdBy *uuid.UUID) (*domain.WasteAttendance, error) {
	date = strings.TrimSpace(date)
	if date == "" {
		return nil, errors.New("tanggal absensi wajib diisi")
	}

	if len(collectorIDs) == 0 {
		return nil, errors.New("minimal pilih 1 petugas sampah yang bertugas")
	}

	if wagePerPerson <= 0 {
		wagePerPerson = 5000 // Default 5rb per orang
	}

	totalWage := float64(len(collectorIDs)) * wagePerPerson

	var members []domain.WasteAttendanceMember
	for _, cid := range collectorIDs {
		members = append(members, domain.WasteAttendanceMember{
			CollectorID: cid,
			WageAmount:  wagePerPerson,
		})
	}

	att := &domain.WasteAttendance{
		TenantID:      tenantID,
		Date:          date,
		WagePerPerson: wagePerPerson,
		TotalWage:     totalWage,
		Notes:         strings.TrimSpace(notes),
		CreatedBy:     createdBy,
		Members:       members,
	}

	if err := u.repo.CreateAttendance(ctx, att); err != nil {
		return nil, err
	}

	return att, nil
}

func (u *wasteAttendanceUsecase) DeleteAttendance(ctx context.Context, tenantID, id uuid.UUID) error {
	return u.repo.DeleteAttendance(ctx, tenantID, id)
}
