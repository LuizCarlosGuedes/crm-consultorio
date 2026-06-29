import { NextRequest, NextResponse } from 'next/server';

// Agenda um retorno de consulta (cria a consulta e_retorno + evento no Google + move o card para
// "Retorno Agendado"). Chama o WF58 (webhook agendar-retorno).
const WEBHOOK = 'https://n8n.drluizguedes.com.br/webhook/agendar-retorno';

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }
  if (!body?.telefone || !body?.data) {
    return NextResponse.json({ ok: false, error: 'telefone e data são obrigatórios' }, { status: 400 });
  }
  try {
    const res = await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({ ok: res.ok }));
    return NextResponse.json(data, { status: res.ok ? 200 : 502 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }
}
