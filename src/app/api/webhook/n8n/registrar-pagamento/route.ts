import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

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

  const { card_id, tipo, descricao, valor } = body;

  if (!card_id || !valor) {
    return NextResponse.json({ error: 'card_id e valor são obrigatórios' }, { status: 400 });
  }

  const valorNum = Number(valor);
  if (isNaN(valorNum) || valorNum <= 0) {
    return NextResponse.json({ error: 'valor deve ser um número positivo' }, { status: 400 });
  }

  // Verifica se lead existe
  const { error: fetchError } = await supabase
    .from('leads')
    .select('id, total_investido')
    .eq('id', String(card_id))
    .single();

  if (fetchError) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });

  // Insere na tabela financeiro
  const { data: financeiro, error: finError } = await supabase
    .from('financeiro')
    .insert({
      lead_id:   String(card_id),
      tipo:      String(tipo      ?? 'pagamento'),
      descricao: String(descricao ?? ''),
      valor:     valorNum,
    })
    .select()
    .single();

  if (finError) return NextResponse.json({ error: finError.message }, { status: 500 });

  // Atualiza total_investido no lead
  const { data: totals } = await supabase
    .from('financeiro')
    .select('valor')
    .eq('lead_id', String(card_id));

  const total = (totals ?? []).reduce((acc, r) => acc + (r.valor ?? 0), 0);

  await supabase
    .from('leads')
    .update({ total_investido: total })
    .eq('id', String(card_id));

  return NextResponse.json({ success: true, financeiro, total_investido: total }, { status: 201 });
}
