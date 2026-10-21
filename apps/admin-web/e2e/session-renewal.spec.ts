import { expect, test, type Page } from "@playwright/test";

async function sessionApi(page: Page) {
  const state = { refreshCount: 0, expired: false, failRefresh: false, revoke: false, delayPrice401: false };
  let refreshToken = "session-test-refresh-0";
  let accessToken = "session-test-access-0";
  let priceRange: object | null = null;
  await page.addInitScript(() => sessionStorage.setItem("agrogest-admin-refresh-token", "session-test-refresh-0"));
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const endpoint = url.pathname.replace(/^\/api(?=\/)/, "");
    const isApi = /^\/(auth\/|estimaciones\/semanas|notificaciones\/|clima\/|productores\/duplicados)/.test(endpoint);
    if (!isApi) {
      if (url.origin === new URL(test.info().project.use.baseURL as string).origin) return route.continue();
      return route.abort();
    }
    const ok = (data: unknown) => route.fulfill({ json: { success: true, timestamp: new Date().toISOString(), data } });
    const fail = (status: number) => route.fulfill({ status, json: { success: false, error: { statusCode: status, message: status === 401 ? "Sesión rechazada" : "Servicio temporalmente no disponible" } } });
    if (endpoint === "/auth/refresh") {
      state.refreshCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (state.failRefresh) { state.failRefresh = false; return fail(503); }
      if (state.revoke || request.postDataJSON().refreshToken !== refreshToken) return fail(401);
      accessToken = `session-test-access-${state.refreshCount}`;
      refreshToken = `session-test-refresh-${state.refreshCount}`;
      state.expired = false;
      return ok({ accessToken, refreshToken, tokenType: "Bearer", expiresIn: "15m", refreshExpiresIn: "150d" });
    }
    if (endpoint === "/auth/me") {
      if (request.headers().authorization !== `Bearer ${accessToken}`) return fail(401);
      return ok({ publicId: "test-user", firstName: "Usuario", lastName: "Prueba", email: "test@example.local", phone: null, isActive: true, roles: [{ id: 1, code: "ADMIN", name: "Admin", description: null }] });
    }
    if (endpoint.startsWith("/estimaciones/semanas/")) {
      const unauthorized = state.expired || request.headers().authorization !== `Bearer ${accessToken}`;
      if (unauthorized) {
        if (state.delayPrice401 && endpoint.endsWith("/precios")) await new Promise((resolve) => setTimeout(resolve, 500));
        return fail(401);
      }
      const date = endpoint.split("/")[3];
      const start = new Date(`${date}T00:00:00Z`);
      start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() || 7) - 1));
      const startDate = start.toISOString().slice(0, 10);
      start.setUTCDate(start.getUTCDate() + 6);
      const endDate = start.toISOString().slice(0, 10);
      if (endpoint.endsWith("/precios")) {
        if (request.method() === "PUT") priceRange = { ...request.postDataJSON(), publicId: "test-price", createdAt: "2026-10-21T12:00:00Z", updatedAt: "2026-10-21T12:00:00Z", createdByName: "Usuario Prueba", updatedByName: "Usuario Prueba" };
        return ok({ startDate, endDate, priceRange });
      }
      return ok({ startDate, endDate, totals: { agronomists: 1, withEstimate: 1, estimatedVisits: 7, actualVisits: 0, difference: -7 }, rows: [{ agronomistUserId: "1", engineerName: "Ingeniero Prueba", isActive: true, isEditable: true, estimatePublicId: "test-estimate", estimatedVisits: 7, actualVisits: 0, difference: -7, compliancePercentage: 0 }] });
    }
    if (endpoint === "/notificaciones/operativas") return ok({ rows: [], items: [], total: 0, unreadCount: 0 });
    return ok([]);
  });
  return state;
}

