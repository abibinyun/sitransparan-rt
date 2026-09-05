-- Migration 000028: Add role_id to users table for global accounts and remove superadmin tenant_users mapping
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;

-- Set global role for superadmin accounts
UPDATE public.users
SET role_id = (SELECT id FROM public.roles WHERE name = 'superadmin')
WHERE email = 'abi@gmail.com' OR id IN (
    SELECT user_id FROM public.tenant_users WHERE role_id = (SELECT id FROM public.roles WHERE name = 'superadmin')
);

-- Remove leftover tenant_users mapping for superadmin users
DELETE FROM public.tenant_users WHERE role_id IN (SELECT id FROM public.roles WHERE name = 'superadmin');
