import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  test: {
    // Include .test.ts files in src and tests/unit
    include: [
      "tests/unit/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "src/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
    ],
    // Explicitly exclude .spec.ts files as they are likely Playwright tests
    exclude: ["**/*.spec.ts", "node_modules/**", "dist/**"],
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "~": path.resolve(__dirname, "./src"),
    },
  },
});
