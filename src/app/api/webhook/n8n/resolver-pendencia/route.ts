import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

// O follow-up (WF10) lê as pendências do clinica_ia, não do Supabase. Toda baixa
// feita aqui (botão do Dr OU auto-resolução da IA) precisa ALCANÇAR os dois bancos,
// senão o paciente fica bloqueado do follow-up. WF76 resolve no clinica_ia. Best-effort.
const WEBHOOK_CLINICA = 'https://n8n.drluizguedes.com.br/webhook/resolver-pendencia-clinica';
async function syncClinica(conversation_id?: number | string | null, telefone?: string | null) {
  try {
    await fetch(WEBHOOK_CLINICA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: conversation_id ?? '', telefone: telefone ?? '' }),
      cache: 'no-store',
    });
  } catch { /* não bloqueia a baixa no CRM */ }
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { pendencia_id, link_arquivo, chatwoot_conversation_id } = body;

  // ── Auto-resolução pela IA (por conversa) ──────────────────────────────
  // A IA respondeu e resolveu sozinha o que o paciente pediu ([RESOLVIDO]).
  // Fecha TODAS as pendências abertas daquela conversa e apaga o card órfão.
  // Não envia nada ao paciente (a IA já respondeu na própria conversa).
  if (!pendencia_id && chatwoot_conversation_id != null && chatwoot_conversation_id !== '') {
    const convId = Number(chatwoot_conversation_id);
    if (Number.isNaN(convId)) {
      return NextResponse.json({ error: 'chatwoot_conversation_id inválido' }, { status: 400 });
    }
    // A IA só pode auto-resolver pendências LEVES (dúvida/outro/solicitação).
    // Entregáveis do Dr. (pedido de exame, receita, nota fiscal, documento) só
    // fecham pelo botão do doutor — protege contra a IA fechar um exame que o Dr.
    // ainda não enviou.
    const IA_RESOLVIVEL = ['duvida', 'outro', 'solicitacao_paciente'];
    const { data: pends, error: errIa } = await supabase
      .from('pendencias')
      .update({ status: 'enviado', resolved_at: new Date().toISOString() })
      .eq('chatwoot_conversation_id', convId)
      .eq('status', 'pendente')
      .in('tipo', IA_RESOLVIVEL)
      .select('paciente_telefone');

    if (errIa) return NextResponse.json({ error: errIa.message }, { status: 500 });

    const tels = Array.from(
      new Set((pends ?? []).map(p => p.paciente_telefone).filter(Boolean))
    );
    for (const tel of tels) {
      await supabase
        .from('leads')
        .delete()
        .eq('telefone', tel as string)
        .eq('etapa_atual', 'Pendência');
    }
    await syncClinica(convId, null); // espelha a baixa no clinica_ia
    return NextResponse.json({ success: true, via: 'ia', resolvidas: pends?.length ?? 0 });
  }

  if (!pendencia_id) {
    return NextResponse.json({ error: 'pendencia_id é obrigatório' }, { status: 400 });
  }

  const link =
    typeof link_arquivo === 'string' && link_arquivo.trim() ? link_arquivo.trim() : null;

  // Com link  -> entra na FILA de envio. O WF-Cron envia das 8h às 20h,
  //              respeitando a janela de 24h do WhatsApp (manda template se fechada).
  // Sem link  -> botão "Resolvido" (sem IA): apenas fecha, não envia nada.
  const update = link
    ? {
        status: 'a_enviar',
        link_arquivo: link,
        resolved_at: new Date().toISOString(),
      }
    : {
        status: 'enviado',
        resolved_at: new Date().toISOString(),
      };

  const { data: pend, error } = await supabase
    .from('pendencias')
    .update(update)
    .eq('id', String(pendencia_id))
    .select('paciente_telefone, chatwoot_conversation_id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // espelha a baixa no clinica_ia (onde o follow-up olha)
  await syncClinica(pend?.chatwoot_conversation_id, pend?.paciente_telefone);

  // Ao resolver, apaga o card do lead que estava na coluna "Pendência" (some do kanban).
  // Só apaga se estiver MESMO em "Pendência" — protege leads de venda que também têm pendência.
  if (pend?.paciente_telefone) {
    await supabase
      .from('leads')
      .delete()
      .eq('telefone', pend.paciente_telefone)
      .eq('etapa_atual', 'Pendência');
  }

  return NextResponse.json({
    success: true,
    pendencia_id,
    fila: !!link, // true = entrou na fila de envio; false = apenas fechado
  });
}
