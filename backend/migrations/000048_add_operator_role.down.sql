-- Migration: 000048_add_operator_role.down.sql

DELETE FROM public.roles WHERE name = 'operator';
