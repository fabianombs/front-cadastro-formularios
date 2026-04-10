import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      exclude: [
        '**/*.html',
        '**/*.scss',
        '**/node_modules/**',
        '**/dist/**',
        '**/*.d.ts',
        '**/main.ts',
        '**/environments/**',
      ],
    },
  },
});
