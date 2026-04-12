/**
 * Playwright E2E spec — create a visita through the admin web.
 *
 * Artifact only. See login.spec.ts for setup instructions.
 *
 * Preconditions (seed data the API must already contain):
 *   - At least one productor
 *   - At least one parcela belonging to that productor
 *   - At least one agronomo (tecnico) user
 *   - A campania abierta
 *
 * This test is the closest thing to a full-stack smoke: it exercises
 *   admin-web → API → DB → admin-web (list refresh).
 */
import { expect, test } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@agrogest.pe";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "changeme";

test.describe("Visita CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel(/correo|email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/contrase|password/i).fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /iniciar|login/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("creates a visita and sees it in the list", async ({ page }) => {
    await page.getByRole("link", { name: /visitas/i }).click();
    await expect(page).toHaveURL(/\/visitas/);

    const rowsBefore = await page.getByRole("row").count();

    await page.getByRole("button", { name: /nueva|crear visita/i }).click();

    // Fill the form with the first available option in each select.
    await page.getByLabel(/productor/i).selectOption({ index: 1 });
    await page.getByLabel(/parcela/i).selectOption({ index: 1 });
    await page.getByLabel(/t[eé]cnico|agr[oó]nomo/i).selectOption({ index: 1 });
    await page.getByLabel(/fecha/i).fill("2025-12-01");

    await page.getByRole("button", { name: /guardar|crear/i }).click();

    // Expect to be back on the list, with one more row.
    await expect(page).toHaveURL(/\/visitas/);
    await expect
      .poll(async () => page.getByRole("row").count(), { timeout: 5_000 })
      .toBeGreaterThan(rowsBefore);
  });
});
