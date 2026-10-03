import { expect, test } from "@playwright/test";

test("producer submits a creditor on a phone without seeing harvest fields", async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let saved = false;
  await page.route("**/comercial/productor/**", async (route) => {
    const request = route.request();
    const headers = {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, PATCH, OPTIONS",
      "access-control-allow-headers": "Authorization, Content-Type"
    };
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    const path = new URL(request.url()).pathname;
    const creditor = {
      id: "20",
      publicId: "550e8400-e29b-41d4-a716-446655440001",
      creditorFirstName: "María",
      creditorLastName: "Pérez",
      creditorDocumentType: "DNI",
      creditorDocumentNumber: "12345678",
      bank: "BCP",
      accountNumber: "12345678901234567890",
      approvalStatus: "PENDING",
      source: "PRODUCTOR",
      reviewObservation: null,
      createdAt: "2026-10-02T00:00:00.000Z",
      updatedAt: "2026-10-02T00:00:00.000Z"
    };
    const data = path.endsWith("/sesion")
      ? {
          session: "producer-session",
          producerName: "Pedro Ríos",
          expiresInSeconds: 1800
        }
      : request.method() === "POST"
        ? creditor
        : saved
          ? [creditor]
          : [];
    if (path.endsWith("/acreedores") && request.method() === "POST") saved = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data, timestamp: new Date().toISOString() }),
      headers
    });
  });

  await page.goto("/productor/acreedores");
  await page.getByLabel("Código de acceso").fill("ABCD-EFGH-JKLM-NPQR");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("Pedro Ríos")).toBeVisible();
  await page.getByLabel("Nombres", { exact: true }).fill("María");
  await page.getByLabel("Apellidos").fill("Pérez");
  await page.getByLabel("Número de documento").fill("12345678");
  await page.getByLabel("Número de cuenta o CCI").fill("12345678901234567890");
  await page.getByRole("button", { name: "Revisar datos antes de enviar" }).click();
  await expect(page.getByRole("region", { name: "Confirma los datos" })).toBeVisible();
  await page.getByRole("button", { name: "Confirmar y enviar" }).click();
  await expect(page.getByText("Pendiente de revisión")).toBeVisible();
  await expect(page.getByText("Datos enviados.", { exact: false })).toBeVisible();
  await expect(page.getByText("Registro de cosecha")).toHaveCount(0);
});
