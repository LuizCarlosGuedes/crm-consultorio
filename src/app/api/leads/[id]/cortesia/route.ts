import { NextRequest, NextResponse } from 'next/server';

// Proxy do CRM → n8n (WF-Cortesia). Lê/grava a marca de "próxima consulta cortesia"
// direto em pacientes (banco da clínica), de onde a IA lê na hora de agendar.
const N8N_CORTESIA = 'https://n8n.drluizguedes.com.br/webhook/cortesia-toggle';

async function callN8n(payload: Record<string, unknown>) {
  const res = await fetch(N8N_CORTESIA, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!text) return {};
  try {
    const json = JSON.parse(text);
    return Array.isArray(json) ? (json[0] ?? {}) : json;
  } catch {
    return {};
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const telefone = req.nextUrl.searchParams.get('telefone') ?? '';
  const data = await callN8n({ action: 'get', card_id: id, telefone });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data = await callN8n({
    action: 'set',
    card_id: id,
    telefone: body.telefone ?? '',
    ativo: !!body.ativo,
    motivo: body.motivo ?? null,
  });
  return NextResponse.json(data);
}
