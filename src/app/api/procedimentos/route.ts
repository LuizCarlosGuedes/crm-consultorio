import { NextResponse } from 'next/server';

// Lista de pacientes em procedimento — vem do Postgres da clínica via webhook n8n
// (mesma estratégia do pós-consulta, já que `pacientes` não está no Supabase do CRM).
const WEBHOOK = 'https://n8n.drluizguedes.com.br/webhook/procedimentos-lista';

export async function GET() {
  try {
    const res = await fetch(WEBHOOK, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json([]);
    const data = await res.json();
    const lista = Array.isArray(data) ? data : (data?.procedimentos ?? []);
    return NextResponse.json(lista);
  } catch {
    return NextResponse.json([]);
  }
}
