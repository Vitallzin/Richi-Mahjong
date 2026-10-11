import { defineConfig } from 'vitest/config';

// Simulações longas (spec 14.2). Rodam em job separado: `npm run test:sim`.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/sim/**/*.test.ts'],
    testTimeout: 30 * 60 * 1000,
  },
});
