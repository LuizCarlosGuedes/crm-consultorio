import { NextRequest, NextResponse } from 'next/server';

// Proxy do CRM → n8n (WF74 — Mover Procedimento). Grava o procedimento no paciente
// (clinica_ia): tem_procedimento + proc_nome/sessoes/valor/periodicidade/status.
// É o que a aba Procedimentos, a agenda e a IA leem.
const N8N_PROC = 'https://n8n.drluizguedes.com.br/webhook/mover-procedimento';
// Quando "pago": lança o pagamento na clínica (clinica_ia.pagamentos = fonte do fechamento do mês)
// + organiza as sessões pela Nathalia. Sem isso = furo de dinheiro no fechamento.
const N8N_PROC_PAGO = 'https://n8n.drluizguedes.com.br/webhook/procedimento-pago-clinica';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const status = body.proc_status ?? 'pago';
  const valor = Number(body.proc_valor);
  try {
    // 1) Configura o procedimento (nome/sessões/valor/periodicidade/coluna)
    const res = await fetch(N8N_PROC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card_id: id,
        telefone: body.telefone ?? '',
        proc_nome: body.proc_nome ?? 'Procedimento',
        proc_sessoes: body.proc_sessoes ?? null,
        proc_valor: body.proc_valor ?? null,
        proc_periodicidade: body.proc_periodicidade ?? 'semanal',
        proc_status: status,
      }),
    });
    if (!res.ok) return NextResponse.json({ ok: false, error: 'n8n ' + res.status }, { status: 502 });

    // 2) Se "pago", registra o pagamento no financeiro do mês + organiza as sessões
    let pago = false;
    if (status === 'pago' && valor > 0) {
      try {
        const p = await fetch(N8N_PROC_PAGO, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ card_id: id, telefone: body.telefone ?? '', valor }),
        });
        pago = p.ok;
      } catch { /* não bloqueia a transferência se o lançamento falhar */ }
    }
    return NextResponse.json({ ok: true, pago });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e).slice(0, 120) }, { status: 500 });
  }
}
