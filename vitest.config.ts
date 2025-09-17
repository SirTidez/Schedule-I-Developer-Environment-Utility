import path from 'path';
import { configDefaults, defineConfig } from 'vitest/config';

const sharedProjectConfig = {
  globals: true,
  setupFiles: ['tests/setup/globals.ts'],
  mockReset: true,
  restoreMocks: true,
  clearMocks: true,
};

export default defineConfig({
  resolve: {
    alias: {
      '@main': path.resolve(__dirname, 'src/main'),
      '@preload': path.resolve(__dirname, 'src/preload'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  test: {
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
    },
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
    projects: [
      {
        name: 'main',
        test: {
          ...sharedProjectConfig,
          include: ['tests/main/**/*.test.ts', 'tests/preload/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        name: 'renderer',
        test: {
          ...sharedProjectConfig,
          include: ['tests/renderer/**/*.test.tsx', 'tests/renderer/**/*.test.ts'],
          environment: 'happy-dom',
        },
      },
    ],
  },
});
