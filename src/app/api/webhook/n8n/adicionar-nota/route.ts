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

  const { card_id, nota, autor } = body;

  if (!card_id || !nota) {
    return NextResponse.json({ error: 'card_id e nota são obrigatórios' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('notas')
    .insert({
      lead_id:  String(card_id),
      conteudo: String(nota),
      autor:    String(autor ?? 'N8N'),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, nota: data }, { status: 201 });
}
