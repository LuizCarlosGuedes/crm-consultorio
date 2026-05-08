import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { calcSLAVencimento } from '@/lib/utils';

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

  const { nome, telefone, origem, procedimento, prioridade, nota, chatwoot_url, tags } = body;

  if (!nome || !telefone) {
    return NextResponse.json({ error: 'nome e telefone são obrigatórios' }, { status: 400 });
  }

  const slaVencimento = calcSLAVencimento('Retorno Solicitado');

  const { data, error } = await supabase
    .from('leads')
    .insert({
      nome:           String(nome),
      telefone:       String(telefone),
      origem:         String(origem       ?? 'WhatsApp'),
      procedimento:   String(procedimento ?? ''),
      prioridade:     String(prioridade   ?? 'normal'),
      nota:           String(nota         ?? ''),
      valor_consulta: 0,
      chatwoot_url:   String(chatwoot_url ?? ''),
      etapa_atual:    'Retorno Solicitado',
      pipeline_id:    2,
      movido_por_ia:  true,
      sla_vencimento: slaVencimento.toISOString(),
      tags:           Array.isArray(tags) ? tags : [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('historico_movimentacoes').insert({
    lead_id:       data.id,
    etapa_origem:  null,
    etapa_destino: 'Retorno Solicitado',
    motivo:        'Paciente adicionado ao Pipeline 2 via N8N',
    movido_por:    'n8n',
  });

  return NextResponse.json({ success: true, lead: data, pipeline: 2 }, { status: 201 });
}
