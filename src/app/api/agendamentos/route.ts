import { NextResponse } from 'next/server';

// Agendamentos futuros (consultas AGENDADO do clinica_ia, que o WF22 mantém em sincronia com o
// Google Agenda) por telefone. O CRM usa pra mostrar dia/hora no card "Agendado"/"Retorno Agendado".
const WEBHOOK = 'https://n8n.drluizguedes.com.br/webhook/agendamentos-lead';

export async function GET() {
  try {
    const res = await fetch(WEBHOOK, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ agendamentos: [] });
    const data = await res.json();
    const ags = Array.isArray(data?.ags) ? data.ags : (Array.isArray(data) ? data : (data?.agendamentos ?? []));
    return NextResponse.json({ agendamentos: Array.isArray(ags) ? ags : [] });
  } catch {
    return NextResponse.json({ agendamentos: [] });
  }
}
