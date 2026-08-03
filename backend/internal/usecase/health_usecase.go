package usecase

import "backend/internal/domain"

type HealthUsecase interface {
	Check() domain.Health
}

type healthUsecase struct{}

func NewHealthUsecase() HealthUsecase {
	return &healthUsecase{}
}

func (u *healthUsecase) Check() domain.Health {
	return domain.Health{Status: "OK"}
}
