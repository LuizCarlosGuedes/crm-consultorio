import { NextRequest, NextResponse } from 'next/server';

// A IA (Nathalia) compõe uma mensagem a partir da tarefa do Dr. Chama o WF67 (webhook tarefa-compor).
const WEBHOOK = 'https://n8n.drluizguedes.com.br/webhook/tarefa-compor';

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 }); }
  if (!body?.task || !body?.paciente_nome) return NextResponse.json({ ok: false, error: 'task e paciente_nome obrigatórios' }, { status: 400 });
  try {
    const res = await fetch(WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
    const data = await res.json().catch(() => ({ ok: res.ok }));
    return NextResponse.json(data, { status: res.ok ? 200 : 502 });
  } catch (e) { return NextResponse.json({ ok: false, error: String(e) }, { status: 502 }); }
}
