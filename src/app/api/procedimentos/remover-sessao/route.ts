import { NextRequest, NextResponse } from 'next/server';

// Remove uma sessão: apaga a consulta e o evento no Google. Chama o WF64 (webhook remover-sessao).
const WEBHOOK = 'https://n8n.drluizguedes.com.br/webhook/remover-sessao';

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }
  if (!body?.consulta_id) return NextResponse.json({ ok: false, error: 'consulta_id obrigatório' }, { status: 400 });
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
