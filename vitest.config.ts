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
  },
});
