import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get('lead_id');

  if (!leadId) {
    return NextResponse.json({ error: 'lead_id obrigatório' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('financeiro')
    .select('*')
    .eq('lead_id', leadId)
    .order('data_registro', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const body = await req.json();
  const { lead_id, tipo, descricao, valor } = body;

  if (!lead_id || !valor) {
    return NextResponse.json({ error: 'lead_id e valor são obrigatórios' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('financeiro')
    .insert({ lead_id, tipo: tipo ?? 'pagamento', descricao: descricao ?? '', valor: Number(valor) })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Recalcula total_investido no lead
  const { data: totals } = await supabase
    .from('financeiro')
    .select('valor')
    .eq('lead_id', lead_id);

  const total = (totals ?? []).reduce((acc, r) => acc + (r.valor ?? 0), 0);
  await supabase.from('leads').update({ total_investido: total }).eq('id', lead_id);

  // Ponte p/ o dashboard: o faturamento/Dashboard lê clinica_ia.pagamentos (outro banco).
  // Aqui também gravamos lá (via webhook WF87), achando o paciente pelo telefone, pra o
  // pagamento manual (PIX/dinheiro/cartão) aparecer no faturamento. Não bloqueia se falhar.
  try {
    const { data: lead } = await supabase.from('leads').select('telefone').eq('id', lead_id).single();
    if (lead?.telefone) {
      await fetch('https://n8n.drluizguedes.com.br/webhook/lancar-pagamento-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: lead.telefone, valor: Number(valor), tipo: tipo ?? 'outro' }),
      });
    }
  } catch { /* a ponte é best-effort; o lançamento no Supabase já foi salvo */ }

  return NextResponse.json(data, { status: 201 });
}
