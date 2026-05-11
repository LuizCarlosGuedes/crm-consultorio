-- Adiciona coluna email na tabela leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS email TEXT DEFAULT NULL;
