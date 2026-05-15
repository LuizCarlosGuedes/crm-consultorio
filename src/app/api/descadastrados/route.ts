import { NextResponse } from 'next/server';
import { getPool } from '@/lib/postgres';

export async function GET() {
  const pool = getPool();

  const { rows } = await pool.query(
    `SELECT id, nome, telefone, email, descadastrado_at, created_at
     FROM pacientes
     WHERE descadastrado = true
     ORDER BY descadastrado_at DESC`
  );

  return NextResponse.json(rows);
}
