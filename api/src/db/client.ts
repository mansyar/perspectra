import { Pool } from '@neondatabase/serverless';
import { drizzle, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import type { Env } from '../env';
import * as schema from './schema';

/** Lazily creates the production Drizzle client from Worker bindings. */
export function createDatabase(env: Env): NeonDatabase<typeof schema> {
  const connectionString = env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Database connection binding is not configured');
  }
  return drizzle(new Pool({ connectionString }), { schema });
}
