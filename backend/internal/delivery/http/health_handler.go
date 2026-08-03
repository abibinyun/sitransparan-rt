package http

import (
	"encoding/json"
	"net/http"

	"backend/internal/usecase"
)

type HealthHandler struct {
	usecase usecase.HealthUsecase
}

func NewHealthHandler(u usecase.HealthUsecase) *HealthHandler {
	return &HealthHandler{usecase: u}
}

func (h *HealthHandler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(h.usecase.Check())
}
