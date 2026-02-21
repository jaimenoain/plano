import { defineConfig } from 'vitest/config'
import path from 'path'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  test: {
    // Include .test.ts files in src and tests/unit
    include: ['tests/unit/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}', 'src/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // Explicitly exclude .spec.ts files as they are likely Playwright tests
    exclude: ['**/*.spec.ts', 'node_modules/**', 'dist/**'],
    environment: 'jsdom',
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  },
})
