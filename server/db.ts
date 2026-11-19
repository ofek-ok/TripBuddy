import { Pool, types } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Keep DATE columns as clean 'YYYY-MM-DD' strings (avoid timezone shift)
types.setTypeParser(1082, (val: string) => val);
// Parse NUMERIC/DECIMAL (1700) and BIGINT (20) to JS numbers
types.setTypeParser(1700, (val: string) => (val === null ? null : parseFloat(val)));
types.setTypeParser(20, (val: string) => (val === null ? null : parseInt(val, 10)));

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing in .env');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
});

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}
