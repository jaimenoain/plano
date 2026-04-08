import {
  type RouteConfig,
  route,
  layout,
  index,
} from "@react-router/dev/routes";

export default [
  // Public / Standalone
  route("/login", "features/auth/pages/Auth.tsx", { id: "auth-login" }),
  route("/auth", "features/auth/pages/Auth.tsx", { id: "auth-root" }),
  route("/update-password", "features/auth/pages/UpdatePassword.tsx"),
  route("/onboarding", "features/auth/pages/Onboarding.tsx"),
  route("/terms", "pages/Terms.tsx"),
  route("/remove-credit/:token", "features/credits/pages/RemoveCredit.tsx"),
  route(
    "/verify-company-claim/:token",
    "features/credits/pages/VerifyCompanyClaim.tsx",
  ),
  route("/admin/unauthorized", "features/admin/pages/Unauthorized.tsx"),
  route("/admin/merge", "features/admin/pages/MergeBuildings.tsx"),
  route(
    "/admin/merge/:targetId/:sourceId",
    "features/admin/pages/MergeComparison.tsx",
  ),

  // Admin (AdminGuard remains as a wrapper component inside AdminLayout)
  layout("features/admin/components/AdminLayout.tsx", [
    route("/admin", "features/admin/pages/Dashboard.tsx"),
    route("/admin/buildings", "features/admin/pages/Buildings.tsx"),
    route("/admin/users", "features/admin/pages/Users.tsx"),
    route("/admin/moderation", "features/admin/pages/Moderation.tsx"),
    route("/admin/images", "features/admin/pages/ImageWall.tsx"),
    route("/admin/photos", "features/admin/pages/PhotoAnalytics.tsx"),
    route("/admin/audit", "features/admin/pages/BuildingAudit.tsx"),
    route("/admin/claims", "features/admin/pages/ArchitectClaims.tsx"),
    route("/admin/storage-jobs", "features/admin/pages/StorageJobs.tsx"),
    route("/admin/system", "pages/AdminSystemPlaceholder.tsx"),
  ]),

  // Main app (MainLayout wraps all user-facing routes)
  layout("components/layout/MainLayout.tsx", [
    index("features/feed/pages/Index.tsx"),
    route("/explore", "features/explore/pages/Explore.tsx"),
    route("/search", "features/search/SearchPage.tsx"),
    route("/post", "pages/Post.tsx"),
    route("/notifications", "features/notifications/pages/Notifications.tsx"),
    route("/add-building", "features/buildings/pages/AddBuilding.tsx"),
    route("/connect", "features/connect/pages/Connect.tsx"),
    route("/groups/*", "pages/NotFound.tsx", { id: "groups-not-found" }),
    route("/profile", "features/profile/pages/Profile.tsx", {
      id: "profile-root",
    }),
    route("/profile/:username", "features/profile/pages/Profile.tsx", {
      id: "profile-username",
    }),
    route("/profile/photos", "features/profile/pages/UserPhotoGallery.tsx", {
      id: "profile-photos",
    }),
    route(
      "/profile/:username/photos",
      "features/profile/pages/UserPhotoGallery.tsx",
      {
        id: "profile-username-photos",
      },
    ),
    route("/settings", "features/profile/pages/Settings.tsx"),
    route("/person/:slug", "features/credits/pages/PersonDetails.tsx"),
    route(
      "/company/:slug/dispute",
      "features/credits/pages/CompanyClaimDispute.tsx",
    ),
    route("/company/:slug", "features/credits/pages/CompanyDetails.tsx"),
    route(
      "/accept-company-steward",
      "features/credits/pages/AcceptCompanySteward.tsx",
    ),
    route(
      "/:username/map/:slug",
      "features/collections/components/CollectionMapPage.tsx",
    ),
    route("/:username/folders/:slug", "features/profile/pages/FolderView.tsx"),
    route("/building/:id/:slug", "features/buildings/pages/BuildingDetails.tsx", {
      id: "building-details-slug",
    }),
    route("/building/:id", "features/buildings/pages/BuildingDetails.tsx", {
      id: "building-details-id-only",
    }),
    route(
      "/building/:id/:slug/edit",
      "features/buildings/pages/EditBuilding.tsx",
      {
        id: "building-edit-slug",
      },
    ),
    route("/building/:id/edit", "features/buildings/pages/EditBuilding.tsx", {
      id: "building-edit-id-only",
    }),
    route(
      "/building/:id/:slug/review",
      "features/buildings/pages/WriteReview.tsx",
      {
        id: "building-review-slug",
      },
    ),
    route("/building/:id/review", "features/buildings/pages/WriteReview.tsx", {
      id: "building-review-id-only",
    }),
    route("/architect/dashboard", "features/architect/pages/ArchitectDashboard.tsx"),
    route("/architect/:id", "features/credits/pages/ArchitectIdRedirect.tsx"),
    route("/architect/:id/edit", "features/architect/pages/EditArchitect.tsx"),
    route("/review/:id", "features/buildings/pages/ReviewDetails.tsx"),
    route("*", "pages/NotFound.tsx", { id: "root-not-found" }),
  ]),
] satisfies RouteConfig;

