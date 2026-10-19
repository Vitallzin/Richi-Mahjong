import { defineConfig } from 'vitest/config';

// Regras de segurança do Realtime Database (spec 13.7), no emulador: `npm run test:rules`.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    testTimeout: 30_000,
    fileParallelism: false,
  },
});
