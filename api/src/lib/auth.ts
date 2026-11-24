import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { NeonDatabase } from 'drizzle-orm/neon-serverless';
import type { Env } from '../env';
import type * as schema from '../db/schema';

export interface AuthIdentity {
  userId: string;
}

/** Small seam so progress routes never depend on Better Auth types directly. */
export interface AuthPort {
  getSession(request: Request): Promise<AuthIdentity | null>;
  handler(request: Request): Promise<Response>;
}

/** Declarative descriptor asserted by tests; also drives the real configuration. */
export const authProviders = {
  emailAndPassword: true,
  socialProviders: ['github', 'google'],
} as const satisfies {
  emailAndPassword: boolean;
  socialProviders: readonly string[];
};

export function createAuthOptions(env: Env, db: NeonDatabase<typeof schema>) {
  return {
    database: drizzleAdapter(db, { provider: 'pg' }),
    emailAndPassword: { enabled: authProviders.emailAndPassword },
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID ?? '',
        clientSecret: env.GITHUB_CLIENT_SECRET ?? '',
      },
      google: {
        clientId: env.GOOGLE_CLIENT_ID ?? '',
        clientSecret: env.GOOGLE_CLIENT_SECRET ?? '',
      },
    },
    secret: env.BETTER_AUTH_SECRET,
    ...(env.BETTER_AUTH_URL ? { baseURL: env.BETTER_AUTH_URL } : {}),
  };
}

/** Production adapter: Better Auth owns sessions, routes expose only a user ID. */
export function createAuth(env: Env, db: NeonDatabase<typeof schema>): AuthPort {
  const auth = betterAuth(createAuthOptions(env, db));
  return {
    async getSession(request: Request): Promise<AuthIdentity | null> {
      const session = await auth.api.getSession({ headers: request.headers });
      return session ? { userId: session.user.id } : null;
    },
    handler(request: Request): Promise<Response> {
      return auth.handler(request);
    },
  };
}
