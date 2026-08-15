import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: [
      'src/renderer/modules/pipeline/api/__tests__/**/*.test.{ts,tsx}',
      'src/renderer/modules/shifts/__tests__/**/*.test.{ts,tsx}',
      'src/renderer/modules/notes/**/*.test.{ts,tsx}',
      'src/renderer/app/store/offline/**/*.test.{ts,tsx}',
      'src/renderer/shared/utils/__tests__/**/*.test.{ts,tsx}',
      'src/renderer/shared/components/payments/__tests__/**/*.test.{ts,tsx}',
    ],
    restoreMocks: true,
    clearMocks: true,
  },
});