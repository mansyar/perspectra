import { defineConfig } from 'drizzle-kit';

/** Drizzle Kit config. The connection string is injected at migration time. */
export default defineConfig({
  schema: './api/src/db/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
});
