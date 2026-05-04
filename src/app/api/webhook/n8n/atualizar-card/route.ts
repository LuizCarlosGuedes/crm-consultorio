import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

function autenticar(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.replace('Bearer ', '').trim();
  return token === (process.env.WEBHOOK_SECRET_TOKEN ?? '');
}

const CAMPOS_PERMITIDOS = [
  'nome', 'telefone', 'origem', 'procedimento', 'prioridade',
  'valor_consulta', 'nota', 'chatwoot_url',
];

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

  const { card_id, ...campos } = body;

  if (!card_id) {
    return NextResponse.json({ error: 'card_id é obrigatório' }, { status: 400 });
  }

  // Filter only allowed fields
  const updateData: Record<string, unknown> = {};
  for (const campo of CAMPOS_PERMITIDOS) {
    if (campo in campos) updateData[campo] = campos[campo];
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo válido para atualizar. Campos permitidos: ' + CAMPOS_PERMITIDOS.join(', ') }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('leads')
    .update(updateData)
    .eq('id', String(card_id))
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, lead: data });
}
