-- Migration 000028 down: Remove role_id column from users table
ALTER TABLE public.users DROP COLUMN IF EXISTS role_id;
