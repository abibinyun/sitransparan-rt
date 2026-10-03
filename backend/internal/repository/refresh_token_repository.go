package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"backend/internal/domain"
)

type postgresRefreshTokenRepository struct {
	db *sql.DB
}

func NewRefreshTokenRepository(db *sql.DB) domain.RefreshTokenRepository {
	return &postgresRefreshTokenRepository{db: db}
}

func (r *postgresRefreshTokenRepository) Store(ctx context.Context, rt *domain.RefreshToken) error {
	query := `
		INSERT INTO public.refresh_tokens (id, user_id, token_hash, expires_at, revoked_at, ip_address, user_agent, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.db.ExecContext(ctx, query,
		rt.ID,
		rt.UserID,
		rt.TokenHash,
		rt.ExpiresAt,
		rt.RevokedAt,
		rt.IPAddress,
		rt.UserAgent,
		rt.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to store refresh token: %w", err)
	}
	return nil
}

func (r *postgresRefreshTokenRepository) GetByHash(ctx context.Context, tokenHash string) (*domain.RefreshToken, error) {
	query := `
		SELECT id, user_id, token_hash, expires_at, revoked_at, ip_address, user_agent, created_at
		FROM public.refresh_tokens
		WHERE token_hash = $1
	`
	var rt domain.RefreshToken
	err := r.db.QueryRowContext(ctx, query, tokenHash).Scan(
		&rt.ID,
		&rt.UserID,
		&rt.TokenHash,
		&rt.ExpiresAt,
		&rt.RevokedAt,
		&rt.IPAddress,
		&rt.UserAgent,
		&rt.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get refresh token by hash: %w", err)
	}
	return &rt, nil
}

func (r *postgresRefreshTokenRepository) Revoke(ctx context.Context, tokenHash string) error {
	query := `
		UPDATE public.refresh_tokens
		SET revoked_at = NOW()
		WHERE token_hash = $1 AND revoked_at IS NULL
	`
	_, err := r.db.ExecContext(ctx, query, tokenHash)
	if err != nil {
		return fmt.Errorf("failed to revoke refresh token: %w", err)
	}
	return nil
}

func (r *postgresRefreshTokenRepository) RevokeAllByUserID(ctx context.Context, userID uuid.UUID) error {
	query := `
		UPDATE public.refresh_tokens
		SET revoked_at = NOW()
		WHERE user_id = $1 AND revoked_at IS NULL
	`
	_, err := r.db.ExecContext(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to revoke all refresh tokens for user: %w", err)
	}
	return nil
}

func (r *postgresRefreshTokenRepository) DeleteExpired(ctx context.Context) error {
	query := `
		DELETE FROM public.refresh_tokens
		WHERE expires_at < NOW() - INTERVAL '30 days'
	`
	_, err := r.db.ExecContext(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to delete expired refresh tokens: %w", err)
	}
	return nil
}
