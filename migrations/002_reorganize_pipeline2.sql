-- =============================================
-- CRM Dr. Luiz Guedes — Migração 002
-- Reorganização do Pipeline 2
-- Execute no SQL Editor do Supabase Dashboard
-- =============================================

-- Migra leads com etapas removidas para equivalentes válidos
UPDATE public.leads
  SET etapa_atual = 'Compareceu',
      data_atualizacao = NOW()
  WHERE pipeline_id = 2
    AND etapa_atual = 'Retorno Solicitado';

UPDATE public.leads
  SET etapa_atual = 'Retorno Agendado',
      data_atualizacao = NOW()
  WHERE pipeline_id = 2
    AND etapa_atual = 'Agendado P2';

-- Registra a migração no histórico de movimentações
INSERT INTO public.historico_movimentacoes (lead_id, etapa_origem, etapa_destino, motivo, movido_por)
SELECT id, 'Retorno Solicitado', 'Compareceu', 'Migração 002: etapa removida do Pipeline 2', 'humano'
  FROM public.leads
  WHERE pipeline_id = 2
    AND etapa_atual = 'Compareceu'
    AND data_atualizacao >= NOW() - INTERVAL '1 minute';

INSERT INTO public.historico_movimentacoes (lead_id, etapa_origem, etapa_destino, motivo, movido_por)
SELECT id, 'Agendado P2', 'Retorno Agendado', 'Migração 002: etapa removida do Pipeline 2', 'humano'
  FROM public.leads
  WHERE pipeline_id = 2
    AND etapa_atual = 'Retorno Agendado'
    AND data_atualizacao >= NOW() - INTERVAL '1 minute';
