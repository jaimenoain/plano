import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  test: {
    // Include .test.ts files in src and tests/unit, plus in-source tests
    include: [
      "tests/unit/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "src/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
    ],
    includeSource: ["src/utils/url.ts"],
    exclude: ["node_modules/**", "dist/**", "build/**"],
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // Placeholder Supabase credentials so `createBrowserClient` (invoked at
    // module load in src/integrations/supabase/client.ts) doesn't throw when
    // .env.local is absent, e.g. in CI. Tests mock the client, so these values
    // are never used for real requests.
    env: {
      VITE_SUPABASE_URL: "http://localhost:54321",
      VITE_SUPABASE_PUBLISHABLE_KEY: "test-anon-key",
    },
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "~": path.resolve(__dirname, "./src"),
    },
    coverage: {
      provider: "v8",
      // text-summary prints to the CI log; html + lcov are uploaded as an artifact;
      // json-summary feeds any future automated coverage ratchet.
      reporter: ["text", "text-summary", "html", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      // Measure only the app source. Supabase edge functions (api/, app/,
      // supabase/functions/) run on Deno and aren't exercised by these tests.
      include: ["src/**"],
      // Ratchet floor: ~1pt below the suite as measured 2026-07-06 (statements
      // 22.27, branches 18.9, functions 18.55, lines 23.49). Raise after any PR
      // that meaningfully adds tests; never lower without a documented reason.
      thresholds: {
        statements: 21,
        branches: 17,
        functions: 17,
        lines: 22,
      },
      exclude: [
        "**/*.config.{js,ts,mjs,cjs}",
        "**/*.d.ts",
        "src/test/**",
        "**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
        // Auto-generated Supabase types — nothing to cover.
        "src/integrations/supabase/types.ts",
      ],
    },
  },
});
