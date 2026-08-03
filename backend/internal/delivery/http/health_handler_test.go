package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"backend/internal/domain"
)

type mockHealthUsecase struct{}

func (m *mockHealthUsecase) Check() domain.Health {
	return domain.Health{Status: "OK"}
}

func TestHealthCheck(t *testing.T) {
	handler := NewHealthHandler(&mockHealthUsecase{})
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()

	handler.HealthCheck(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	var res domain.Health
	if err := json.NewDecoder(rec.Body).Decode(&res); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if res.Status != "OK" {
		t.Errorf("expected status OK, got %s", res.Status)
	}
}
