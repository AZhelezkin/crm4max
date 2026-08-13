import { resolve } from 'path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.mts', '.ts', '.tsx', '.mjs', '.js', '.jsx', '.json'],
    alias: {
      '@': resolve(__dirname, 'src'),
      '@client': resolve(__dirname, 'src/client'),
      '@vkontakte/vk-bridge': resolve(__dirname, 'src/lib/bridge.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs'],
    clearMocks: true,
    restoreMocks: true,
    unstubEnvs: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/styles/**',
        'src/**/types/**',
        'src/**/*Skeleton.tsx',
        'src/components/onboardingStepOne.styles.ts',
      ],
      thresholds: {
        statements: 81,
        branches: 82,
        functions: 74,
        lines: 81,
        'src/App.tsx': { statements: 97, branches: 92, functions: 75, lines: 97 },
        'src/api/auth.api.ts': { statements: 99, branches: 79, functions: 99, lines: 99 },
        'src/client/api/auth.api.ts': { statements: 86, branches: 59, functions: 99, lines: 86 },
        'src/api/client.ts': { statements: 99, branches: 99, functions: 99, lines: 99 },
        'src/client/api/client.ts': { statements: 99, branches: 99, functions: 99, lines: 99 },
        'src/store/auth.store.ts': { statements: 99, branches: 99, functions: 99, lines: 99 },
        'src/client/store/auth.store.ts': { statements: 99, branches: 99, functions: 99, lines: 99 },
        'src/client/store/booking.store.ts': { statements: 99, branches: 99, functions: 99, lines: 99 },
        'src/client/lib/timezone.ts': { statements: 99, branches: 80, functions: 99, lines: 99 },
        'src/lib/calendar.ts': { statements: 99, branches: 92, functions: 99, lines: 99 },
        'src/hooks/usePaymentsExport.ts': { statements: 94, branches: 89, functions: 79, lines: 94 },
        'src/client/pages/QRScanPage.tsx': { statements: 99, branches: 95, functions: 99, lines: 99 },
        'src/standalone-pages/handoff/destination-selector/api.ts': { statements: 99, branches: 99, functions: 99, lines: 99 },
        'src/standalone-pages/handoff/destination-selector/route.ts': { statements: 99, branches: 99, functions: 99, lines: 99 },
        'src/standalone-pages/handoff/destination-selector/DestinationSelectorPage.tsx': { statements: 99, branches: 99, functions: 99, lines: 99 },
        'src/standalone-pages/handoff/destination-selector/useDestinationSelector.ts': { statements: 99, branches: 93, functions: 99, lines: 99 },
      },
    },
  },
})
