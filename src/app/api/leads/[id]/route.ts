import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { calcSLAVencimento } from '@/lib/utils';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerClient();
  const body = await req.json();

  const { data: current } = await supabase
    .from('leads')
    .select('etapa_atual')
    .eq('id', id)
    .single();

  const updatePayload: Record<string, unknown> = { ...body };
  delete updatePayload.movido_por;

  if (body.etapa_atual && body.etapa_atual !== current?.etapa_atual) {
    updatePayload.sla_vencimento = calcSLAVencimento(body.etapa_atual).toISOString();
    updatePayload.movido_por_ia  = body.movido_por === 'n8n';
  }

  const { data, error } = await supabase
    .from('leads')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.etapa_atual && body.etapa_atual !== current?.etapa_atual) {
    await supabase.from('historico_movimentacoes').insert({
      lead_id:       id,
      etapa_origem:  current?.etapa_atual ?? null,
      etapa_destino: body.etapa_atual,
      motivo:        body.motivo ?? '',
      movido_por:    body.movido_por === 'n8n' ? 'n8n' : 'humano',
    });

    // Espelha a etapa no banco da clínica (pacientes.etapa_crm via n8n) → os fluxos
    // sabem onde o lead está e ativam/desativam sozinhos. Guarda anti-eco: não dispara
    // quando foi o próprio n8n que moveu o card (ele já atualizou a clínica do lado dele).
    if (body.movido_por !== 'n8n') {
      try {
        await fetch('https://n8n.drluizguedes.com.br/webhook/crm-sync-etapa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            card_id:  id,
            telefone: data?.telefone ?? '',
            etapa:    body.etapa_atual,
            pipeline: data?.pipeline_id ?? null,
          }),
        });
      } catch { /* não bloqueia o move do card se o n8n estiver indisponível */ }
    }
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerClient();
  // Remove os filhos (FKs) antes do lead, senão o Postgres barra com 23503.
  await supabase.from('financeiro').delete().eq('lead_id', id);
  await supabase.from('historico_movimentacoes').delete().eq('lead_id', id);
  await supabase.from('notas').delete().eq('lead_id', id);
  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
