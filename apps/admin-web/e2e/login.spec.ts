/**
 * Playwright E2E spec — login happy path + restricted route check.
 *
 * This file is an artifact, not a wired-up test. To run it you need to:
 *
 *   1) pnpm --filter @agrogest/admin-web add -D @playwright/test
 *   2) pnpm exec playwright install chromium
 *   3) Start the API and the admin-web dev servers locally, or point
 *      PLAYWRIGHT_BASE_URL at a staging environment.
 *   4) pnpm --filter @agrogest/admin-web exec playwright test e2e/login.spec.ts
 *
 * Seed data expected:
 *   - An admin user with email/password controlled by the environment
 *     variables E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD.
 *
 * The purpose of this spec is to guard the critical session boundary:
 *   - unauthenticated visits to /dashboard redirect to /login
 *   - login with valid credentials lands on /dashboard
 *   - the session survives a hard reload
 *   - logout returns to /login
 */
import { expect, test } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@agrogest.pe";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "changeme";

test.describe("Auth flow", () => {
  test("redirects unauthenticated users from /dashboard to /login", async ({
    page
  }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(/\/login/);
  });

  test("logs in with valid credentials and lands on /dashboard", async ({
    page
  }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel(/correo|email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/contrase|password/i).fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /iniciar|login/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
    await expect(page.getByText(/panel/i).first()).toBeVisible();
  });

  test("session persists across a hard reload", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel(/correo|email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/contrase|password/i).fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /iniciar|login/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("logout returns to /login", async ({ page }) => {
    // assumes previous session state; if running standalone, log in again first
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel(/correo|email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/contrase|password/i).fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /iniciar|login/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole("button", { name: /cerrar sesi|logout/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
