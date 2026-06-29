import { NextResponse } from 'next/server';

const N8N_DASH = 'https://n8n.drluizguedes.com.br/webhook/dashboard-data';

// Proxy: o CRM puxa os números REAIS da clínica (pacientes/consultas/pagamentos do clinica_ia)
// agregados pelo WF-Dashboard Data no n8n. Sem cache — sempre dado fresco.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const qs = new URLSearchParams();
    const since = searchParams.get('since');
    const until = searchParams.get('until');
    if (since) qs.set('since', since);
    if (until) qs.set('until', until);
    const url = qs.toString() ? `${N8N_DASH}?${qs.toString()}` : N8N_DASH;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    const dash = Array.isArray(data) ? data[0]?.dashboard : (data?.dashboard ?? data);
    return NextResponse.json(dash ?? {}, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ erro: 'Falha ao buscar dados do dashboard' }, { status: 502 });
  }
}
