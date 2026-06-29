import { NextRequest, NextResponse } from 'next/server';

// Busca paciente por nome no clinica_ia (via webhook n8n) — usado pra abrir um acompanhamento.
const WEBHOOK = 'https://n8n.drluizguedes.com.br/webhook/buscar-paciente';

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  if (q.length < 2) return NextResponse.json({ pacientes: [] });
  try {
    const res = await fetch(`${WEBHOOK}?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ pacientes: [] });
    const data = await res.json();
    const lista = Array.isArray(data?.pacientes) ? data.pacientes : (Array.isArray(data) ? data : []);
    return NextResponse.json({ pacientes: lista });
  } catch {
    return NextResponse.json({ pacientes: [] });
  }
}
