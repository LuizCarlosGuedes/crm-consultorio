import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

function autenticar(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.replace('Bearer ', '').trim();
  return token === (process.env.WEBHOOK_SECRET_TOKEN ?? '');
}

export async function GET(req: NextRequest) {
  if (!autenticar(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const supabase = createServerClient();

  const { searchParams } = new URL(req.url);
  const etapa = searchParams.get('etapa');
  const pipelineId = searchParams.get('pipeline_id');

  let query = supabase
    .from('leads')
    .select('id, nome, telefone, origem, procedimento, prioridade, etapa_atual, pipeline_id, valor_consulta, nota, chatwoot_url, movido_por_ia, data_entrada, sla_vencimento, tags, total_investido')
    .order('data_entrada', { ascending: false });

  if (pipelineId) query = query.eq('pipeline_id', Number(pipelineId));
  if (etapa)      query = query.eq('etapa_atual', etapa);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const grouped: Record<string, typeof data> = {};
  for (const lead of data ?? []) {
    if (!grouped[lead.etapa_atual]) grouped[lead.etapa_atual] = [];
    grouped[lead.etapa_atual]!.push(lead);
  }

  return NextResponse.json({
    pipeline_id:  pipelineId ? Number(pipelineId) : 'todos',
    total:        data?.length ?? 0,
    por_etapa:    grouped,
    leads:        data,
  });
}
