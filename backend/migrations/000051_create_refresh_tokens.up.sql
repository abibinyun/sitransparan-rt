-- Migration: 000051_create_refresh_tokens.up.sql
-- Tabel refresh_tokens pada skema public untuk autentikasi multi-tenant dengan rotasi dan revocation

CREATE TABLE IF NOT EXISTS public.refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON public.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON public.refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON public.refresh_tokens(expires_at);
