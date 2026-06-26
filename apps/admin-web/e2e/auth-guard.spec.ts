import { expect, test } from "@playwright/test";

test.describe("Admin auth guard", () => {
  test("redirects an unauthenticated dashboard visit to login", async ({
    page
  }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByLabel(/correo|email/i)).toBeVisible();
    await expect(page.locator("input[name='password']")).toBeVisible();
  });
});
