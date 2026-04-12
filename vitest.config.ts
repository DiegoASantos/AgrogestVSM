import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: [
      "apps/api/src/**/*.test.ts",
      "apps/admin-web/src/**/*.test.ts",
      "apps/mobile/src/**/*.test.ts",
      "packages/**/src/**/*.test.ts"
    ],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
    passWithNoTests: false
  }
});
