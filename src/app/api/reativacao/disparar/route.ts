import { NextRequest, NextResponse } from 'next/server';

// Dispara a campanha de reativação (WF94) para os pacientes selecionados.
// O WF94 responde na hora (onReceived) e processa em segundo plano, com teto de 30 por disparo
// e cadência espaçada (anti-ban). O resumo final chega no Telegram do Dr.
const N8N_DISPARAR = 'https://n8n.drluizguedes.com.br/webhook/disparar-reativacao';
const CAP = 30;

export async function POST(req: NextRequest) {
  let body: { ids?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'JSON inválido' }, { status: 400 });
  }
  const ids = Array.isArray(body?.ids) ? body.ids.filter((x) => typeof x === 'string') : [];
  if (ids.length === 0) {
    return NextResponse.json({ ok: false, erro: 'Selecione ao menos 1 paciente' }, { status: 400 });
  }
  const enviar = ids.slice(0, CAP);
  try {
    const res = await fetch(N8N_DISPARAR, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: enviar, limite: CAP, origem: 'crm' }),
    });
    return NextResponse.json({ ok: res.ok, solicitados: enviar.length, selecionados: ids.length });
  } catch {
    return NextResponse.json({ ok: false, erro: 'Falha ao contatar o motor de campanha' }, { status: 502 });
  }
}
