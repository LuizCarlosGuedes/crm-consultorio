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

  const { card_id, tag, tags } = body;

  if (!card_id) {
    return NextResponse.json({ error: 'card_id é obrigatório' }, { status: 400 });
  }

  // Aceita `tag` (string única) OU `tags` (array) — uma só chamada, sem race condition.
  const entradaBruta: unknown[] = Array.isArray(tags)
    ? tags
    : (tag !== undefined && tag !== null ? [tag] : []);

  if (entradaBruta.length === 0) {
    return NextResponse.json({ error: 'tag ou tags são obrigatórios' }, { status: 400 });
  }

  // Normaliza, dedup e separa válidas/inválidas
  const normalizadas = entradaBruta
    .map((t) => String(t).toLowerCase().trim())
    .filter((t) => t.length > 0);
  const validas = Array.from(new Set(normalizadas.filter((t) => TAGS.includes(t))));
  const invalidas = Array.from(new Set(normalizadas.filter((t) => !TAGS.includes(t))));

  if (validas.length === 0) {
    return NextResponse.json({ error: 'nenhuma tag válida', invalidas, tags_validas: TAGS }, { status: 400 });
  }

  const { data: current, error: fetchError } = await supabase
    .from('leads')
    .select('tags')
    .eq('id', String(card_id))
    .single();

  if (fetchError) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });

  const currentTags: string[] = current.tags ?? [];
  // Merge único: todas as válidas de uma vez (dedup) — elimina a corrida do read-merge-write por tag.
  const mergedTags = Array.from(new Set([...currentTags, ...validas]));

  // Nada novo a gravar
  if (mergedTags.length === currentTags.length) {
    return NextResponse.json({ success: true, message: 'Tags já existiam', tags: currentTags, invalidas });
  }

  const { data, error } = await supabase
    .from('leads')
    .update({ tags: mergedTags })
    .eq('id', String(card_id))
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, tags: data.tags, adicionadas: validas, invalidas });
}
