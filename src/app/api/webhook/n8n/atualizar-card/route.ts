import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

function autenticar(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.replace('Bearer ', '').trim();
  return token === (process.env.WEBHOOK_SECRET_TOKEN ?? '');
}

// Campos diretos aceitos (nome no body = nome na coluna)
const CAMPOS_PERMITIDOS = new Set([
  // Básicos
  'nome', 'telefone', 'origem', 'procedimento', 'prioridade',
  'valor_consulta', 'nota', 'chatwoot_url',
  // Dados pessoais
  'email', 'data_nascimento', 'idade', 'sexo', 'estado_civil', 'cpf', 'rg',
  // Endereço
  'endereco', 'numero', 'complemento', 'bairro', 'cep', 'cidade', 'estado',
  // Perfil clínico
  'profissao', 'foi_indicacao', 'como_conheceu',
  'total_investido', 'numero_consultas', 'followup_tentativas',
  // Automação
  'ultima_mensagem',
]);

// Campos que chegam com nome diferente do banco
const ALIAS: Record<string, string> = {
  genero: 'sexo',
};

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
    const coluna = ALIAS[key] ?? key;
    if (CAMPOS_PERMITIDOS.has(coluna)) {
      updateData[coluna] = value;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: 'Nenhum campo válido para atualizar.', campos_aceitos: Array.from(CAMPOS_PERMITIDOS).concat(Object.keys(ALIAS)) },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('leads')
    .update(updateData)
    .eq('id', String(card_id))
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, lead: data });
}
