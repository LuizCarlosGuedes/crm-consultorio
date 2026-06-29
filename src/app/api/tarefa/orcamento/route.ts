import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { calcSLAVencimento } from '@/lib/utils';

// "Enviei um orçamento" (botão do Contato IA): fecha a pendência do paciente nos DOIS
// bancos (Supabase + clinica_ia via WF76) e move o card pra "Proposta Enviada".
const WEBHOOK_CLINICA = 'https://n8n.drluizguedes.com.br/webhook/resolver-pendencia-clinica';

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 }); }
  const telefone = typeof body?.telefone === 'string' ? body.telefone.trim() : '';
  if (!telefone) return NextResponse.json({ ok: false, error: 'telefone é obrigatório' }, { status: 400 });

  const supabase = createServerClient();
  const now = new Date().toISOString();
  const resultado: { baixou: number; moveu: boolean; etapa_anterior?: string } = { baixou: 0, moveu: false };

  // 1) baixa as pendências abertas do paciente (Supabase)
  const { data: pends } = await supabase
    .from('pendencias')
    .update({ status: 'enviado', resolved_at: now })
    .eq('paciente_telefone', telefone)
    .eq('status', 'pendente')
    .select('id');
  resultado.baixou = pends?.length ?? 0;

  // 2) espelha a baixa no clinica_ia (onde o follow-up olha) — best-effort
  try {
    await fetch(WEBHOOK_CLINICA, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: '', telefone }), cache: 'no-store',
    });
  } catch { /* não bloqueia */ }

  // 3) move o card pra "Proposta Enviada" (não rebaixa quem já está em Sinal Pago/Agendado/Pipeline 2)
  const { data: lead } = await supabase
    .from('leads').select('id, etapa_atual, pipeline_id')
    .eq('telefone', telefone)
    .order('data_atualizacao', { ascending: false })
    .limit(1).maybeSingle();

  if (lead) {
    resultado.etapa_anterior = lead.etapa_atual as string;
    const bloqueadas = ['Sinal Pago', 'Agendado', 'Proposta Enviada'];
    if (Number(lead.pipeline_id) !== 2 && !bloqueadas.includes(String(lead.etapa_atual))) {
      await supabase.from('leads').update({
        etapa_atual: 'Proposta Enviada',
        sla_vencimento: calcSLAVencimento('Proposta Enviada').toISOString(),
        movido_por_ia: true,
        data_atualizacao: now,
      }).eq('id', lead.id as string);
      resultado.moveu = true;
    }
  }

  return NextResponse.json({ ok: true, ...resultado });
}
