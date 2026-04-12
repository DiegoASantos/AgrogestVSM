import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.next/**",
      "**/.expo/**",
      "**/.expo-shared/**",
      "**/.pnpm-store/**",
      "**/.qodo/**",
      "**/coverage/**",
      "**/*.d.ts",
      "**/*.tsbuildinfo",
      "apps/admin-web/e2e/**",
      "apps/admin-web/playwright.config.ts",
      "tools/load-tests/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,cjs,mjs,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-undef": "off"
    }
  },
  {
    files: [
      "apps/api/**/*.{js,cjs,mjs,ts}",
      "**/*.config.{js,cjs,mjs,ts}",
      "eslint.config.mjs"
    ],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },
  {
    files: ["apps/admin-web/src/**/*.{ts,tsx}", "apps/mobile/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  }
];
