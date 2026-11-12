import { SCHEMA } from './schema';

export type Row = Record<string, any>;
type Runner = (text: string, params?: any[]) => Promise<Row[]>;

const g = globalThis as unknown as { __cizDb?: Promise<Runner> };

async function init(): Promise<Runner> {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (url) {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: url, max: 3 });
    const client = await pool.connect();
    try {
      // Kunci supaya dua server yang menyala bersamaan tidak membuat tabel berbarengan.
      await client.query('SELECT pg_advisory_lock(742101)');
      await client.query(SCHEMA);
      await client.query('SELECT pg_advisory_unlock(742101)');
    } finally {
      client.release();
    }
    return async (text, params) => (await pool.query(text, params)).rows;
  }
  if (process.env.VERCEL) {
    throw new Error('DATABASE_URL belum diatur. Hubungkan database Postgres di pengaturan hosting.');
  }
  // Tanpa DATABASE_URL (pengembangan lokal): Postgres tertanam yang disimpan di folder .data
  const { PGlite } = await import('@electric-sql/pglite');
  const fs = await import('node:fs');
  const dir = process.env.PGLITE_DIR || './.data/pglite';
  fs.mkdirSync(dir, { recursive: true });
  const db = new PGlite(dir);
  await db.exec(SCHEMA);
  return async (text, params) => (await db.query(text, params)).rows as Row[];
}

export async function q(text: string, params?: any[]): Promise<Row[]> {
  if (!g.__cizDb) {
    g.__cizDb = init().catch((e) => {
      g.__cizDb = undefined;
      throw e;
    });
  }
  const run = await g.__cizDb;
  return run(text, params);
}

export async function q1(text: string, params?: any[]): Promise<Row | undefined> {
  return (await q(text, params))[0];
}
