import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/postgres';

function autenticar(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.replace('Bearer ', '').trim();
  return token === (process.env.WEBHOOK_SECRET_TOKEN ?? '');
}

export async function POST(req: NextRequest) {
  if (!autenticar(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { telefone } = body;

  if (!telefone) {
    return NextResponse.json({ error: 'telefone é obrigatório' }, { status: 400 });
  }

  const pool = getPool();

  const { rowCount } = await pool.query(
    `UPDATE pacientes
     SET descadastrado = true, descadastrado_at = NOW()
     WHERE telefone = $1`,
    [String(telefone)]
  );

  if (rowCount === 0) {
    return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });
  }

  return NextResponse.json({ success: true, telefone, atualizado: rowCount });
}
