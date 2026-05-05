import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const supabase = createServerClient();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { pendencia_id, link_arquivo, conversation_id } = body;

  if (!pendencia_id) {
    return NextResponse.json({ error: 'pendencia_id é obrigatório' }, { status: 400 });
  }

  const { error } = await supabase
    .from('pendencias')
    .update({
      status: 'resolvido',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', String(pendencia_id));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    pendencia_id,
    link_arquivo: link_arquivo ?? null,
    conversation_id: conversation_id ?? null,
  });
}
