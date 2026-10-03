package usecase_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"backend/internal/domain"
	"backend/internal/usecase"
)

type mockSafetyRepo struct {
	alerts    map[uuid.UUID]*domain.EmergencyAlert
	vacancies []*domain.HouseVacancy
}

func newMockSafetyRepo() *mockSafetyRepo {
	return &mockSafetyRepo{
		alerts: make(map[uuid.UUID]*domain.EmergencyAlert),
	}
}

func (m *mockSafetyRepo) CreateAlert(ctx context.Context, a *domain.EmergencyAlert) error {
	m.alerts[a.ID] = a
	return nil
}
func (m *mockSafetyRepo) GetAlertByID(ctx context.Context, id uuid.UUID) (*domain.EmergencyAlert, error) {
	return m.alerts[id], nil
}
func (m *mockSafetyRepo) ListActiveAlerts(ctx context.Context) ([]*domain.EmergencyAlert, error) {
	var list []*domain.EmergencyAlert
	for _, a := range m.alerts {
		if a.Status == "active" {
			list = append(list, a)
		}
	}
	return list, nil
}
func (m *mockSafetyRepo) ResolveAlert(ctx context.Context, id, resolverUserID uuid.UUID) error {
	if a, ok := m.alerts[id]; ok {
		now := time.Now()
		a.Status = "resolved"
		a.ResolvedBy = &resolverUserID
		a.ResolvedAt = &now
	}
	return nil
}
func (m *mockSafetyRepo) CreateVacancy(ctx context.Context, v *domain.HouseVacancy) error {
	m.vacancies = append(m.vacancies, v)
	return nil
}
func (m *mockSafetyRepo) ListVacancies(ctx context.Context, onlyActive bool) ([]*domain.HouseVacancy, error) {
	return m.vacancies, nil
}
func (m *mockSafetyRepo) ListVacanciesByUser(ctx context.Context, userID uuid.UUID) ([]*domain.HouseVacancy, error) {
	var list []*domain.HouseVacancy
	for _, v := range m.vacancies {
		if v.UserID == userID {
			list = append(list, v)
		}
	}
	return list, nil
}

func TestSafetyUsecase_ConfidentialityAndPanic(t *testing.T) {
	repo := newMockSafetyRepo()
	notifRepo := newMockNotificationRepo()
	notifUC := usecase.NewNotificationUsecase(notifRepo, nil)
	uc := usecase.NewSafetyUsecase(repo, notifUC)
	ctx := context.Background()

	tenantID := uuid.New()
	residentUserID := uuid.New()
	adminUserID := uuid.New()
	houseID := uuid.New()

	// 1. Warga lapor rumah kosong
	vacancy, err := uc.ReportHouseVacancy(ctx, tenantID, residentUserID, houseID, "2026-12-20", "2027-01-05", "0812345678", "Lampu teras nyala otomatis")
	if err != nil {
		t.Fatalf("ReportHouseVacancy failed: %v", err)
	}
	if vacancy == nil || vacancy.Status != "active" {
		t.Fatal("expected active house vacancy report")
	}

	// 2. Warga biasa mencoba melihat seluruh daftar rumah kosong -> HARUS DITOLAK (Confidentiality)
	_, err = uc.ListHouseVacancies(ctx, tenantID, residentUserID, domain.RoleResident)
	if err == nil {
		t.Fatal("expected error when resident tries to view all house vacancies")
	}

	// 3. Admin RT melihat seluruh daftar rumah kosong -> HARUS LOLOS
	list, err := uc.ListHouseVacancies(ctx, tenantID, adminUserID, domain.RoleAdminRT)
	if err != nil || len(list) != 1 {
		t.Fatalf("expected admin to view house vacancies, got total: %d, err: %v", len(list), err)
	}

	// 4. Panic Button 1-Tap Trigger
	alert, err := uc.TriggerPanic(ctx, tenantID, residentUserID, &houseID, "Budi", "B-04", "medical", "Butuh ambulans segera")
	if err != nil {
		t.Fatalf("TriggerPanic failed: %v", err)
	}
	if alert.Status != "active" || alert.AlertType != "medical" {
		t.Errorf("expected active medical alert, got %v", alert)
	}

	// 5. Cek apakah notifikasi emergency ter-dispatch
	notifCount, _ := notifRepo.GetUnreadCount(ctx, uuid.Nil)
	if notifCount < 1 {
		t.Errorf("expected emergency notification dispatched to all tenant users")
	}
}
