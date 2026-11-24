import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/scene-manifest.ts',
        'src/lib/hotspot-store.ts',
        'src/lib/offline-queue.ts',
        'src/lib/api-client.ts',
        'api/src/lib/events.ts',
        'api/src/lib/retrieval.ts',
        'api/src/lib/prompt.ts',
        'api/src/lib/quota.ts',
        'api/src/lib/intent.ts',
        'api/src/lib/mastery.ts',
        'api/src/lib/badge.ts',
      ],
      reporter: ['text', 'json-summary'],
      thresholds: {
        branches: 80,
        perFile: true,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
