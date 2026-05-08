-- =============================================
-- CRM Dr. Luiz Guedes — Migração 001
-- Execute no SQL Editor do Supabase Dashboard
-- =============================================

-- Expandir tabela leads para Pipeline 1
ALTER TABLE leads ADD COLUMN IF NOT EXISTS pipeline_id INTEGER DEFAULT 1;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_nascimento DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sexo TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS estado_civil TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS rg TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS numero TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS complemento TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bairro TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS estado TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS cidade TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS profissao TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS foi_indicacao BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS como_conheceu TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS total_investido NUMERIC DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS numero_consultas INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS followup_tentativas INTEGER DEFAULT 0;

-- Tabela financeiro
CREATE TABLE IF NOT EXISTS financeiro (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  tipo TEXT,
  descricao TEXT,
  valor NUMERIC,
  data_registro TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela conteudo_nutricao
CREATE TABLE IF NOT EXISTS conteudo_nutricao (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT,
  conteudo TEXT,
  tags TEXT[] DEFAULT '{}',
  semana INTEGER DEFAULT 1,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Desativar RLS
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE historico_movimentacoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE pendencias DISABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro DISABLE ROW LEVEL SECURITY;
ALTER TABLE conteudo_nutricao DISABLE ROW LEVEL SECURITY;

-- Grants
GRANT ALL ON financeiro TO anon;
GRANT ALL ON conteudo_nutricao TO anon;
