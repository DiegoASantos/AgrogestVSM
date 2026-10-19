import { expect, test, type Page } from "@playwright/test";

async function stubGallery(page: Page, failPhotoList = false) {
  await page.addInitScript(() => {
    sessionStorage.setItem("agrogest-admin-refresh-token", "gallery-test-refresh");
  });
  const headers = {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "Authorization, Content-Type",
    "access-control-allow-methods": "GET, POST, OPTIONS"
  };
  const envelope = (data: unknown, total?: number) =>
    JSON.stringify({
      success: true,
      data,
      meta: { total },
      timestamp: "2026-10-19T12:00:00Z"
    });
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (!["fetch", "xhr"].includes(request.resourceType())) return route.continue();
    const url = new URL(request.url());
    if (
      !/\/(auth|comercial|notificaciones|productores|usuarios|dashboard)(\/|\?)/.test(
        url.pathname + url.search
      )
    )
      return route.continue();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (url.pathname.endsWith("/contenido")) {
      expect(request.headers().authorization).toBe("Bearer gallery-test-access");
      return route.fulfill({
        status: 200,
        headers,
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="700" height="900"><rect width="700" height="900" fill="#edf2e8"/><rect x="45" y="45" width="610" height="810" rx="8" fill="white"/><rect x="80" y="90" width="540" height="95" rx="6" fill="#14532d"/><text x="110" y="145" fill="white" font-size="32" font-family="sans-serif">Documento de prueba</text><path d="M85 250h530M85 310h400M85 370h530M85 430h460M85 550h530M85 610h400M85 670h530" stroke="#c6d6ca" stroke-width="12"/><circle cx="520" cy="760" r="45" fill="#dcfce7"/></svg>'
      });
    }
    let data: unknown = [];
    let total = 0;
    if (url.pathname.endsWith("/auth/refresh"))
      data = {
        accessToken: "gallery-test-access",
        refreshToken: "gallery-test-refresh",
        tokenType: "Bearer",
        expiresIn: "1h"
      };
    else if (url.pathname.endsWith("/auth/me"))
      data = {
        publicId: "gallery-test-user",
        firstName: "Usuario",
        lastName: "Prueba",
        email: "gallery@example.invalid",
        isActive: true,
        phone: null,
        roles: [{ id: 1, code: "ADMIN", name: "Administrador", description: null }]
      };
    else if (url.pathname.endsWith("/productores-con-fotos")) {
      data = url.searchParams.get("search")
        ? []
        : [
            {
              productorId: "1",
              productorNombre: "Productor de prueba",
              cantidadFotos: 3,
              ultimaFotoAt: "2026-10-19T12:00:00Z"
            }
          ];
      total = (data as unknown[]).length;
    } else if (url.pathname.endsWith("/productores/1/fotos")) {
      if (failPhotoList) {
        failPhotoList = false;
        return route.fulfill({
          status: 503,
          headers,
          contentType: "application/json",
          body: JSON.stringify({ success: false, error: { message: "Error de prueba" } })
        });
      }
      data = [1, 2, 3].map((id) => ({
        id: `photo-${id}`,
        publicId: `photo-${id}`,
        createdAt: "2026-10-19T12:00:00Z"
      }));
      total = 3;
    }
    return route.fulfill({
      status: 200,
      headers,
      contentType: "application/json",
      body: envelope(data, total)
    });
  });
  await page.goto("/mantenimiento/acreedores-cosecha/fotos");
  await page.getByRole("button", { name: "Ver fotos de Productor de prueba" }).click();
}

test("private thumbnails, zoom, keyboard navigation and focus restoration", async ({
  page
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await stubGallery(page);
  const first = page.getByRole("button", { name: "Ampliar foto 1", exact: true });
  await expect(first.locator("img")).toBeVisible();
  await expect(first.locator("img")).toHaveJSProperty("naturalWidth", 700);
  await page.screenshot({ path: "test-results/gallery-desktop.png", fullPage: true });
  await first.click();
  const viewer = page.getByRole("dialog", { name: "Productor de prueba" });
  await expect(viewer).toBeVisible();
  await viewer.getByRole("button", { name: "Aumentar zoom" }).click();
  await expect(viewer.getByText("150%", { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(viewer.getByText("2 de 3 en esta página")).toBeVisible();
  await expect(viewer.getByText("100%", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/gallery-viewer.png" });
  for (let index = 0; index < 8; index++) {
    await page.keyboard.press("Tab");
    const focus = await viewer.evaluate((node) => ({
      contained: node.contains(document.activeElement),
      active: document.activeElement?.tagName,
      label: document.activeElement?.getAttribute("aria-label")
    }));
    expect(focus.contained, JSON.stringify({ tab: index, ...focus })).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(viewer).toHaveCount(0);
  await expect(first).toBeFocused();
  // Re-selecting the same producer must finish loading, too.
  await page.getByRole("button", { name: "Ver fotos de Productor de prueba" }).click();
  await expect(first.locator("img")).toBeVisible();
  await page.getByRole("button", { name: "Cerrar galería" }).click();
  await expect(first).toHaveCount(0);
});

test("gallery list errors can be retried without losing the producer", async ({
  page
}) => {
  await stubGallery(page, true);
  await expect(
    page.getByText("No se pudieron cargar las fotos", { exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Ampliar foto 1", exact: true }).locator("img")
  ).toBeVisible();
});

test("narrow web layout, full-screen viewer and empty search state", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await stubGallery(page);
  const first = page.getByRole("button", { name: "Ampliar foto 1", exact: true });
  await expect(first.locator("img")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  ).toBe(true);
  await page.screenshot({ path: "test-results/gallery-narrow.png", fullPage: true });
  await first.click();
  const viewer = page.getByRole("dialog");
  await expect(viewer).toBeVisible();
  expect((await viewer.boundingBox())?.width).toBe(390);
  await viewer.getByRole("button", { name: "Cerrar visor" }).click();
  await page.getByLabel("Buscar productor").fill("sin coincidencias");
  await expect(
    page.getByText("No encontramos productores", { exact: true })
  ).toBeVisible();
});
