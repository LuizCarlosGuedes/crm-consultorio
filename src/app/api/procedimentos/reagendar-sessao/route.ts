import { NextRequest, NextResponse } from 'next/server';

// Reagenda uma sessão: move a consulta para a nova data e recria o evento no Google (apaga o antigo).
// Chama o WF62 (webhook reagendar-sessao).
const WEBHOOK = 'https://n8n.drluizguedes.com.br/webhook/reagendar-sessao';

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }
  if (!body?.consulta_id || !body?.data) {
    return NextResponse.json({ ok: false, error: 'consulta_id e data são obrigatórios' }, { status: 400 });
  }
  try {
    const res = await fetch(WEBHOOK, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), cache: 'no-store',
    });
    const data = await res.json().catch(() => ({ ok: res.ok }));
    return NextResponse.json(data, { status: res.ok ? 200 : 502 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }
}
