import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { calcSLAVencimento } from '@/lib/utils';
import { TODAS_ETAPAS } from '@/lib/constants';

function autenticar(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.replace('Bearer ', '').trim();
  return token === (process.env.WEBHOOK_SECRET_TOKEN ?? '');
}

export async function POST(req: NextRequest) {
  if (!autenticar(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const supabase = createServerClient();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { card_id, telefone, etapa_destino, motivo, pipeline_id, ...resto } = body;

  if (!etapa_destino || (!card_id && !telefone)) {
    return NextResponse.json({ error: 'etapa_destino e (card_id ou telefone) são obrigatórios' }, { status: 400 });
  }

  const pid = pipeline_id ? Number(pipeline_id) : undefined;
  const etapasDoContexto = pid ? TODAS_ETAPAS.filter(e => e.pipeline === pid) : TODAS_ETAPAS;
  const etapaValida = etapasDoContexto.some(e => e.id === String(etapa_destino));

  if (!etapaValida) {
    return NextResponse.json({
      error: 'etapa_destino inválida',
      etapas_validas: etapasDoContexto.map(e => e.id),
    }, { status: 400 });
  }

  // Acha o lead por card_id; se vier vazio/NULL ou apontar pra um card que não existe
  // mais (crm_card_id "stale" vindo do n8n), cai pro telefone. O WF03 manda os dois.
  let current = card_id
    ? (await supabase.from('leads').select('*').eq('id', String(card_id)).maybeSingle()).data
    : null;
  if (!current && telefone) {
    current = (await supabase
      .from('leads')
      .select('*')
      .eq('telefone', String(telefone))
      .order('data_atualizacao', { ascending: false })
      .limit(1)
      .maybeSingle()).data;
  }

  if (!current) return NextResponse.json({ error: 'Lead não encontrado (card_id/telefone)' }, { status: 404 });

  const leadId = String(current.id);

  // Guarda anti-regressão: dentro do funil do Pipeline 1, a IA NUNCA pode rebaixar o card
  // para uma etapa anterior (ex.: depois de "Agendado", um [ESTAGIO:proposta_consulta]
  // tardio — quando o paciente só agradece — não pode puxar o card de volta). Movimentos
  // para fora do funil (No Show, Reagendamento, Follow-up, Perdido…) continuam livres.
  const FUNIL = ['Novo Lead', 'Triagem IA', 'Qualificado', 'Proposta Enviada', 'Sinal Pago', 'Agendado'];
  const iAtual   = FUNIL.indexOf(String(current.etapa_atual));
  const iDestino = FUNIL.indexOf(String(etapa_destino));
  if (iAtual >= 0 && iDestino >= 0 && iDestino < iAtual) {
    return NextResponse.json({ success: true, lead: current, skipped: 'regressao_no_funil_bloqueada' });
  }

  // Só re-arma o SLA quando a etapa MUDA de verdade. A IA re-chama mover-card a cada
  // mensagem (mesma etapa) — sem essa guarda o sla_vencimento (e, com ele, o "tempo na
  // coluna") zerava a cada mensagem, dando a impressão de que o lead acabou de chegar.
  const mudouEtapa = current.etapa_atual !== String(etapa_destino);

  const updatePayload: Record<string, unknown> = {
    etapa_atual:    String(etapa_destino),
    movido_por_ia:  true,
  };

  if (mudouEtapa) {
    updatePayload.sla_vencimento = calcSLAVencimento(String(etapa_destino)).toISOString();
  }

  if (pid) updatePayload.pipeline_id = pid;

  // Campos de enriquecimento opcionais (detectados pela IA): só gravam se vierem
  // preenchidos, para nunca apagar um valor já existente no card.
  const ENRIQUECER = ['como_conheceu', 'queixa_principal', 'indicado_por'];
  for (const k of ENRIQUECER) {
    const v = (resto as Record<string, unknown>)[k];
    const s = v == null ? '' : String(v).trim();
    if (s && s.toLowerCase() !== 'null' && s.toLowerCase() !== 'undefined') {
      updatePayload[k] = s;
    }
  }

  const { data, error } = await supabase
    .from('leads')
    .update(updatePayload)
    .eq('id', leadId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Histórico só quando muda de etapa (evita poluir o histórico com re-chamadas da IA
  // na mesma etapa, que não são movimentações reais).
  if (mudouEtapa) {
    await supabase.from('historico_movimentacoes').insert({
      lead_id:       leadId,
      etapa_origem:  current.etapa_atual,
      etapa_destino: String(etapa_destino),
      motivo:        String(motivo ?? 'Movido pelo N8N'),
      movido_por:    'n8n',
    });
  }

  return NextResponse.json({ success: true, lead: data });
}
