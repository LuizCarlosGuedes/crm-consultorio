import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

const N8N_DESCADASTRAR = 'https://n8n.drluizguedes.com.br/webhook/descadastrar-paciente';

// Tira o paciente do CRM. modo:
//  'sair'   → remove o card + desativa no banco da clínica (para as mensagens) + registra em Descadastrados.
//             Mantém o cadastro e o histórico (reversível reativando).
//  'apagar' → idem, + desconecta totalmente do operacional (etapa_crm/conversa zeradas). Preserva o
//             registro clínico (consultas/sessões) — exclusão "só operacional".
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerClient();

  let body: { modo?: string };
  try { body = await req.json(); } catch { body = {}; }
  const modo = body.modo === 'apagar' ? 'apagar' : 'sair';

  // 1. dados do lead (nome/telefone) antes de apagar o card
  const { data: lead, error: e1 } = await supabase
    .from('leads').select('nome, telefone').eq('id', id).single();
  if (e1 || !lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });

  // 2. registra em Descadastrados (ignora se já estiver lá)
  if (lead.telefone) {
    await supabase.from('descadastrados').insert({ nome: lead.nome ?? '', telefone: lead.telefone });
  }

  // 3. para os fluxos / limpa o operacional no banco da clínica (via n8n; CRM só enxerga o Supabase)
  if (lead.telefone) {
    try {
      await fetch(N8N_DESCADASTRAR, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: lead.telefone, modo }),
      });
    } catch { /* não bloqueia o descadastro se o n8n estiver indisponível */ }
  }

  // 4. apaga o card do CRM (filhos por FK, depois o lead)
  await supabase.from('financeiro').delete().eq('lead_id', id);
  await supabase.from('historico_movimentacoes').delete().eq('lead_id', id);
  await supabase.from('notas').delete().eq('lead_id', id);
  const { error: e2 } = await supabase.from('leads').delete().eq('id', id);
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  return NextResponse.json({ success: true, modo });
}
