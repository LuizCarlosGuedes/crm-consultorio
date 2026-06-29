import { NextRequest, NextResponse } from 'next/server';

// Proxy do CRM → n8n (WF17) que lê/grava os dados de pós-consulta direto em `pacientes`
// (banco da clínica), que é de onde a IA lê. Server-side evita CORS e mantém o n8n interno.
const N8N_POS_CONSULTA = 'https://n8n.drluizguedes.com.br/webhook/pos-consulta-dados';

async function callN8n(payload: Record<string, unknown>) {
  try {
    const res = await fetch(N8N_POS_CONSULTA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!text) return {};
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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data = await callN8n({ action: 'save', card_id: id, ...body });
  return NextResponse.json(data);
}
