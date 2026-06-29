import { NextRequest, NextResponse } from 'next/server';

// Envia a mensagem da tarefa pro paciente (resolve a conversa + manda como Nathalia).
// Chama o WF68 (webhook tarefa-enviar).
const WEBHOOK = 'https://n8n.drluizguedes.com.br/webhook/tarefa-enviar';

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 }); }
  if (!body?.telefone || !body?.mensagem) return NextResponse.json({ ok: false, error: 'telefone e mensagem obrigatórios' }, { status: 400 });
  try {
    const res = await fetch(WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
    const data = await res.json().catch(() => ({ ok: res.ok }));
    return NextResponse.json(data, { status: res.ok ? 200 : 502 });
  } catch (e) { return NextResponse.json({ ok: false, error: String(e) }, { status: 502 }); }
}
