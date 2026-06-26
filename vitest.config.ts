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
    passWithNoTests: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage",
      include: [
        "apps/api/src/**/*.{ts,tsx}",
        "apps/admin-web/src/**/*.ts",
        "apps/mobile/src/**/*.{ts,tsx}",
        "packages/**/src/**/*.ts"
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/*.d.ts",
        "**/types/**",
        "**/presentation/**",
        "**/components/**",
        "**/app/**",
        "**/assets/**",
        "**/node_modules/**",
        "**/dist/**",
        "**/.next/**"
      ],
      thresholds: {
        statements: 15,
        branches: 10,
        functions: 10,
        lines: 15
      }
    }
  }
});
