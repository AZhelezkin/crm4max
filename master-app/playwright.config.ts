import { defineConfig, devices } from '@playwright/test'

const APP_URL = 'http://127.0.0.1:4173/crm4max/'

const noProxy = new Set(
  `${process.env.NO_PROXY ?? ''},${process.env.no_proxy ?? ''}`
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
)
noProxy.add('127.0.0.1')
noProxy.add('localhost')
process.env.NO_PROXY = Array.from(noProxy).join(',')
process.env.no_proxy = process.env.NO_PROXY

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: APP_URL,
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'max-mobile-chromium',
      use: {
        ...devices['Pixel 7'],
        browserName: 'chromium',
      },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
    url: APP_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      VITE_API_URL: '',
      VITE_BASE_PATH: '/crm4max/',
      VITE_VK_APP_ID: '12345',
    },
  },
})
