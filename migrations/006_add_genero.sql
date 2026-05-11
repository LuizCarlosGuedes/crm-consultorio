-- Adiciona coluna genero (espelho de sexo) para compatibilidade com N8N
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS genero TEXT DEFAULT NULL;
