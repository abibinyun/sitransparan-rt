-- Migration: 000048_add_operator_role.up.sql
-- Menambahkan role 'operator' untuk staf/petugas operasional RT (input data tanpa hak destruktif)

INSERT INTO public.roles (id, name)
VALUES ('00000000-0000-0000-0000-000000000004', 'operator')
ON CONFLICT (name) DO NOTHING;
