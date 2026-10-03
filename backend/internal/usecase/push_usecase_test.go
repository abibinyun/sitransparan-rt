package usecase_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"backend/internal/domain"
	"backend/internal/usecase"
	"backend/pkg/config"
)

type mockPushRepo struct {
	subs []*domain.PushSubscription
}

func newMockPushRepo() *mockPushRepo {
	return &mockPushRepo{}
}

func (m *mockPushRepo) Upsert(ctx context.Context, sub *domain.PushSubscription) error {
	m.subs = append(m.subs, sub)
	return nil
}

func (m *mockPushRepo) Delete(ctx context.Context, endpoint string, userID uuid.UUID) error {
	var filtered []*domain.PushSubscription
	for _, s := range m.subs {
		if s.Endpoint != endpoint {
			filtered = append(filtered, s)
		}
	}
	m.subs = filtered
	return nil
}

func (m *mockPushRepo) DeleteByEndpoint(ctx context.Context, endpoint string) error {
	return m.Delete(ctx, endpoint, uuid.Nil)
}

func (m *mockPushRepo) ListByUser(ctx context.Context, userID uuid.UUID) ([]*domain.PushSubscription, error) {
	return m.subs, nil
}

func (m *mockPushRepo) ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]*domain.PushSubscription, error) {
	var list []*domain.PushSubscription
	for _, s := range m.subs {
		if s.TenantID != nil && *s.TenantID == tenantID {
			list = append(list, s)
		}
	}
	return list, nil
}

func (m *mockPushRepo) CountReactionsGiven(ctx context.Context, userID uuid.UUID) (int64, error) {
	return 5, nil
}

func (m *mockPushRepo) CountVotesCast(ctx context.Context, userID uuid.UUID) (int64, error) {
	return 2, nil
}

func TestPushUsecase_SubscriptionLifecycle(t *testing.T) {
	repo := newMockPushRepo()
	cfg := &config.Config{
		VAPIDPublicKey:  "mock-vapid-public-key",
		VAPIDPrivateKey: "mock-vapid-private-key",
		VAPIDSubject:    "mailto:test@test.local",
	}
	uc := usecase.NewPushUsecase(repo, cfg)
	ctx := context.Background()
	tenantID := uuid.New()
	userID := uuid.New()

	// 1. Get VAPID config
	pubKey, enabled := uc.Config(ctx)
	if !enabled || pubKey != "mock-vapid-public-key" {
		t.Errorf("expected enabled with public key, got %s, %v", pubKey, enabled)
	}

	// 2. Subscribe
	err := uc.Subscribe(ctx, &domain.PushSubscription{
		ID:       uuid.New(),
		TenantID: &tenantID,
		UserID:   &userID,
		Endpoint: "https://fcm.googleapis.com/fcm/send/token123",
		P256DH:   "mock-p256dh",
		Auth:     "mock-auth",
	})
	if err != nil {
		t.Fatalf("Subscribe failed: %v", err)
	}

	subs, err := repo.ListByTenant(ctx, tenantID)
	if err != nil || len(subs) != 1 {
		t.Fatalf("expected 1 subscription, got %d", len(subs))
	}

	// 3. Unsubscribe
	err = uc.Unsubscribe(ctx, "https://fcm.googleapis.com/fcm/send/token123", userID)
	if err != nil {
		t.Fatalf("Unsubscribe failed: %v", err)
	}

	subs, _ = repo.ListByTenant(ctx, tenantID)
	if len(subs) != 0 {
		t.Errorf("expected 0 subscriptions after unsubscribe, got %d", len(subs))
	}
}
