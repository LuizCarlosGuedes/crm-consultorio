-- ============================================================
-- CRM Consultório Médico - Schema Supabase
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================================

-- Habilita extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABELA: leads
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leads (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome             TEXT NOT NULL,
  telefone         TEXT NOT NULL,
  origem           TEXT NOT NULL DEFAULT 'WhatsApp',
  procedimento     TEXT NOT NULL DEFAULT '',
  prioridade       TEXT NOT NULL DEFAULT 'normal'
                   CHECK (prioridade IN ('urgente', 'alta', 'normal', 'frio')),
  etapa_atual      TEXT NOT NULL DEFAULT 'Novo Lead',
  valor_consulta   NUMERIC(10, 2) DEFAULT 0,
  nota             TEXT DEFAULT '',
  chatwoot_url     TEXT DEFAULT '',
  movido_por_ia    BOOLEAN DEFAULT FALSE,
  data_entrada     TIMESTAMPTZ DEFAULT NOW(),
  data_atualizacao TIMESTAMPTZ DEFAULT NOW(),
  sla_vencimento   TIMESTAMPTZ
);

-- ============================================================
-- TABELA: historico_movimentacoes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.historico_movimentacoes (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id        UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  etapa_origem   TEXT,
  etapa_destino  TEXT NOT NULL,
  motivo         TEXT DEFAULT '',
  movido_por     TEXT NOT NULL DEFAULT 'humano'
                 CHECK (movido_por IN ('humano', 'n8n')),
  criado_em      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: notas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notas (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id    UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  conteudo   TEXT NOT NULL,
  autor      TEXT NOT NULL DEFAULT 'Sistema',
  criado_em  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_leads_etapa_atual    ON public.leads(etapa_atual);
CREATE INDEX IF NOT EXISTS idx_leads_prioridade     ON public.leads(prioridade);
CREATE INDEX IF NOT EXISTS idx_leads_data_entrada   ON public.leads(data_entrada DESC);
CREATE INDEX IF NOT EXISTS idx_leads_sla            ON public.leads(sla_vencimento);
CREATE INDEX IF NOT EXISTS idx_historico_lead_id    ON public.historico_movimentacoes(lead_id);
CREATE INDEX IF NOT EXISTS idx_historico_criado_em  ON public.historico_movimentacoes(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_notas_lead_id        ON public.notas(lead_id);

-- ============================================================
-- TRIGGER: atualiza data_atualizacao automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_data_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_atualizacao = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_data_atualizacao ON public.leads;
CREATE TRIGGER trigger_update_data_atualizacao
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_data_atualizacao();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.leads                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas                   ENABLE ROW LEVEL SECURITY;

-- Políticas: acesso total via service role (usado pelo backend)
CREATE POLICY "Acesso total service role - leads" ON public.leads
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Acesso total service role - historico" ON public.historico_movimentacoes
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Acesso total service role - notas" ON public.notas
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- DADOS DE EXEMPLO para testar o sistema
-- ============================================================
INSERT INTO public.leads (nome, telefone, origem, procedimento, prioridade, etapa_atual, valor_consulta, nota, movido_por_ia, sla_vencimento) VALUES
  ('Maria Silva Santos',   '(11) 99999-0001', 'Instagram',  'Consulta Dermatológica',  'urgente', 'Novo Lead',       350.00,  'Interessada em tratamento para acne - enviou fotos', false, NOW() + INTERVAL '30 seconds'),
  ('João Pedro Santos',    '(11) 99999-0002', 'Google',     'Clareamento Dental',       'alta',    'Triagem IA',      800.00,  'Quer fazer procedimento este mês, orçamento aprovado', true,  NOW() + INTERVAL '8 minutes'),
  ('Ana Costa Ferreira',   '(11) 99999-0003', 'WhatsApp',   'Aplicação de Botox',       'normal',  'Qualificado',     1200.00, 'Já realizou procedimento anteriormente, cliente fiel', false, NOW() + INTERVAL '20 hours'),
  ('Pedro Oliveira Lima',  '(11) 99999-0004', 'Indicação',  'Consulta Cardiológica',    'alta',    'Agendado',        450.00,  'Indicado pelo Dr. Marcos, histórico de hipertensão', false, NOW() + INTERVAL '3 days'),
  ('Lucia Mendes Rocha',   '(11) 99999-0005', 'Instagram',  'Preenchimento Labial',     'frio',    'Pós Consulta',    600.00,  'Consulta realizada com sucesso, retorno em 30 dias', false, NOW() + INTERVAL '6 days'),
  ('Carlos Eduardo Neto',  '(11) 99999-0006', 'Google',     'Ortopedia - Joelho',       'urgente', 'No Show',         500.00,  'Não compareceu, tente reagendar urgentemente', false,NOW() - INTERVAL '5 minutes'),
  ('Fernanda Lima Costa',  '(11) 99999-0007', 'WhatsApp',   'Nutrição Funcional',       'normal',  'Follow-up',       280.00,  'Aguardando retorno para agendar segunda consulta', true,  NOW() + INTERVAL '2 days'),
  ('Roberto Alves Mota',   '(11) 99999-0008', 'Indicação',  'Dermatologia Estética',    'alta',    'Pago / Confirmado', 950.00, 'Pagamento confirmado, aguardando data da consulta', false, NOW() + INTERVAL '1 day'),
  ('Juliana Sousa Pinto',  '(11) 99999-0009', 'Instagram',  'Implante Capilar',         'normal',  'Recorrente',      2500.00, 'Paciente de longa data, sessão mensal programada', false, NOW() + INTERVAL '25 days'),
  ('Marcos Vitor Andrade', '(11) 99999-0010', 'Google',     'Consulta Psiquiátrica',    'frio',    'Perdido',         350.00,  'Sem resposta após 3 tentativas de contato', false, NOW() + INTERVAL '89 days')
ON CONFLICT DO NOTHING;

-- Adiciona histórico de exemplo para o primeiro lead
WITH primeiro_lead AS (SELECT id FROM public.leads WHERE telefone = '(11) 99999-0001' LIMIT 1)
INSERT INTO public.historico_movimentacoes (lead_id, etapa_origem, etapa_destino, motivo, movido_por)
SELECT id, NULL, 'Novo Lead', 'Lead criado via Instagram', 'n8n' FROM primeiro_lead
ON CONFLICT DO NOTHING;

WITH segundo_lead AS (SELECT id FROM public.leads WHERE telefone = '(11) 99999-0002' LIMIT 1)
INSERT INTO public.historico_movimentacoes (lead_id, etapa_origem, etapa_destino, motivo, movido_por)
SELECT id, 'Novo Lead', 'Triagem IA', 'IA identificou interesse qualificado', 'n8n' FROM segundo_lead
ON CONFLICT DO NOTHING;

-- Notas de exemplo
WITH terceiro_lead AS (SELECT id FROM public.leads WHERE telefone = '(11) 99999-0003' LIMIT 1)
INSERT INTO public.notas (lead_id, conteudo, autor)
SELECT id, 'Paciente relatou sensibilidade na área a ser tratada. Verificar contraindicações.', 'Dr. Amanda' FROM terceiro_lead
ON CONFLICT DO NOTHING;
