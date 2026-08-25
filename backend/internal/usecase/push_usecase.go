package usecase

import (
	"context"
	"encoding/json"
	"errors"
	"log"

	"backend/internal/domain"
	"backend/pkg/config"

	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/google/uuid"
)

type pushUsecase struct {
	repo domain.PushRepository
	cfg  *config.Config
}

func NewPushUsecase(repo domain.PushRepository, cfg *config.Config) domain.PushUsecase {
	return &pushUsecase{repo: repo, cfg: cfg}
}

func (u *pushUsecase) pushEnabled() bool {
	return u.cfg != nil && u.cfg.VAPIDPublicKey != "" && u.cfg.VAPIDPrivateKey != ""
}

func (u *pushUsecase) Subscribe(ctx context.Context, sub *domain.PushSubscription) error {
	if sub.Endpoint == "" || sub.P256DH == "" || sub.Auth == "" {
		return errors.New("subscription endpoint, keys, and auth are required")
	}
	return u.repo.Upsert(ctx, sub)
}

func (u *pushUsecase) Unsubscribe(ctx context.Context, endpoint string, userID uuid.UUID) error {
	return u.repo.Delete(ctx, endpoint, userID)
}

func (u *pushUsecase) Config(ctx context.Context) (string, bool) {
	return u.cfg.VAPIDPublicKey, u.pushEnabled()
}

// BroadcastTenant mengirim notifikasi ke semua langganan user tenant.
// Kegagalan pengiriman per-perangkat tidak menggagalkan keseluruhan;
// langganan yang sudah kedaluwarsa (404/410) dihapus.
func (u *pushUsecase) BroadcastTenant(ctx context.Context, tenantID uuid.UUID, title, body, url string) error {
	if !u.pushEnabled() {
		return nil // push disabled — no-op, bukan error
	}
	subs, err := u.repo.ListByTenant(ctx, tenantID)
	if err != nil {
		return err
	}
	payload, _ := json.Marshal(map[string]string{"title": title, "body": body, "url": url})

	for _, sub := range subs {
		s := &webpush.Subscription{Endpoint: sub.Endpoint, Keys: webpush.Keys{P256dh: sub.P256DH, Auth: sub.Auth}}
		resp, err := webpush.SendNotification([]byte(payload), s, &webpush.Options{
			VAPIDPrivateKey: u.cfg.VAPIDPrivateKey,
			Subscriber:      u.cfg.VAPIDSubject,
			TTL:             3600,
		})
		if err != nil {
			log.Printf("push: gagal kirim ke %s: %v", sub.Endpoint, err)
			continue
		}
		if resp.StatusCode == 404 || resp.StatusCode == 410 {
			_ = u.repo.DeleteByEndpoint(ctx, sub.Endpoint)
		}
		resp.Body.Close()
	}
	return nil
}

var badgeLevels = []struct {
	min   int64
	level string
}{
	{10, "Utusan Warga"},
	{5, "Warga Teladan"},
	{1, "Warga Aktif"},
	{0, "Warga Baru"},
}

func (u *pushUsecase) Badge(ctx context.Context, userID uuid.UUID) (*domain.ParticipationBadge, error) {
	reactions, err := u.repo.CountReactionsGiven(ctx, userID)
	if err != nil {
		return nil, err
	}
	votes, err := u.repo.CountVotesCast(ctx, userID)
	if err != nil {
		return nil, err
	}
	total := reactions + votes
	level := "Warga Baru"
	for _, b := range badgeLevels {
		if total >= b.min {
			level = b.level
			break
		}
	}
	return &domain.ParticipationBadge{
		ReactionsGiven: reactions,
		VotesCast:      votes,
		Total:          total,
		Level:          level,
	}, nil
}
