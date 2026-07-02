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
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "~": path.resolve(__dirname, "./src"),
    },
    coverage: {
      provider: "v8",
      // text-summary prints to the CI log; html + lcov are uploaded as an artifact.
      reporter: ["text", "text-summary", "html", "lcov"],
      reportsDirectory: "./coverage",
      // Measure only the app source. Supabase edge functions (api/, app/,
      // supabase/functions/) run on Deno and aren't exercised by these tests.
      include: ["src/**"],
      // No thresholds yet — reporting only. Enable a `thresholds` block once the
      // suite is fully green so coverage can't silently erode.
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
