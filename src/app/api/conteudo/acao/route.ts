import { NextRequest, NextResponse } from 'next/server';

// Aprovar / reprovar conteúdo de nutrição. Reprovar dispara a IA refazer (n8n).
const WEBHOOK = 'https://n8n.drluizguedes.com.br/webhook/conteudo-acao';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({ ok: res.ok }));
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
