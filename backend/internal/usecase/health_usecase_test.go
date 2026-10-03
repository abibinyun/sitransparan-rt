package usecase_test

import (
	"testing"

	"backend/internal/usecase"
)

func TestHealthUsecase(t *testing.T) {
	uc := usecase.NewHealthUsecase()
	health := uc.Check()
	if health.Status != "OK" {
		t.Errorf("expected status 'OK', got %s", health.Status)
	}
}
