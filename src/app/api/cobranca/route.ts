import { NextRequest, NextResponse } from 'next/server';

const N8N_COBRANCA = 'https://n8n.drluizguedes.com.br/webhook/executar-cobranca';

// Proxy do CRM para o motor de cobrança no n8n (WF-Cobrança Executor).
// O card manda texto livre + telefone; o motor interpreta, gera o link InfinitePay
// e (se não for dry_run) envia a cobrança no WhatsApp do paciente.
export async function POST(req: NextRequest) {
  let body: { texto?: string; telefone?: string; card_id?: string; dry_run?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'JSON inválido' }, { status: 400 });
  }

  const { texto, telefone, card_id, dry_run } = body;
  if (!texto?.trim() || !telefone) {
    return NextResponse.json({ ok: false, erro: 'texto e telefone são obrigatórios' }, { status: 400 });
  }

  try {
    const res = await fetch(N8N_COBRANCA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto, telefone, card_id, origem: 'crm', dry_run: dry_run === true }),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ ok: false, erro: 'Falha ao contatar o motor de cobrança' }, { status: 502 });
  }
}