for (const delayed of [false, true]) {
  test(`renueva una sola vez con 401 ${delayed ? "tardíos" : "simultáneos"} y permanece en la web`, async ({ page }) => {
    const state = await sessionApi(page);
    await page.goto("/estimaciones");
    await expect(page.getByLabel("Visitas estimadas para Ingeniero Prueba")).toBeVisible();
    state.expired = true;
    state.delayPrice401 = delayed;
    await page.getByRole("button", { name: "Semana siguiente", exact: true }).click();
    await expect(page.getByLabel("Visitas estimadas para Ingeniero Prueba")).toBeVisible();
    await expect(page.getByRole("button", { name: "Semana siguiente", exact: true })).toBeEnabled();
    expect(state.refreshCount).toBe(2);
    await expect(page).toHaveURL(/\/estimaciones$/);
  });
}

test("renueva al guardar sin perder borradores abiertos en otra pestaña del módulo", async ({ page }) => {
  const state = await sessionApi(page);
  await page.goto("/estimaciones");
  await page.getByLabel("Visitas estimadas para Ingeniero Prueba").fill("19");
  await page.getByRole("tab", { name: "Precios por jaba" }).click();
  await page.getByLabel("Precio mínimo (S/ por jaba)").fill("20");
  await page.getByLabel("Precio máximo (S/ por jaba)").fill("30");
  state.expired = true;
  await page.getByRole("button", { name: "Guardar precios" }).click();
  await expect(page.getByRole("status")).toHaveText("Precios guardados.");
  await page.getByRole("tab", { name: "Visitas", exact: true }).click();
  await expect(page.getByLabel("Visitas estimadas para Ingeniero Prueba")).toHaveValue("19");
  expect(state.refreshCount).toBe(2);
  await expect(page).toHaveURL(/\/estimaciones$/);
});

test("un fallo temporal de refresh conserva sesión y permite reintentar", async ({ page }) => {
  const state = await sessionApi(page);
  await page.goto("/estimaciones");
  await page.getByRole("tab", { name: "Precios por jaba" }).click();
  await page.getByLabel("Precio mínimo (S/ por jaba)").fill("20");
  await page.getByLabel("Precio máximo (S/ por jaba)").fill("30");
  state.expired = true;
  state.failRefresh = true;
  await page.getByRole("button", { name: "Guardar precios" }).click();
  await expect(page.getByRole("tabpanel").getByRole("alert")).toContainText("temporalmente");
  await expect(page).toHaveURL(/\/estimaciones$/);
  expect(await page.evaluate(() => sessionStorage.getItem("agrogest-admin-refresh-token"))).toBe("session-test-refresh-1");
  await expect(page.getByLabel("Precio mínimo (S/ por jaba)")).toHaveValue("20");
  await page.getByRole("button", { name: "Guardar precios" }).click();
  await expect(page.getByRole("status")).toHaveText("Precios guardados.");
  expect(state.refreshCount).toBe(3);
});

test("restaura tras una interrupción inicial sin borrar el refresh guardado", async ({ page }) => {
  const state = await sessionApi(page);
  state.failRefresh = true;
  await page.goto("/estimaciones");
  await expect.poll(() => state.refreshCount).toBe(1);
  await expect(page.getByText("Verificando acceso...", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("agrogest-admin-refresh-token"))).toBe("session-test-refresh-0");
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.getByLabel("Visitas estimadas para Ingeniero Prueba")).toBeVisible();
  expect(state.refreshCount).toBe(2);
});

test("una sesión revocada sí exige login, sin bucle de renovaciones", async ({ page }) => {
  const state = await sessionApi(page);
  await page.goto("/estimaciones");
  await expect(page.getByLabel("Visitas estimadas para Ingeniero Prueba")).toBeVisible();
  state.expired = true;
  state.revoke = true;
  await page.getByRole("button", { name: "Semana siguiente", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(state.refreshCount).toBe(2);
  expect(await page.evaluate(() => sessionStorage.getItem("agrogest-admin-refresh-token"))).toBeNull();
});
