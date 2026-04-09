import { defineConfig } from "vite";
import { reactRouter } from "@react-router/dev/vite";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  // react-map-gl uses the `react-map-gl/maplibre` subpath export, which Node's ESM
  // resolver cannot treat as a package entry (ERR_UNSUPPORTED_DIR_IMPORT). Bundling
  // the package via noExternal fixes SSR on Vercel. The package is safe to load in
  // Node as long as no map component actually renders on the server — each surface
  // must use an isClient guard, <ClientOnly>, or an auth/loader gate that prevents
  // the map tree from rendering during SSR. Do not remove noExternal without first
  // converting all map imports to dynamic client-only imports.
  ssr: {
    noExternal: ["react-map-gl"],
  },
  plugins: [
    reactRouter(),
    VitePWA({
      strategies: "generateSW",
      registerType: "prompt",
      devOptions: { enabled: false },
      includeAssets: [
        "robots.txt",
        "favicon-16x16.png",
        "favicon-32x32.png",
        "android-chrome-192x192.png",
        "android-chrome-512x512.png",
        "apple-touch-icon.png",
      ],
      manifest: {
        name: "Plano — The world's architecture, cataloged.",
        short_name: "Plano",
        description:
          "Track your architecture visits, rate buildings, and discover what friends are exploring.",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        maximumFileSizeToCacheInBytes: 5000000,
        // React Router SSR client build has no precached `index.html`; a NavigationRoute
        // bound to it throws workbox "non-precached-url". Offline shell is server-driven.
        navigateFallback: null,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "~": path.resolve(__dirname, "./src"),
      // react-map-gl resolves mapbox-gl; we use maplibre-gl as the implementation
      "mapbox-gl": "maplibre-gl",
    },
  },
}));
