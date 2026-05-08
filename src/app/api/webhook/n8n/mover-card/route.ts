import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { calcSLAVencimento } from '@/lib/utils';
import { TODAS_ETAPAS } from '@/lib/constants';

function autenticar(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.replace('Bearer ', '').trim();
  return token === (process.env.WEBHOOK_SECRET_TOKEN ?? '');
}

export async function POST(req: NextRequest) {
  if (!autenticar(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const supabase = createServerClient();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { card_id, etapa_destino, motivo, pipeline_id } = body;

  if (!card_id || !etapa_destino) {
    return NextResponse.json({ error: 'card_id e etapa_destino são obrigatórios' }, { status: 400 });
  }

  const pid = pipeline_id ? Number(pipeline_id) : undefined;
  const etapasDoContexto = pid ? TODAS_ETAPAS.filter(e => e.pipeline === pid) : TODAS_ETAPAS;
  const etapaValida = etapasDoContexto.some(e => e.id === String(etapa_destino));

  if (!etapaValida) {
    return NextResponse.json({
      error: 'etapa_destino inválida',
      etapas_validas: etapasDoContexto.map(e => e.id),
    }, { status: 400 });
  }

  const { data: current, error: fetchError } = await supabase
    .from('leads')
    .select('etapa_atual, pipeline_id')
    .eq('id', String(card_id))
    .single();

  if (fetchError) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });

  const slaVencimento = calcSLAVencimento(String(etapa_destino));

  const updatePayload: Record<string, unknown> = {
    etapa_atual:    String(etapa_destino),
    movido_por_ia:  true,
    sla_vencimento: slaVencimento.toISOString(),
  };

  if (pid) updatePayload.pipeline_id = pid;

  const { data, error } = await supabase
    .from('leads')
    .update(updatePayload)
    .eq('id', String(card_id))
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('historico_movimentacoes').insert({
    lead_id:       String(card_id),
    etapa_origem:  current.etapa_atual,
    etapa_destino: String(etapa_destino),
    motivo:        String(motivo ?? 'Movido pelo N8N'),
    movido_por:    'n8n',
  });

  return NextResponse.json({ success: true, lead: data });
}
