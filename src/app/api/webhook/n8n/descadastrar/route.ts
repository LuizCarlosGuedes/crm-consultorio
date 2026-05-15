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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { nome, telefone } = body;

  if (!nome || !telefone) {
    return NextResponse.json({ error: 'nome e telefone são obrigatórios' }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('descadastrados')
    .insert({ nome: String(nome), telefone: String(telefone) })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, descadastrado: data }, { status: 201 });
}
