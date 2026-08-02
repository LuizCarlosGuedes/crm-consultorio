import { NextRequest, NextResponse } from 'next/server';

// Proxy do CRM → n8n (WF-Proc Pago Clinica). Marca o procedimento como pago na clínica:
// lança no financeiro (CRM + clínica) e dispara a organização das sessões pela Nathalia.
const N8N_PROC_PAGO = 'https://n8n.drluizguedes.com.br/webhook/procedimento-pago-clinica';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const valor = Number(body.valor);
  if (!valor || valor <= 0) {
    return NextResponse.json({ error: 'valor deve ser um número positivo' }, { status: 400 });
  }
  try {
    const res = await fetch(N8N_PROC_PAGO, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-webhook-token': process.env.WEBHOOK_SECRET_TOKEN ?? '' },
      body: JSON.stringify({ card_id: id, telefone: body.telefone ?? '', valor, metodo: body.metodo ?? 'clinica' }),
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    return NextResponse.json(Array.isArray(json) ? (json[0] ?? {}) : json);
  } catch {
    return NextResponse.json({ error: 'Falha ao acionar o fluxo no n8n' }, { status: 502 });
  }
}
