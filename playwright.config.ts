import { defineConfig, devices } from '@playwright/test';

// Resolve tenant subdomains to the local Docker stack without touching
// /etc/hosts. Used by the tenant-isolation specs to run the real
// hostname-based tenant routing (rt-003.openrt.local / rt-004.openrt.local).
export const TENANT_HOST_RESOLVER_ARGS = [
  '--host-resolver-rules=MAP rt-003.openrt.local 127.0.0.1, MAP rt-004.openrt.local 127.0.0.1',
];

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    headless: false,
    launchOptions: {
      slowMo: 300,
      args: TENANT_HOST_RESOLVER_ARGS,
    },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
