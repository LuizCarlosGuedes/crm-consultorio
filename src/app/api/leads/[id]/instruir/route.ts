import { NextRequest, NextResponse } from 'next/server';

// POST /api/leads/[id]/instruir
// O Dr. escreve uma orientação; a Nathalia lê o histórico da conversa (Chatwoot) + a instrução,
// redige a próxima mensagem e envia pra paciente no WhatsApp, conduzindo a conversa.
// Encaminha pro n8n WF-INSTRUIR (webhook /instruir-nathalia), que reusa o motor de IA da Nathalia.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: { telefone?: string; instrucao?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }

  const instrucao = (body.instrucao ?? '').trim();
  if (!instrucao) {
    return NextResponse.json({ ok: false, error: 'Escreva a orientação' }, { status: 400 });
  }

  try {
    const res = await fetch('https://n8n.drluizguedes.com.br/webhook/instruir-nathalia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_id: id, telefone: body.telefone ?? '', instrucao }),
    });
    const data = await res.json().catch(() => ({} as { ok?: boolean; mensagem?: string; error?: string; pendente?: boolean }));
    if (!res.ok || !data.ok) {
      return NextResponse.json({ ok: false, error: data.error || 'A Nathalia não conseguiu enviar.' });
    }
    return NextResponse.json({ ok: true, mensagem: data.mensagem || '', pendente: !!data.pendente });
  } catch {
    return NextResponse.json({ ok: false, error: 'Erro ao contatar a Nathalia (n8n).' });
  }
}
