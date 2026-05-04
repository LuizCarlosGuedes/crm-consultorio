import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { calcSLAVencimento } from '@/lib/utils';

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('data_entrada', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const body = await req.json();

  const { nome, telefone, origem, procedimento, prioridade, nota, valor_consulta, chatwoot_url } = body;

  if (!nome || !telefone) {
    return NextResponse.json({ error: 'nome e telefone são obrigatórios' }, { status: 400 });
  }

  const slaVencimento = calcSLAVencimento('Novo Lead');

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
      etapa_atual:    'Novo Lead',
      movido_por_ia:  false,
      sla_vencimento: slaVencimento.toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Registra histórico
  await supabase.from('historico_movimentacoes').insert({
    lead_id:       data.id,
    etapa_origem:  null,
    etapa_destino: 'Novo Lead',
    motivo:        'Lead criado manualmente',
    movido_por:    'humano',
  });

  return NextResponse.json(data, { status: 201 });
}
