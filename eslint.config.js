import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "build",
      "scripts/**",
      "supabase/**",
      "coverage/**",
      "repomix-output.xml",
      ".react-router/types/**",
      "**/*.timestamp-*.mjs",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Many screens intentionally pin effect deps to avoid refetch loops; fix incrementally per screen.
      "react-hooks/exhaustive-deps": "off",
      "react-refresh/only-export-components": ["off", { allowConstantExport: true }],

      // Prevent Phase 0 regressions
      "no-console": "error",

      // Prevent Phase 1 regressions
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-ignore": true,
          "ts-expect-error": "allow-with-description",
          "ts-nocheck": true,
        },
      ],

      // Code quality
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-duplicate-imports": "error",
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "tests/**/*.{ts,tsx}"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
  {
    files: [
      "src/components/ui/**/*.{ts,tsx}",
      "src/features/admin/components/NoPhotosMapZone.tsx",
      "src/features/auth/hooks/useAuth.tsx",
      "src/features/buildings/components/PersonalRatingButton.tsx",
      "src/features/maps/providers/MapContext.tsx",
      "src/hooks/usePwaInstall.tsx",
    ],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: ["src/features/admin/api/diagnostics.ts"],
    rules: {
      // Last-resort logging when Supabase diagnostic insert fails (cannot recurse into logDiagnosticError)
      "no-console": "off",
    },
  },
);
