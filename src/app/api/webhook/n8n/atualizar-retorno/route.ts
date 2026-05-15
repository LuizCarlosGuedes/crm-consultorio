import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const body = await req.json();

  const { paciente_telefone, data_retorno, observacoes, status, agendou_retorno } = body;

  if (!paciente_telefone) {
    return NextResponse.json({ error: 'paciente_telefone é obrigatório' }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data_retorno   !== undefined) updates.data_retorno   = data_retorno   || null;
  if (observacoes    !== undefined) updates.observacoes    = observacoes    || null;
  if (status         !== undefined) updates.status         = status;
  if (agendou_retorno !== undefined) updates.agendou_retorno = agendou_retorno;

  const { data, error } = await supabase
    .from('retornos')
    .update(updates)
    .eq('paciente_telefone', paciente_telefone)
    .order('created_at', { ascending: false })
    .limit(1)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
