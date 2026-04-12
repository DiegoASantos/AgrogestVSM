/**
 * Playwright config — artifact only.
 *
 * Install with:
 *   pnpm --filter @agrogest/admin-web add -D @playwright/test
 *   pnpm exec playwright install chromium
 *
 * Run against a local stack:
 *   pnpm --filter @agrogest/admin-web exec playwright test
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
