import { NextRequest, NextResponse } from 'next/server';

// Edita os dados do procedimento/acompanhamento de um paciente (nome, sessões, valor, frequência).
// Chama o WF59 (webhook editar-procedimento).
const WEBHOOK = 'https://n8n.drluizguedes.com.br/webhook/editar-procedimento';

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }
  if (!body?.paciente_id) return NextResponse.json({ ok: false, error: 'paciente_id obrigatório' }, { status: 400 });
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
