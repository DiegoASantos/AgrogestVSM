import { expect, test, type Page } from "@playwright/test";

async function mockApi(page: Page, role = "ADMIN", withAgronomists = true) {
  const prices = new Map<string, object>();
  const calls: string[] = [];
  const state = { failPriceSave: false };
  let estimatedVisits = 7;
  await page.addInitScript(() => sessionStorage.setItem("agrogest-admin-refresh-token", "spec115-test-refresh"));
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const endpoint = url.pathname.replace(/^\/api(?=\/)/, "");
    const isApi = /^\/(auth|estimaciones\/semanas|pagos\/|notificaciones\/|clima\/|productores\/duplicados)/.test(endpoint);
    if (!isApi) {
      if (url.origin === new URL(test.info().project.use.baseURL as string).origin) return route.continue();
      return route.abort();
    }
    calls.push(`${request.method()} ${endpoint}`);
    const reply = (data: unknown, meta?: object) => route.fulfill({ json: { success: true, timestamp: new Date().toISOString(), data, meta } });
    if (endpoint === "/auth/refresh") return reply({ accessToken: "spec115-test-access", refreshToken: "spec115-test-refresh", tokenType: "Bearer", expiresIn: "15m" });
    if (endpoint === "/auth/me") return reply({ publicId: "spec115-user", firstName: "Usuario", lastName: "Prueba", email: "test@example.local", phone: null, isActive: true, roles: [{ id: 1, code: role, name: role, description: null }] });
    const match = endpoint.match(/^\/estimaciones\/semanas\/(\d{4}-\d{2}-\d{2})(\/precios)?$/);
    if (match) {
      const start = new Date(`${match[1]}T00:00:00Z`);
      start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() || 7) - 1));
      const startDate = start.toISOString().slice(0, 10);
      start.setUTCDate(start.getUTCDate() + 6);
      const endDate = start.toISOString().slice(0, 10);
      if (match[2]) {
        if (request.method() === "PUT") {
          if (state.failPriceSave) {
            state.failPriceSave = false;
            return route.fulfill({ status: 500, json: { success: false, error: { message: "No se pudo guardar el precio.", statusCode: 500 } } });
          }
          const body = request.postDataJSON();
          if (body.precioMinimo === null) prices.delete(startDate);
          else prices.set(startDate, { ...body, publicId: "spec115-price", createdAt: "2026-10-21T12:00:00Z", updatedAt: "2026-10-21T12:00:00Z", createdByName: "Usuario Prueba", updatedByName: "Usuario Prueba" });
        }
        return reply({ startDate, endDate, priceRange: prices.get(startDate) ?? null });
      }
      if (request.method() === "PUT") estimatedVisits = request.postDataJSON().estimaciones[0].visitasEstimadas;
      if (!withAgronomists) return reply({ startDate, endDate, totals: { agronomists: 0, withEstimate: 0, estimatedVisits: 0, actualVisits: 0, difference: 0 }, rows: [] });
      return reply({ startDate, endDate, totals: { agronomists: 1, withEstimate: 1, estimatedVisits, actualVisits: 0, difference: -estimatedVisits }, rows: [{ agronomistUserId: "1", engineerName: "Ingeniero Prueba", isActive: true, isEditable: true, estimatePublicId: "estimate", estimatedVisits, actualVisits: 0, difference: -estimatedVisits, compliancePercentage: 0, createdAt: null, updatedAt: null, createdByName: null, updatedByName: null }] });
    }
    if (endpoint === "/pagos/catalogos") return reply({ productores: [], supervisores: [], acreedores: [] });
    if (endpoint === "/notificaciones/operativas") return reply({ rows: [], total: 0, unreadCount: 0, items: [] });
    return reply([], { total: 0 });
  });
  return { state, calls };
}

