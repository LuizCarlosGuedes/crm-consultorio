import { NextResponse } from 'next/server';

// Lista os conteúdos de nutrição do mês (Supabase). Leitura via anon key.
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET() {
  try {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/conteudo_nutricao?ativo=eq.true&order=semana.asc&select=id,semana,titulo,conteudo,status,imagem_drive_url,tags`,
      { headers: { apikey: SUPA_KEY ?? '', Authorization: `Bearer ${SUPA_KEY ?? ''}` }, cache: 'no-store' },
    );
    if (!res.ok) return NextResponse.json([]);
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json([]);
  }
}
