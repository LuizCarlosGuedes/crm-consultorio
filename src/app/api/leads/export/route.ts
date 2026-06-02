import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

// Colunas exportadas, na ordem, com cabeçalho amigável.
const COLUNAS: [string, string][] = [
  ['nome', 'Nome'],
  ['telefone', 'Telefone'],
  ['etapa_atual', 'Etapa'],
  ['pipeline_id', 'Pipeline'],
  ['origem', 'Origem'],
  ['como_conheceu', 'Como conheceu'],
  ['procedimento', 'Procedimento'],
  ['valor_consulta', 'Valor'],
  ['prioridade', 'Prioridade'],
  ['tags', 'Tags'],
  ['profissao', 'Profissão'],
  ['email', 'E-mail'],
  ['cpf', 'CPF'],
  ['rg', 'RG'],
  ['data_nascimento', 'Nascimento'],
  ['idade', 'Idade'],
  ['sexo', 'Sexo'],
  ['estado_civil', 'Estado civil'],
  ['endereco', 'Endereço'],
  ['numero', 'Número'],
  ['complemento', 'Complemento'],
  ['bairro', 'Bairro'],
  ['cidade', 'Cidade'],
  ['estado', 'Estado'],
  ['cep', 'CEP'],
  ['foi_indicacao', 'Indicação'],
  ['nota', 'Nota'],
  ['chatwoot_url', 'Chatwoot'],
  ['data_entrada', 'Entrada'],
  ['data_atualizacao', 'Atualização'],
];

// Protege o endpoint: token via ?token= ou header Authorization: Bearer.
function autorizado(req: NextRequest): boolean {
  const { searchParams } = new URL(req.url);
  const tokenQuery = searchParams.get('token') ?? '';
  const auth = req.headers.get('authorization') ?? '';
  const tokenHeader = auth.replace('Bearer ', '').trim();
  const esperado = process.env.WEBHOOK_SECRET_TOKEN ?? '';
  return esperado !== '' && (tokenQuery === esperado || tokenHeader === esperado);
}

// Formata uma célula para CSV (escapa aspas/;/quebras; junta arrays; booleano -> Sim/Não).
function celula(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';
  let s = Array.isArray(valor) ? valor.join(', ') : String(valor);
  if (/[";\n\r]/.test(s)) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) {
    return NextResponse.json(
      { error: 'Não autorizado. Use ?token=SEU_TOKEN na URL.' },
      { status: 401 },
    );
  }

  const supabase = createServerClient();
  const { searchParams } = new URL(req.url);
  const pipelineId = searchParams.get('pipeline_id');

  let query = supabase
    .from('leads')
    .select('*')
    .order('data_entrada', { ascending: false });

  if (pipelineId) {
    query = query.eq('pipeline_id', Number(pipelineId));
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const linhas: string[] = [];
  // Cabeçalho
  linhas.push(COLUNAS.map(([, titulo]) => celula(titulo)).join(';'));
  // Dados
  for (const lead of data ?? []) {
    const reg = lead as Record<string, unknown>;
    linhas.push(COLUNAS.map(([campo]) => celula(reg[campo])).join(';'));
  }

  // Prefixo ﻿ (BOM UTF-8) faz o Excel pt-BR abrir os acentos certos.
  // Delimitador ';' é o padrão de CSV do Excel em português.
  const csv = '﻿' + linhas.join('\r\n');
  const hoje = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="leads-${hoje}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
