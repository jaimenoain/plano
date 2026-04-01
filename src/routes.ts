import type { RouteConfig } from "@react-router/dev/routes";
import { route, layout, index } from "@react-router/dev/routes";

export default [
  // Public / standalone routes
  route("/auth", "./features/auth/pages/Auth.tsx"),
  route("/update-password", "./features/auth/pages/UpdatePassword.tsx"),
  route("/onboarding", "./features/auth/pages/Onboarding.tsx"),
  route("/terms", "./pages/Terms.tsx"),
  route("/admin/unauthorized", "./features/admin/pages/Unauthorized.tsx"),

  // Admin routes wrapped with guard + layout
  layout("/admin", "./features/admin/components/AdminLayoutWithGuard.tsx", [
    index("./features/admin/pages/Dashboard.tsx"),
    route("buildings", "./features/admin/pages/Buildings.tsx"),
    route("users", "./features/admin/pages/Users.tsx"),
    route("moderation", "./features/admin/pages/Moderation.tsx"),
    route("images", "./features/admin/pages/ImageWall.tsx"),
    route("photos", "./features/admin/pages/PhotoAnalytics.tsx"),
    route("audit", "./features/admin/pages/BuildingAudit.tsx"),
    route("claims", "./features/admin/pages/ArchitectClaims.tsx"),
    route("storage-jobs", "./features/admin/pages/StorageJobs.tsx"),
    route("system", "./features/admin/pages/System.tsx"),
  ]),

  // Main app routes wrapped in sidebar layout
  layout("/", "./components/layout/MainLayout.tsx", [
    index("./features/feed/pages/Index.tsx"),
    route("explore", "./features/explore/pages/Explore.tsx"),
    route("search", "./features/search/SearchPage.tsx"),
    route("post", "./pages/Post.tsx"),
    route("notifications", "./features/notifications/pages/Notifications.tsx"),
    route("add-building", "./features/buildings/pages/AddBuilding.tsx"),
    route("connect", "./features/connect/pages/Connect.tsx"),

    // Explicit 404 for /groups to avoid username collision
    route("groups/*", "./pages/NotFound.tsx"),

    route("profile", "./features/profile/pages/Profile.tsx"),
    route("profile/:username", "./features/profile/pages/Profile.tsx"),
    route("profile/photos", "./features/profile/pages/UserPhotoGallery.tsx"),
    route("profile/:username/photos", "./features/profile/pages/UserPhotoGallery.tsx"),
    route("settings", "./features/profile/pages/Settings.tsx"),

    route(":username/map/:slug", "./features/collections/components/CollectionMapPage.tsx"),
    route(":username/folders/:slug", "./features/profile/pages/FolderView.tsx"),

    route("building/:id/:slug", "./features/buildings/pages/BuildingDetails.tsx"),
    route("building/:id", "./features/buildings/pages/BuildingDetails.tsx"),
    route("building/:id/:slug/edit", "./features/buildings/pages/EditBuilding.tsx"),
    route("building/:id/edit", "./features/buildings/pages/EditBuilding.tsx"),

    route("architect/dashboard", "./features/architect/pages/ArchitectDashboard.tsx"),
    route("architect/:id", "./features/architect/pages/ArchitectDetails.tsx"),
    route("architect/:id/edit", "./features/architect/pages/EditArchitect.tsx"),

    // Review flow
    route("building/:id/:slug/review", "./features/buildings/pages/WriteReview.tsx"),
    route("building/:id/review", "./features/buildings/pages/WriteReview.tsx"),
    route("review/:id", "./features/buildings/pages/ReviewDetails.tsx"),

    // Catch-all 404
    route("*", "./pages/NotFound.tsx"),
  ]),
] satisfies RouteConfig;

import {
  type RouteConfig,
  route,
  layout,
  index,
} from "@react-router/dev/routes";

