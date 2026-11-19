import { Pool, types } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Keep DATE columns as clean 'YYYY-MM-DD' strings (avoid timezone shift)
types.setTypeParser(1082, (val: string) => val);
// Parse NUMERIC/DECIMAL (1700) and BIGINT (20) to JS numbers
types.setTypeParser(1700, (val: string) => (val === null ? null : parseFloat(val)));
types.setTypeParser(20, (val: string) => (val === null ? null : parseInt(val, 10)));

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString: connectionString || 'postgresql://missing-database-url',
  ssl: { rejectUnauthorized: false },
  max: 10,
});

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not configured on the server');
  }
  const result = await pool.query(text, params);
  return result.rows as T[];
}
