-- Armazena idade em anos enviada pelo N8N (campo calculado externamente)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS idade INTEGER DEFAULT NULL;
