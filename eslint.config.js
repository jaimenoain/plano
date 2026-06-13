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
      // Surfaced as a warning for visibility. Many screens intentionally pin effect deps to avoid refetch
      // loops, so fixes are a deliberate per-screen follow-up — not a blocking gate (CI tolerates warnings).
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["off", { allowConstantExport: true }],

      // Prevent Phase 0 regressions. Allow warn/error (legitimate operational logging); ban log/info/debug.
      "no-console": ["error", { allow: ["warn", "error"] }],

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

      // Phase 1 guardrails (Theme D + G). WARN-level on purpose: there is a large existing
      // backlog (163 direct-client imports, 939 deep cross-feature imports). CI tolerates
      // warnings, so this surfaces the boundary in review and gates new code without breaking
      // the build. Burn the backlog down per-directory, then ratchet to "error" in a later phase.
      "no-restricted-imports": [
        "warn",
        {
          paths: [
            {
              name: "@/integrations/supabase/client",
              message:
                "The Supabase browser client belongs in a feature api/ module (src/features/*/api/**) or a route loader. Components and hooks should call a typed function there instead of querying Supabase directly.",
            },
            {
              name: "~/integrations/supabase/client",
              message:
                "The Supabase browser client belongs in a feature api/ module (src/features/*/api/**) or a route loader. Components and hooks should call a typed function there instead of querying Supabase directly.",
            },
          ],
          patterns: [
            {
              // Deep cross-feature imports reach into another feature's internals. Import from
              // the feature barrel (@/features/<feature>) or its public api/ instead.
              regex: "^[@~]/features/[^/]+/(?!(index|api)(/|$)).+",
              message:
                "Avoid deep cross-feature imports. Import from the feature barrel (@/features/<feature>) or its public api/ instead.",
            },
          ],
        },
      ],
    },
  },
  {
    // The Supabase browser client and deep imports are legitimate inside feature api/ modules,
    // route loaders, and the client definition itself. Turn the boundary rule off there.
    files: [
      "src/features/*/api/**/*.{ts,tsx}",
      "src/**/*.loader.ts",
      "src/integrations/supabase/client.ts",
    ],
    rules: {
      "no-restricted-imports": "off",
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
);