test("precios: validación, error recuperable, pestañas y guardado independiente de visitas", async ({ page }) => {
  const { state } = await mockApi(page);
  await page.goto("/estimaciones");
  await page.getByLabel("Visitas estimadas para Ingeniero Prueba").fill("9");
  await page.getByRole("tab", { name: "Precios por jaba" }).click();
  const minimum = page.getByLabel("Precio mínimo (S/ por jaba)");
  const maximum = page.getByLabel("Precio máximo (S/ por jaba)");
  await minimum.fill("30");
  await maximum.fill("20");
  await page.getByRole("button", { name: "Guardar precios" }).click();
  await expect(page.getByRole("tabpanel").getByRole("alert")).toContainText("mínimo no puede ser mayor");
  await minimum.fill("20,50");
  await maximum.fill("30");
  await page.getByRole("tab", { name: "Visitas", exact: true }).click();
  await expect(page.getByLabel("Visitas estimadas para Ingeniero Prueba")).toHaveValue("9");
  await page.getByRole("tab", { name: "Precios por jaba" }).click();
  await expect(minimum).toHaveValue("20,50");
  state.failPriceSave = true;
  await page.getByRole("button", { name: "Guardar precios" }).click();
  await expect(page.getByRole("tabpanel").getByRole("alert")).toContainText("No se pudo guardar");
  await expect(minimum).toHaveValue("20,50");
  await page.getByRole("button", { name: "Guardar precios" }).click();
  await expect(page.getByRole("status")).toHaveText("Precios guardados.");
  await page.screenshot({ path: test.info().outputPath("precios-por-jaba.png"), fullPage: true });
  await page.getByRole("tab", { name: "Visitas", exact: true }).click();
  await expect(page.getByLabel("Visitas estimadas para Ingeniero Prueba")).toHaveValue("9");
  await page.getByRole("button", { name: "Guardar cambios (1)" }).click();
  await expect(page.getByRole("status")).toContainText("Estimaciones guardadas");
  await page.reload();
  await page.getByRole("tab", { name: "Precios por jaba" }).click();
  await expect(minimum).toHaveValue("20.5");
  await minimum.fill("");
  await maximum.fill("");
  await page.getByRole("button", { name: "Guardar precios" }).click();
  await expect(page.getByRole("status")).toHaveText("Estimación de precios retirada.");
  await expect(page.getByText("Sin estimación", { exact: true })).toBeVisible();
});

test("precios: advierte al cambiar de semana y mantiene semanas independientes", async ({ page }) => {
  await mockApi(page);
  await page.goto("/estimaciones");
  await page.getByRole("tab", { name: "Precios por jaba" }).click();
  await page.getByLabel("Precio mínimo (S/ por jaba)").fill("10");
  await page.getByLabel("Precio máximo (S/ por jaba)").fill("20");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Semana siguiente", exact: true }).click();
  await expect(page.getByLabel("Precio mínimo (S/ por jaba)")).toHaveValue("10");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Semana siguiente", exact: true }).click();
  await expect(page.getByLabel("Precio mínimo (S/ por jaba)")).toHaveValue("");
  await expect(page.getByText("Sin estimación", { exact: true })).toBeVisible();
});

test("tesorero: inicia en pagos y solo presenta sus cuatro módulos", async ({ page }) => {
  const { calls } = await mockApi(page, "TESORERO_PAGOS");
  await page.goto("/login");
  await expect(page).toHaveURL(/\/pagos$/);
  const sidebar = page.locator("aside nav");
  await sidebar.getByRole("button", { name: "Mantenimiento", exact: true }).click();
  await expect(sidebar.getByRole("link")).toHaveCount(4);
  for (const name of ["Pagos", "Productores", "Parcelas", "Acreedores de cosecha"]) {
    await expect(sidebar.getByRole("link", { name, exact: true })).toBeVisible();
  }
  await page.goto("/estimaciones");
  await expect(page.getByText("No tienes permisos para este modulo.", { exact: true })).toBeVisible();
  expect(calls.some((call) => call.includes("/estimaciones/") || call.includes("/notificaciones/"))).toBe(false);
  await expect(page.getByRole("link", { name: "Ir al inicio" })).toHaveAttribute("href", "/pagos");
});

test("precios: permite estimar sin agrónomos activos", async ({ page }) => {
  await mockApi(page, "ANALISTA", false);
  await page.goto("/estimaciones");
  await expect(page.getByText("No hay agrónomos para planificar", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Precios por jaba" }).click();
  await page.getByLabel("Precio mínimo (S/ por jaba)").fill("0");
  await page.getByLabel("Precio máximo (S/ por jaba)").fill("0");
  await page.getByRole("button", { name: "Guardar precios" }).click();
  await expect(page.getByRole("status")).toHaveText("Precios guardados.");
});
