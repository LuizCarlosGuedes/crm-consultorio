-- =============================================
-- CRM Dr. Luiz Guedes — Migração 003
-- Adiciona campo ultima_mensagem na tabela leads
-- Execute no SQL Editor do Supabase Dashboard
-- =============================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS ultima_mensagem TEXT DEFAULT NULL;
