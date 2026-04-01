import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  appDirectory: "src",
  routes: "app/routes.ts",
} satisfies Config;