export default [
  // Public / Standalone routes
  route("/auth", "features/auth/pages/Auth.tsx"),
  route("/update-password", "features/auth/pages/UpdatePassword.tsx"),
  route("/onboarding", "features/auth/pages/Onboarding.tsx"),
  route("/terms", "pages/Terms.tsx"),
  route("/admin/unauthorized", "features/admin/pages/Unauthorized.tsx"),
  route("/admin/merge", "features/admin/pages/MergeBuildings.tsx"),
  route(
    "/admin/merge/:targetId/:sourceId",
    "features/admin/pages/MergeComparison.tsx",
  ),

  // Admin routes (auth-guarded via AdminLayoutWithGuard)
  layout("features/admin/components/AdminLayoutWithGuard.tsx", [
    route("/admin", "features/admin/pages/Dashboard.tsx"),
    route("/admin/buildings", "features/admin/pages/Buildings.tsx"),
    route("/admin/users", "features/admin/pages/Users.tsx"),
    route("/admin/moderation", "features/admin/pages/Moderation.tsx"),
    route("/admin/images", "features/admin/pages/ImageWall.tsx"),
    route("/admin/photos", "features/admin/pages/PhotoAnalytics.tsx"),
    route("/admin/audit", "features/admin/pages/BuildingAudit.tsx"),
    route("/admin/claims", "features/admin/pages/ArchitectClaims.tsx"),
    route("/admin/storage-jobs", "features/admin/pages/StorageJobs.tsx"),
  ]),

  // Main app routes (wrapped in MainLayout sidebar)
  layout("components/layout/MainLayout.tsx", [
    index("features/feed/pages/Index.tsx"),
    route("/explore", "features/explore/pages/Explore.tsx"),
    route("/search", "features/search/SearchPage.tsx"),
    route("/post", "pages/Post.tsx"),
    route("/notifications", "features/notifications/pages/Notifications.tsx"),
    route("/add-building", "features/buildings/pages/AddBuilding.tsx"),
    route("/connect", "features/connect/pages/Connect.tsx"),

    // Explicit 404 guard — must come before /:username routes
    route("/groups/*", "pages/NotFound.tsx"),

    // Profile routes — /profile/photos must come before /profile/:username
    // to prevent "photos" being captured as a username param
    route("/profile", "features/profile/pages/Profile.tsx"),
    route("/profile/photos", "features/profile/pages/UserPhotoGallery.tsx"),
    route("/profile/:username", "features/profile/pages/Profile.tsx"),
    route(
      "/profile/:username/photos",
      "features/profile/pages/UserPhotoGallery.tsx",
    ),

    route("/settings", "features/profile/pages/Settings.tsx"),
    route(
      "/:username/map/:slug",
      "features/collections/components/CollectionMapPage.tsx",
    ),
    route(
      "/:username/folders/:slug",
      "features/profile/pages/FolderView.tsx",
    ),

    // Building routes — specific paths before param paths
    route(
      "/building/:id/:slug/edit",
      "features/buildings/pages/EditBuilding.tsx",
    ),
    route(
      "/building/:id/:slug/review",
      "features/buildings/pages/WriteReview.tsx",
    ),
    route(
      "/building/:id/:slug",
      "features/buildings/pages/BuildingDetails.tsx",
    ),
    route("/building/:id/edit", "features/buildings/pages/EditBuilding.tsx"),
    route(
      "/building/:id/review",
      "features/buildings/pages/WriteReview.tsx",
    ),
    route("/building/:id", "features/buildings/pages/BuildingDetails.tsx"),

    // Architect routes
    route(
      "/architect/dashboard",
      "features/architect/pages/ArchitectDashboard.tsx",
    ),
    route("/architect/:id/edit", "features/architect/pages/EditArchitect.tsx"),
    route("/architect/:id", "features/architect/pages/ArchitectDetails.tsx"),

    // Review
    route("/review/:id", "features/buildings/pages/ReviewDetails.tsx"),

    // Catch-all 404
    route("*", "pages/NotFound.tsx"),
  ]),
] satisfies RouteConfig;

