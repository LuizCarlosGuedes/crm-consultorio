import { NextRequest, NextResponse } from 'next/server';

// POST /api/procedimentos/lancar-financeiro
// Lança o valor de um acompanhamento no Financeiro (pagamentos clinica_ia + financeiro Supabase).
// O n8n (WF-LANCAR-ACOMP) é idempotente: só lança se ainda não foi (guarda proc_valor_fechado IS NULL),
// não mexe no proc_status e não manda mensagem pra paciente.
export async function POST(req: NextRequest) {
  let body: { paciente_id?: string; valor?: number | string; metodo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }

  const paciente_id = (body.paciente_id ?? '').toString().trim();
  const valor = Number(body.valor);
  if (!paciente_id) return NextResponse.json({ ok: false, error: 'paciente_id é obrigatório' }, { status: 400 });
  if (!(valor > 0)) return NextResponse.json({ ok: false, error: 'valor inválido' }, { status: 400 });

  try {
    const res = await fetch('https://n8n.drluizguedes.com.br/webhook/lancar-acompanhamento-financeiro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paciente_id, valor, metodo: body.metodo ?? 'clinica' }),
    });
    const data = await res.json().catch(() => ({} as { ok?: boolean; motivo?: string; mensagem?: string }));
    if (!res.ok || !data.ok) {
      return NextResponse.json({ ok: false, error: data.mensagem || 'Não consegui lançar no financeiro.' });
    }
    return NextResponse.json({ ok: true, valor });
  } catch {
    return NextResponse.json({ ok: false, error: 'Erro ao contatar o n8n.' });
  }
}
