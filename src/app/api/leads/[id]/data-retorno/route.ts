import { NextRequest, NextResponse } from 'next/server';

// POST /api/leads/[id]/data-retorno
// Salva (ou limpa) a "possível data de retorno" de um lead em Stand By — paciente indeciso
// que ainda não escolheu a data do reagendamento. NÃO cria consulta e NÃO cobra: é só uma
// data tentativa que o Dr. vê no briefing diário (Bom dia, Nathalia). Grava no clinica_ia
// (pacientes.data_retorno_possivel) via webhook n8n WF-DATA-RETORNO.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: { telefone?: string; data?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }

  // data vazia = limpar; se vier preenchida tem que ser YYYY-MM-DD
  const data = (body.data ?? '').trim();
  if (data && !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json({ ok: false, error: 'Data inválida (use AAAA-MM-DD)' }, { status: 400 });
  }

  try {
    const res = await fetch('https://n8n.drluizguedes.com.br/webhook/set-data-retorno', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_id: id, telefone: body.telefone ?? '', data }),
    });
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: 'Falha ao salvar no n8n' }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Erro ao contatar o n8n' }, { status: 502 });
  }
}
