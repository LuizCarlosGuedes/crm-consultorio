import { NextRequest, NextResponse } from 'next/server';

// Abre um acompanhamento (grava proc_* no paciente + cria as N sessões no clinica_ia + eventos no
// Google Agenda). Chama o motor WF48 (webhook abrir-acompanhamento). Aceita dry_run pra prévia.
const WEBHOOK = 'https://n8n.drluizguedes.com.br/webhook/abrir-acompanhamento';

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }
  try {
    const res = await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.ok ? 200 : 502 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }
}
