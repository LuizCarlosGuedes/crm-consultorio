import { NextRequest, NextResponse } from 'next/server';

// Proxy para o webhook n8n que serve os eventos do Google Calendar (Consultório Dr. Luiz).
// Mantém a URL do n8n fora do client e evita CORS. Leitura pura — a agenda do CRM espelha o Google.
const WEBHOOK = 'https://n8n.drluizguedes.com.br/webhook/agenda-eventos';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = new URL(WEBHOOK);
    const timeMin = searchParams.get('timeMin');
    const timeMax = searchParams.get('timeMax');
    if (timeMin) url.searchParams.set('timeMin', timeMin);
    if (timeMax) url.searchParams.set('timeMax', timeMax);

    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ eventos: [], total: 0 });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ eventos: [], total: 0 });
  }
}
