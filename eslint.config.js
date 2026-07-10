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
      // Design-sync tool I/O (cache, review output, generated config, vendored
      // bundles) — not app source. .ds-sync/ and ds-bundle/ are also gitignored.
      ".design-sync/**",
      ".ds-sync/**",
      "ds-bundle/**",
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
  {
    // Token discipline (design-system e8d58798, see design-system/_adherence.oxlintrc.json).
    // The shared design layer — shadcn primitives and the global chrome — must express
    // colour through token aliases, never a raw hex. Error-level because every directory
    // listed is clean today, so this only ever fires on a regression (no warning-ratchet
    // impact). src/features/feed joined the list with the feed conformance PR.
    //
    // Deliberately NOT ported: the design system's blanket "no raw px" rule. It would
    // contradict .cursor/rules/03-frontend.mdc, which treats *structural* utilities
    // (min-h-[120px], w-[3.25rem]) as unrestricted and governs only *visual* tokens.
    // The remaining feature directories still carry raw hex values; burn those down
    // per-surface during the design conformance sweep, then widen `files` here.
    // src/features/buildings joined the list with the building-detail conformance PR.
    // src/features/localities and src/features/guides joined with the city+guides PR.
    // src/features/{search,explore,maps} joined with the map/explore/itinerary PR.
    // src/features/{connect,notifications} joined with the events+connect+notifications PR.
    //
    // maps is the one directory covered as *.ts as well as *.tsx: every hex it ever held
    // lived in .ts (constants.ts, utils/pinStyling.ts), which is precisely how the lime
    // markers survived six conformance PRs. Its single sanctioned hex mirror,
    // constants/mapMarkerFills.ts, carries a documented file-level disable.
    //
    // src/features/events is deliberately NOT listed *yet*. Its listing surface is clean,
    // but EventDetail.tsx paints its hero with `style={{ color: "#ffffff" }}` beside two
    // raw `rgba(…)` inline styles; clearing only the literal this selector can see, while
    // leaving its two siblings, would be gaming the guard. Add the directory once the
    // detail surface is swept.
    //
    // src/features/collections is deliberately NOT listed: its custom-category colour
    // picker stores member-chosen hexes as data, not as design tokens.
    files: [
      "src/components/ui/**/*.tsx",
      "src/components/layout/**/*.tsx",
      "src/features/feed/**/*.tsx",
      "src/features/buildings/**/*.tsx",
      "src/features/localities/**/*.tsx",
      "src/features/guides/**/*.tsx",
      "src/features/search/**/*.tsx",
      "src/features/explore/**/*.tsx",
      "src/features/connect/**/*.{ts,tsx}",
      "src/features/notifications/**/*.{ts,tsx}",
      "src/features/maps/**/*.{ts,tsx}",
    ],
    ignores: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/#[0-9a-fA-F]{3,8}/]",
          message:
            "Raw hex colour in the shared design layer. Use a design token alias (docs/DESIGN_TOKENS.md) — e.g. text-text-primary, bg-brand-accent, border-border-default.",
        },
      ],
    },
  },
);
