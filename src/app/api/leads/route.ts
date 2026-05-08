import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { calcSLAVencimento } from '@/lib/utils';

export async function GET(req: NextRequest) {
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
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const body = await req.json();

  const {
    nome, telefone, origem, procedimento, prioridade,
    nota, valor_consulta, chatwoot_url, pipeline_id,
    tags, profissao, como_conheceu, foi_indicacao,
  } = body;

  if (!nome || !telefone) {
    return NextResponse.json({ error: 'nome e telefone são obrigatórios' }, { status: 400 });
  }

  const pid = Number(pipeline_id ?? 1);
  const etapaInicial = pid === 2 ? 'Retorno Solicitado' : 'Novo Lead';
  const slaVencimento = calcSLAVencimento(etapaInicial);

  const { data, error } = await supabase
    .from('leads')
    .insert({
      nome,
      telefone,
      origem:         origem        || 'WhatsApp',
      procedimento:   procedimento  || '',
      prioridade:     prioridade    || 'normal',
      nota:           nota          || '',
      valor_consulta: valor_consulta || 0,
      chatwoot_url:   chatwoot_url  || '',
      etapa_atual:    etapaInicial,
      pipeline_id:    pid,
      movido_por_ia:  false,
      sla_vencimento: slaVencimento.toISOString(),
      tags:           tags          || [],
      profissao:      profissao     || null,
      como_conheceu:  como_conheceu || null,
      foi_indicacao:  foi_indicacao ?? false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('historico_movimentacoes').insert({
    lead_id:       data.id,
    etapa_origem:  null,
    etapa_destino: etapaInicial,
    motivo:        'Lead criado manualmente',
    movido_por:    'humano',
  });

  return NextResponse.json(data, { status: 201 });
}
