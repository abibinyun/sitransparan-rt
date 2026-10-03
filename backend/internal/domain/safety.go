package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type EmergencyAlert struct {
	ID           uuid.UUID  `json:"id"`
	UserID       uuid.UUID  `json:"user_id"`
	HouseID      *uuid.UUID `json:"house_id,omitempty"`
	ReporterName string     `json:"reporter_name"`
	HouseNumber  *string    `json:"house_number,omitempty"`
	AlertType    string     `json:"alert_type"` // medical, fire, crime, other
	Description  *string    `json:"description,omitempty"`
	Status       string     `json:"status"` // active, resolved
	ResolvedBy   *uuid.UUID `json:"resolved_by,omitempty"`
	ResolvedAt   *time.Time `json:"resolved_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
}

type HouseVacancy struct {
	ID               uuid.UUID  `json:"id"`
	HouseID          uuid.UUID  `json:"house_id"`
	UserID           uuid.UUID  `json:"user_id"`
	StartDate        string     `json:"start_date"` // YYYY-MM-DD
	EndDate          string     `json:"end_date"`   // YYYY-MM-DD
	EmergencyContact string     `json:"emergency_contact"`
	Notes            *string    `json:"notes,omitempty"`
	Status           string     `json:"status"` // active, completed
	CreatedAt        time.Time  `json:"created_at"`
}

type SafetyRepository interface {
	// Emergency alerts
	CreateAlert(ctx context.Context, a *EmergencyAlert) error
	GetAlertByID(ctx context.Context, id uuid.UUID) (*EmergencyAlert, error)
	ListActiveAlerts(ctx context.Context) ([]*EmergencyAlert, error)
	ResolveAlert(ctx context.Context, id, resolverUserID uuid.UUID) error

	// House vacancies (confidential)
	CreateVacancy(ctx context.Context, v *HouseVacancy) error
	ListVacancies(ctx context.Context, onlyActive bool) ([]*HouseVacancy, error)
	ListVacanciesByUser(ctx context.Context, userID uuid.UUID) ([]*HouseVacancy, error)
}
