package http

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"backend/internal/domain"
	"github.com/google/uuid"
)

type mockPushUsecase struct {
	subscribed *domain.PushSubscription
}

func (m *mockPushUsecase) Subscribe(ctx context.Context, sub *domain.PushSubscription) error {
	m.subscribed = sub
	return nil
}
func (m *mockPushUsecase) Unsubscribe(ctx context.Context, endpoint string, userID uuid.UUID) error {
	return nil
}
func (m *mockPushUsecase) Config(ctx context.Context) (string, bool) {
	return "test_vapid_key", true
}
func (m *mockPushUsecase) BroadcastTenant(ctx context.Context, tenantID uuid.UUID, title, body, url string) error {
	return nil
}
func (m *mockPushUsecase) Badge(ctx context.Context, userID uuid.UUID) (*domain.ParticipationBadge, error) {
	return &domain.ParticipationBadge{Level: "Warga Baru"}, nil
}

func TestPushHandler_PublicSubscribe(t *testing.T) {
	mockUC := &mockPushUsecase{}
	h := NewPushHandler(mockUC, nil)

	mux := http.NewServeMux()
	passthrough := func(next http.Handler) http.Handler { return next }
	h.RegisterRoutes(mux, passthrough, passthrough, passthrough)

	body, _ := json.Marshal(map[string]string{
		"endpoint":    "https://example.com/push/sub1",
		"keys_p256dh": "key_p256dh",
		"keys_auth":   "key_auth",
	})
	req := httptest.NewRequest("POST", "/api/v1/push/subscribe", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	mux.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created, got %d: %s", w.Code, w.Body.String())
	}
	if mockUC.subscribed == nil {
		t.Fatalf("expected subscribe to be called")
	}
	if mockUC.subscribed.Endpoint != "https://example.com/push/sub1" {
		t.Fatalf("expected endpoint https://example.com/push/sub1, got %s", mockUC.subscribed.Endpoint)
	}
}
