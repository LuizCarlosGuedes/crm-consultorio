import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const body = await req.json();

  const { paciente_id, consulta_id, paciente_nome, paciente_telefone } = body;

  if (!paciente_nome || !paciente_telefone) {
    return NextResponse.json(
      { error: 'paciente_nome e paciente_telefone são obrigatórios' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('retornos')
    .insert({
      paciente_id:      paciente_id   || null,
      consulta_id:      consulta_id   || null,
      paciente_nome,
      paciente_telefone,
      status:           'pendente',
      agendou_retorno:  false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
