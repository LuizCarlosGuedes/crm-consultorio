import { NextRequest, NextResponse } from 'next/server';

// Faz a Nathalia responder o paciente (manda a mensagem do Dr na conversa do Chatwoot).
// Chama o WF66 (webhook pendencia-responder).
const WEBHOOK = 'https://n8n.drluizguedes.com.br/webhook/pendencia-responder';

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }
  if (!body?.conversation_id || !body?.mensagem) {
    return NextResponse.json({ ok: false, error: 'conversation_id e mensagem são obrigatórios' }, { status: 400 });
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
