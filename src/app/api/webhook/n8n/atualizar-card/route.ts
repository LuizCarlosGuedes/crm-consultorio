import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

function autenticar(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.replace('Bearer ', '').trim();
  return token === (process.env.WEBHOOK_SECRET_TOKEN ?? '');
}

const CAMPOS_PERMITIDOS = new Set([
  // Básicos
  'nome', 'telefone', 'origem', 'procedimento', 'prioridade',
  'valor_consulta', 'nota', 'chatwoot_url',
  // Dados pessoais
  'email', 'data_nascimento', 'idade', 'sexo', 'genero', 'estado_civil', 'cpf', 'rg',
  // Endereço
  'endereco', 'numero', 'complemento', 'bairro', 'cep', 'cidade', 'estado',
  // Perfil clínico
  'profissao', 'foi_indicacao', 'como_conheceu',
  'total_investido', 'numero_consultas', 'followup_tentativas',
  // Automação
  'ultima_mensagem',
]);

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

  const { card_id, ...campos } = body;

  if (!card_id) {
    return NextResponse.json({ error: 'card_id é obrigatório' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(campos)) {
    if (!CAMPOS_PERMITIDOS.has(key)) continue;
    // Não sobrescreve com vazio/null/"null": evita apagar dados já gravados no card
    // quando o n8n manda um campo do cadastro que veio em branco.
    const s = value == null ? '' : String(value).trim();
    if (s === '' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') continue;
    updateData[key] = value;
  }

  // genero e sexo são espelhos: qualquer um recebido popula os dois
  const generoSexo = updateData['genero'] ?? updateData['sexo'];
  if (generoSexo !== undefined) {
    updateData['genero'] = generoSexo;
    updateData['sexo']   = generoSexo;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: 'Nenhum campo válido para atualizar.', campos_aceitos: Array.from(CAMPOS_PERMITIDOS) },
      { status: 400 }
    );
  }

  const { data: dataById, error: errorById } = await supabase
    .from('leads')
    .update(updateData)
    .eq('id', String(card_id))
    .select()
    .single();

  if (!errorById) {
    return NextResponse.json({ success: true, lead: dataById });
  }

  // PGRST116 = nenhuma linha retornada; tenta fallback por telefone
  if (errorById.code === 'PGRST116' && campos.telefone) {
    const { data: dataByTel, error: errorByTel } = await supabase
      .from('leads')
      .update(updateData)
      .eq('telefone', String(campos.telefone))
      .select()
      .single();

    if (!errorByTel) {
      return NextResponse.json({ success: true, lead: dataByTel, resolved_by: 'telefone' });
    }

    if (errorByTel.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Lead não encontrado por card_id nem por telefone' },
        { status: 404 }
      );
    }

    return NextResponse.json({ error: errorByTel.message }, { status: 500 });
  }

  if (errorById.code === 'PGRST116') {
    return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
  }

  return NextResponse.json({ error: errorById.message }, { status: 500 });
}
