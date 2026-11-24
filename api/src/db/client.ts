import { Pool } from '@neondatabase/serverless';
import { drizzle, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import type { Env } from '../env';
import * as schema from './schema';

export interface RequestDatabase {
  db: NeonDatabase<typeof schema>;
  pool: Pool;
}

/** Creates one production Drizzle client and its request-owned Neon pool. */
export function createDatabase(env: Env): RequestDatabase {
  const connectionString = env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Database connection binding is not configured');
  }
  const pool = new Pool({ connectionString });
  return { db: drizzle(pool, { schema }), pool };
}
