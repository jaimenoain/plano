import type { Config } from "@react-router/dev/config";
import { vercelPreset } from "@vercel/react-router";

export default {
  ssr: true,
  appDirectory: "src",
  routes: "app/routes.ts",
  presets: [vercelPreset],
} satisfies Config;

