import { NextRequest, NextResponse } from 'next/server';

// Ações nos cards de procedimento (arquivar / concluir / reabrir) — escreve no
// Postgres da clínica via webhook n8n.
const WEBHOOK = 'https://n8n.drluizguedes.com.br/webhook/procedimento-acao';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    return NextResponse.json({ ok: res.ok });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
