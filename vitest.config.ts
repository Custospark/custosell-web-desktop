import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: [
      'src/renderer/modules/pipeline/api/__tests__/**/*.test.{ts,tsx}',
      'src/renderer/shared/utils/__tests__/**/*.test.{ts,tsx}',
    ],
    restoreMocks: true,
    clearMocks: true,
  },
});