package usecase

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"backend/internal/domain"
)

type SafetyUsecase interface {
	TriggerPanic(ctx context.Context, tenantID, userID uuid.UUID, houseID *uuid.UUID, reporterName, houseNumber, alertType, description string) (*domain.EmergencyAlert, error)
	ResolveEmergency(ctx context.Context, tenantID, alertID, adminUserID uuid.UUID) error
	ListActiveEmergencies(ctx context.Context, tenantID uuid.UUID) ([]*domain.EmergencyAlert, error)

	ReportHouseVacancy(ctx context.Context, tenantID, userID, houseID uuid.UUID, startDate, endDate, emergencyContact, notes string) (*domain.HouseVacancy, error)
	ListHouseVacancies(ctx context.Context, tenantID, requestingUserID uuid.UUID, requestingRole domain.RoleName) ([]*domain.HouseVacancy, error)
}

type safetyUsecase struct {
	repo     domain.SafetyRepository
	notifUC  NotificationUsecase
}

func NewSafetyUsecase(repo domain.SafetyRepository, notifUC NotificationUsecase) SafetyUsecase {
	return &safetyUsecase{
		repo:    repo,
		notifUC: notifUC,
	}
}

func (u *safetyUsecase) TriggerPanic(ctx context.Context, tenantID, userID uuid.UUID, houseID *uuid.UUID, reporterName, houseNumber, alertType, description string) (*domain.EmergencyAlert, error) {
	if strings.TrimSpace(alertType) == "" {
		alertType = "other"
	}
	if strings.TrimSpace(reporterName) == "" {
		reporterName = "Warga"
	}

	alert := &domain.EmergencyAlert{
		ID:           uuid.New(),
		UserID:       userID,
		HouseID:      houseID,
		ReporterName: reporterName,
		HouseNumber:  &houseNumber,
		AlertType:    alertType,
		Description:  &description,
		Status:       "active",
		CreatedAt:    time.Now(),
	}

	if err := u.repo.CreateAlert(ctx, alert); err != nil {
		return nil, err
	}

	// Dispatch Notifikasi Darurat ke Seluruh Warga & Petugas Tenant
	if u.notifUC != nil {
		title := fmt.Sprintf("🚨 ALARM DARURAT: %s (Rumah %s)", strings.ToUpper(alertType), houseNumber)
		body := fmt.Sprintf("%s memicu alarm darurat: %s. Segera hubungi atau menuju lokasi!", reporterName, description)
		_ = u.notifUC.Dispatch(ctx, tenantID, nil, title, body, "emergency", "/admin", map[string]interface{}{
			"alert_id": alert.ID,
			"house_id": houseID,
		})
	}

	return alert, nil
}

func (u *safetyUsecase) ResolveEmergency(ctx context.Context, tenantID, alertID, adminUserID uuid.UUID) error {
	return u.repo.ResolveAlert(ctx, alertID, adminUserID)
}

func (u *safetyUsecase) ListActiveEmergencies(ctx context.Context, tenantID uuid.UUID) ([]*domain.EmergencyAlert, error) {
	return u.repo.ListActiveAlerts(ctx)
}

func (u *safetyUsecase) ReportHouseVacancy(ctx context.Context, tenantID, userID, houseID uuid.UUID, startDate, endDate, emergencyContact, notes string) (*domain.HouseVacancy, error) {
	if emergencyContact == "" {
		return nil, errors.New("kontak darurat wajib diisi")
	}

	v := &domain.HouseVacancy{
		ID:               uuid.New(),
		HouseID:          houseID,
		UserID:           userID,
		StartDate:        startDate,
		EndDate:          endDate,
		EmergencyContact: emergencyContact,
		Notes:            &notes,
		Status:           "active",
		CreatedAt:        time.Now(),
	}

	if err := u.repo.CreateVacancy(ctx, v); err != nil {
		return nil, err
	}

	return v, nil
}

func (u *safetyUsecase) ListHouseVacancies(ctx context.Context, tenantID, requestingUserID uuid.UUID, requestingRole domain.RoleName) ([]*domain.HouseVacancy, error) {
	// PENEGAKAN KERAHASIAAN (Strict Confidentiality):
	// Hanya Admin RT, Operator, atau Superadmin yang boleh melihat seluruh daftar rumah kosong.
	// Warga biasa hanya boleh melihat riwayat laporan rumah miliknya sendiri!
	if requestingRole == domain.RoleSuperAdmin || requestingRole == domain.RoleAdminRT || requestingRole == domain.RoleOperator {
		return u.repo.ListVacancies(ctx, true)
	}

	// Jika resident biasa, tolak akses daftar global
	return nil, errors.New("forbidden: house vacancy list is confidential and restricted to security team and RT admins")
}
