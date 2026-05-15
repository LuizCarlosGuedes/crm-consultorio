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

  const { nome, telefone, nota } = body;

  if (!nome || !telefone) {
    return NextResponse.json({ error: 'nome e telefone são obrigatórios' }, { status: 400 });
  }

  const slaVencimento = calcSLAVencimento('Reativação');

  const { data: existente } = await supabase
    .from('leads')
    .select('*')
    .eq('telefone', String(telefone))
    .maybeSingle();

  let lead: Record<string, unknown>;
  let etapaOrigem: string | null = null;
  let acao: 'atualizado' | 'criado';

  if (existente) {
    etapaOrigem = existente.etapa_atual ?? null;

    const updates: Record<string, unknown> = {
      etapa_atual:    'Reativação',
      pipeline_id:    1,
      movido_por_ia:  true,
      sla_vencimento: slaVencimento.toISOString(),
    };
    if (nota !== undefined) updates.nota = String(nota);

    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', existente.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    lead = data;
    acao = 'atualizado';
  } else {
    const { data, error } = await supabase
      .from('leads')
      .insert({
        nome:           String(nome),
        telefone:       String(telefone),
        origem:         'WhatsApp',
        procedimento:   '',
        prioridade:     'normal',
        nota:           nota !== undefined ? String(nota) : '',
        valor_consulta: 0,
        chatwoot_url:   '',
        etapa_atual:    'Reativação',
        pipeline_id:    1,
        movido_por_ia:  true,
        sla_vencimento: slaVencimento.toISOString(),
        tags:           [],
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    lead = data;
    acao = 'criado';
  }

  await supabase.from('historico_movimentacoes').insert({
    lead_id:       lead.id,
    etapa_origem:  etapaOrigem,
    etapa_destino: 'Reativação',
    motivo:        `Paciente ${acao === 'criado' ? 'adicionado ao' : 'movido para o'} Pipeline 1 via N8N (reativação)`,
    movido_por:    'n8n',
  });

  return NextResponse.json({ success: true, lead, acao, pipeline: 1 }, { status: 200 });
}
