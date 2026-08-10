import base, { TENANT_HOST_RESOLVER_ARGS } from './playwright.config';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  ...base,
  use: {
    ...base.use,
    headless: true,
    launchOptions: {
      args: TENANT_HOST_RESOLVER_ARGS,
    },
  },
});
