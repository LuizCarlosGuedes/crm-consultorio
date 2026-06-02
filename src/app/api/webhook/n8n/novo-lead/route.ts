import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { calcSLAVencimento } from '@/lib/utils';

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

  const {
    nome, telefone, origem, procedimento, prioridade,
    nota, valor_consulta, chatwoot_url, pipeline_id,
    tags, profissao, como_conheceu, foi_indicacao,
  } = body;

  if (!nome || !telefone) {
    return NextResponse.json({ error: 'nome e telefone são obrigatórios' }, { status: 400 });
  }

  const pid = Number(pipeline_id ?? 1);

  // Idempotência: se já existe um card para este telefone neste pipeline, devolve o card
  // EXISTENTE com o `id`. Isso é essencial para a integração com o n8n: sem o `id` o n8n
  // não consegue mover o card depois (re-contatos ficavam fora de sincronia).
  const { data: existente } = await supabase
    .from('leads')
    .select('*')
    .eq('telefone', String(telefone))
    .eq('pipeline_id', pid)
    .order('data_entrada', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existente) {
    // Atualiza a última interação e devolve o card existente (com id).
    await supabase
      .from('leads')
      .update({ ultima_interacao: new Date().toISOString() })
      .eq('id', existente.id);

    return NextResponse.json(
      { success: true, lead: existente, action: 'updated' },
      { status: 200 },
    );
  }

  const etapaInicial = pid === 2 ? 'Compareceu' : 'Novo Lead';
  const slaVencimento = calcSLAVencimento(etapaInicial);

  const { data, error } = await supabase
    .from('leads')
    .insert({
      nome:           String(nome),
      telefone:       String(telefone),
      origem:         String(origem         ?? 'WhatsApp'),
      procedimento:   String(procedimento   ?? ''),
      prioridade:     String(prioridade     ?? 'normal'),
      nota:           String(nota           ?? ''),
      valor_consulta: Number(valor_consulta ?? 0),
      chatwoot_url:   String(chatwoot_url   ?? ''),
      etapa_atual:    etapaInicial,
      pipeline_id:    pid,
      movido_por_ia:  true,
      sla_vencimento: slaVencimento.toISOString(),
      tags:           Array.isArray(tags) ? tags : [],
      profissao:      profissao     ? String(profissao)     : null,
      como_conheceu:  como_conheceu ? String(como_conheceu) : null,
      foi_indicacao:  Boolean(foi_indicacao ?? false),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('historico_movimentacoes').insert({
    lead_id:       data.id,
    etapa_origem:  null,
    etapa_destino: etapaInicial,
    motivo:        'Lead criado automaticamente via N8N',
    movido_por:    'n8n',
  });

  return NextResponse.json({ success: true, lead: data, action: 'created' }, { status: 201 });
}
