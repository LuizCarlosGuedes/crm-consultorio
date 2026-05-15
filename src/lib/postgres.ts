import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString =
      process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL ou POSTGRES_URL não definida nas variáveis de ambiente');
    }

    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}
