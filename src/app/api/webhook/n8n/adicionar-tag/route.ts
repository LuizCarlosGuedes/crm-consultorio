import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { TAGS } from '@/lib/constants';

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

  const { card_id, tag } = body;

  if (!card_id || !tag) {
    return NextResponse.json({ error: 'card_id e tag são obrigatórios' }, { status: 400 });
  }

  const tagStr = String(tag).toLowerCase().trim();
  if (!TAGS.includes(tagStr)) {
    return NextResponse.json({ error: 'tag inválida', tags_validas: TAGS }, { status: 400 });
  }

  const { data: current, error: fetchError } = await supabase
    .from('leads')
    .select('tags')
    .eq('id', String(card_id))
    .single();

  if (fetchError) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });

  const currentTags: string[] = current.tags ?? [];
  if (currentTags.includes(tagStr)) {
    return NextResponse.json({ success: true, message: 'Tag já existe', tags: currentTags });
  }

  const newTags = [...currentTags, tagStr];

  const { data, error } = await supabase
    .from('leads')
    .update({ tags: newTags })
    .eq('id', String(card_id))
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, tags: data.tags });
}
