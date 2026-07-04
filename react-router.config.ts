import { vercelPreset } from "@vercel/react-router/vite";
import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  appDirectory: "src",
  presets: [vercelPreset()],
  future: {
    // Split each route module's client exports (clientLoader, etc.) into their
    // own chunks. Pure build-time optimization, no code changes required.
    v8_splitRouteModules: true,
    // NOTE: the remaining v8 flags (v8_passThroughRequests,
    // v8_trailingSlashAwareDataRequests, v8_middleware, v8_viteEnvironmentApi)
    // are intentionally deferred to the gated Phase 4 (react-router@8). The two
    // *DataRequests flags change `.data` URL/request semantics that our loaders
    // rely on for CDN caching (see BuildingDetails.loader.ts and the __manifest
    // stale-cache incident) and must be validated against a real v8 + Vercel
    // preview, which is blocked until @vercel/react-router ships RR8 support.
  },
} satisfies Config;

