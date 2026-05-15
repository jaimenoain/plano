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
  route(
    "/approve-steward-request/:token",
    "features/credits/pages/ApproveStewardRequest.tsx",
  ),
  route("/admin/unauthorized", "features/admin/pages/Unauthorized.tsx"),
  route("/admin/merge", "features/admin/pages/MergeEntities.tsx"),
  route(
    "/admin/merge/:entityType/:targetId/:sourceId",
    "features/admin/pages/MergeComparisonEntities.tsx",
  ),

  // Feedback API resource route
  route("/api/feedback", "features/feedback/api/feedback.route.ts"),

  // Admin API resource routes
  route("/api/admin/events-discover", "features/admin/api/events-discover.route.ts"),

  // Admin (AdminGuard remains as a wrapper component inside AdminLayout)
  layout("features/admin/components/AdminLayoutWithGuard.tsx", [
    route("/admin", "features/admin/pages/Dashboard.tsx"),
    route("/admin/buildings", "features/admin/pages/Buildings.tsx"),
    route("/admin/users", "features/admin/pages/Users.tsx"),
    route("/admin/ambassadors", "features/admin/pages/AmbassadorChapters.tsx"),
    route(
      "/admin/ambassadors/applications",
      "features/admin/pages/AmbassadorApplications.tsx",
    ),
    route(
      "/admin/ambassadors/coverage",
      "features/admin/pages/AmbassadorCoverage.tsx",
    ),
    route(
      "/admin/ambassadors/campaigns",
      "features/admin/pages/AmbassadorCampaigns.tsx",
    ),
    route(
      "/admin/ambassadors/:chapterId",
      "features/admin/pages/AmbassadorChapterDetail.tsx",
    ),
    route("/admin/moderation", "features/admin/pages/Moderation.tsx"),
    route("/admin/images", "features/admin/pages/ImageWall.tsx"),
    route("/admin/photos", "features/admin/pages/PhotoAnalytics.tsx"),
    route("/admin/audit", "features/admin/pages/BuildingAudit.tsx"),
    route("/admin/claims", "features/admin/pages/EntityClaims.tsx"),
    route("/admin/credits/flagged", "features/admin/pages/FlaggedCredits.tsx"),
    route("/admin/credits/people", "features/admin/pages/AdminPeople.tsx"),
    route("/admin/credits/companies", "features/admin/pages/AdminCompanies.tsx"),
    route("/admin/storage-jobs", "features/admin/pages/StorageJobs.tsx"),
    route("/admin/system", "pages/AdminSystemPlaceholder.tsx"),
    route("/admin/feedback", "features/admin/pages/Feedback.tsx"),
    route("/admin/events", "features/admin/pages/AdminEvents.tsx"),
    route("/admin/awards", "features/admin/pages/AwardsList.tsx"),
    route("/admin/awards/new", "features/admin/pages/AwardForm.tsx", {
      id: "admin-award-new",
    }),
    route("/admin/awards/:awardId", "features/admin/pages/AwardDetail.tsx"),
    route("/admin/awards/:awardId/edit", "features/admin/pages/AwardForm.tsx", {
      id: "admin-award-edit",
    }),
    route("/admin/awards/:awardId/editions/new", "features/admin/pages/EditionForm.tsx"),
    route(
      "/admin/awards/:awardId/editions/:editionId",
      "features/admin/pages/EditionDetail.tsx",
    ),
    route("/admin/awards/claims", "features/admin/pages/AwardClaimRequests.tsx"),
    route("/admin/awards/suggestions", "features/admin/pages/AwardSuggestions.tsx"),
    route(
      "/admin/awards/suggestions/:suggestionId",
      "features/admin/pages/AwardSuggestionDetail.tsx",
    ),
  ]),

  // Main app (MainLayout wraps all user-facing routes)
  layout("components/layout/MainLayout.tsx", [
    index("features/feed/pages/Index.tsx"),
    route("/explore", "features/explore/pages/Explore.tsx"),
    route("/search", "features/search/SearchPage.tsx"),
    route("/post", "pages/Post.tsx"),
    route("/notifications", "features/notifications/pages/Notifications.tsx"),
    route("/support", "features/ambassadors/pages/SupportPage.tsx"),
    route("/become-ambassador", "features/ambassadors/pages/BecomeAmbassador.tsx"),
    route("embassy", "features/embassy/components/EmbassyLayout.tsx", [
      index("features/embassy/pages/Contribute.tsx", { id: "embassy-index" }),
      route("contribute", "features/embassy/pages/Contribute.tsx", {
        id: "embassy-contribute",
      }),
      route("goals", "features/embassy/pages/MyGoals.tsx"),
      route("projects", "features/embassy/pages/ChapterProjects.tsx"),
      route("leadership", "features/embassy/pages/Leadership.tsx"),
      route("welcome", "features/embassy/pages/Onboarding.tsx"),
    ]),
    route("/ambassador-portal", "features/ambassadors/pages/AmbassadorPortal.tsx"),
    route("/add-building", "features/buildings/pages/AddBuilding.tsx"),
    route("/connect", "features/connect/pages/Connect.tsx"),
    route("/events/new", "features/events/pages/SubmitEvent.tsx", {
      id: "events-submit-new",
    }),
    route("/events/:slug/edit", "features/events/pages/SubmitEvent.tsx", {
      id: "events-submit-edit",
    }),
    route("/events", "features/events/pages/Events.tsx"),
    route("/awards", "features/awards/pages/AwardsIndex.tsx"),
    route("/award/:slug", "features/awards/pages/AwardPage.tsx"),
    route("/award/:slug/admin", "features/awards/pages/AwardAdminPage.tsx"),
    route("/award/:slug/:editionSlug", "features/awards/pages/AwardEditionPage.tsx"),
    // /events/:cc/:city/:slug — locality-scoped physical event URL (T13)
    route("/events/:cc/:city/:slug", "features/events/pages/EventDetail.tsx", {
      id: "event-detail-locality",
    }),
    // /events/:slug — fallback for virtual/online events or legacy links
    route("/events/:slug", "features/events/pages/EventDetail.tsx", {
      id: "event-detail-slug",
    }),
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
    route(
      "/building/:id/:slug/note/:postId/edit",
      "features/buildings/pages/EditNote.tsx",
      { id: "building-note-edit-slug" },
    ),
    route("/building/:id/note/:postId/edit", "features/buildings/pages/EditNote.tsx", {
      id: "building-note-edit-id-only",
    }),
    route("/portfolio", "features/credits/pages/PersonDashboard.tsx"),
    route("/company-portfolio", "features/credits/pages/CompanyDashboard.tsx"),
    route("/superadmin/cards", "features/superadmin/pages/CardPlayground.tsx"),
    route("/architect/dashboard", "features/credits/pages/ArchitectDashboardRedirect.tsx"),
    route("/architect/:id", "features/credits/pages/ArchitectIdRedirect.tsx"),
    route(
      "/architect/:id/edit",
      "features/credits/pages/ArchitectEditRedirect.tsx",
    ),
    route("/review/:id", "features/buildings/pages/ReviewDetails.tsx"),
    route("/city/:citySlug", "features/localities/pages/LocalityPage.tsx"),
    // Architecture routes (new URL structure — Phases 3–6)
    route("/architecture", "pages/ArchitectureHub.tsx"),
    route("/architecture/:cc", "features/localities/pages/CountryPage.tsx"),
    route("/architecture/:cc/:city", "features/localities/pages/LocalityPage.tsx", {
      id: "locality-architecture",
    }),
    // /architecture/:cc/:city/:id — slug-less canonical; loader issues 301 to add slug (T9)
    route("/architecture/:cc/:city/:id", "features/buildings/pages/BuildingDetails.tsx", {
      id: "building-details-architecture-id",
    }),
    route("/architecture/:cc/:city/:id/:slug", "features/buildings/pages/BuildingDetails.tsx", {
      id: "building-details-architecture-slug",
    }),
    // Legacy redirect stubs — logic filled in T7 / T10
    route("/guides", "features/guides/GuidesPage.tsx"),
    route("/locality/:slug", "features/localities/pages/LocalityRedirect.tsx"),
    route("*", "pages/NotFound.tsx", { id: "root-not-found" }),
  ]),
] satisfies RouteConfig;

