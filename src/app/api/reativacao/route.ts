import { NextResponse } from 'next/server';

// Proxy para o webhook n8n que serve a Base de Reativação (pacientes em etapa "Reativação" no clinica_ia).
// Leitura pura — espelha a tabela pacientes. A campanha de disparo (Fase 3) é separada e fica no n8n.
const WEBHOOK = 'https://n8n.drluizguedes.com.br/webhook/base-reativacao';

export async function GET() {
  try {
    const res = await fetch(WEBHOOK, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ pacientes: [] });
    const data = await res.json();
    const pacientes = Array.isArray(data?.pacientes) ? data.pacientes : (Array.isArray(data) ? data : []);
    return NextResponse.json({ pacientes });
  } catch {
    return NextResponse.json({ pacientes: [] });
  }
}
