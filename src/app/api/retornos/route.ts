import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(_req: NextRequest) {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('retornos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const body = await req.json();

  const { paciente_id, paciente_nome, paciente_telefone, consulta_id, observacoes } = body;

  if (!paciente_nome || !paciente_telefone) {
    return NextResponse.json(
      { error: 'paciente_nome e paciente_telefone são obrigatórios' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('retornos')
    .insert({
      paciente_id:    paciente_id    || null,
      paciente_nome,
      paciente_telefone,
      consulta_id:    consulta_id    || null,
      status:         'pendente',
      agendou_retorno: false,
      observacoes:    observacoes    || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
