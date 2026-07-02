# Screen Inventory — Full-App Redesign Prep

## Context

We are about to undertake a **full redesign** of the Plano web app. Before design work
begins, we need a single, authoritative catalogue of **every screen the app has** so the
redesign can be scoped, prioritised, and tracked without missing surfaces. This document is
that inventory.

It was built by reading the authoritative route configuration ([app/routes.ts](../app/routes.ts))
directly and cross-checking it with three parallel codebase sweeps.

**Architecture note:** despite the governance docs describing a Next.js/Turborepo stack, the
app is actually a **React Router v7 SSR** app. Routes live in [app/routes.ts](../app/routes.ts)
(re-exported by [src/routes.ts](../src/routes.ts)). Screens are organised by feature under
`src/features/**/pages/` with a handful of standalone pages in `src/pages/`.

### Scope & depth
- **Depth:** routes + modals/drawers/in-page view modes, plus per-screen notes (key UI
  elements, redesign complexity, reuse hooks).
- **Admin scope:** admin/superadmin/internal screens are in scope but clearly separated from
  user-facing screens.

### How to read this
- **Complexity** = rough redesign effort: **L** (static/simple form/redirect), **M** (list or
  standard detail/form), **H** (map, feed, search, dashboard, rich detail).
- **Auth**: `public` (no login), `user` (login required), `admin` (admin role), `token`
  (unauthenticated but token-gated email flow).
- Counts: **~90 route-addressable screens** + **~30 modal/drawer surfaces** + several in-page
  view modes.

---

## 0. Global shells & shared chrome (redesign these first — they frame everything)

| Shell | File | Notes |
|---|---|---|
| **MainLayout** | [src/components/layout/MainLayout.tsx](../src/components/layout/MainLayout.tsx) | Wraps all user-facing routes. Composes top nav, sidebar, bottom nav. |
| Top nav / sidebar / bottom nav | [AppTopNav.tsx](../src/components/layout/AppTopNav.tsx), [AppSidebar.tsx](../src/components/layout/AppSidebar.tsx), [BottomNav.tsx](../src/components/layout/BottomNav.tsx) | Nav items defined once in [navigation.ts](../src/components/layout/navigation.ts): Feed, Events, Explore, Guides, Search, Connect, Awards, Support, You. **Single source of truth — reuse it.** |
| Header / MobileTopBar / SiteFooter | [Header.tsx](../src/components/layout/Header.tsx), [MobileTopBar.tsx](../src/components/layout/MobileTopBar.tsx), [SiteFooter.tsx](../src/components/layout/SiteFooter.tsx) | Desktop vs mobile header split (base + `md:` override convention). |
| **AdminLayoutWithGuard** | [src/features/admin/components/AdminLayoutWithGuard.tsx](../src/features/admin/components/AdminLayoutWithGuard.tsx) | Wraps all `/admin/*`. Own sidebar + `AdminGuard` role check. |
| **EmbassyLayout** | [src/features/embassy/components/EmbassyLayout.tsx](../src/features/embassy/components/EmbassyLayout.tsx) | Nested tab bar for `/embassy/*` (tabs in [navigation.ts](../src/components/layout/navigation.ts): `embassyNavItems`). |
| AppLayout / TokenFlowLayout | [AppLayout.tsx](../src/components/layout/AppLayout.tsx), [TokenFlowLayout.tsx](../src/components/layout/TokenFlowLayout.tsx) | Inner content shell; minimal shell for token/email flows. |
| Global error boundary | [src/root.tsx](../src/root.tsx) (ErrorBoundary export) | 500-like fallback + root-level error UI. |

---

## 1. USER-FACING SCREENS

### 1.1 Home, discovery & search

| Screen | Path | File | Complexity | Notes (key UI · reuse) |
|---|---|---|---|---|
| **Landing / Feed (dual-mode)** | `/` | [features/feed/pages/Index.tsx](../src/features/feed/pages/Index.tsx) | H | ⚠️ **One route, two experiences.** Logged-out → marketing landing (`LandingHero`, `LandingMarquee`, `LandingFeatureGrid`, `LandingNav`, `LandingFooter`). Logged-in → activity feed (`ReviewCardFeed`, `EditorialFeedPost`, `FeedActivitySummaryRow`, `FeedSidebar`; hooks `useHomeFeed`/`useCommunityFeed`). Redesign should treat these as two distinct screens. |
| **Explore** | `/explore` | [features/explore/pages/Explore.tsx](../src/features/explore/pages/Explore.tsx) | H | Single-file immersive/visual discovery ("reels"-style) surface; uses `ExploreShellContext`. High-touch redesign candidate. |
| **Search** | `/search` | [features/search/SearchPage.tsx](../src/features/search/SearchPage.tsx) | H | Map + list + filters SERP. Rich components: `OmniSearchBar`, `DiscoverySearchInput`, `DiscoveryFiltersPanel`, `DiscoveryList`, `UserResultsList`, `SearchModeToggle`, `SmartFilterSuggestions`, `LeaderboardDialog`. Recently rebuilt (pin-click → detail drawer). |
| **Guides** | `/guides` | [features/guides/GuidesPage.tsx](../src/features/guides/GuidesPage.tsx) | M | Curated guides + localities hub (`CollectionGuideCard`, `LocalityCard`, `LocalitySearchInput`). |
| **Architecture Hub** | `/architecture` | [pages/ArchitectureHub.tsx](../src/pages/ArchitectureHub.tsx) | M | Entry point for the geographic architecture browse tree (has loader). |

### 1.2 Buildings

| Screen | Path | File | Complexity | Notes |
|---|---|---|---|---|
| **Building detail** | `/building/:id`, `/building/:id/:slug`, `/architecture/:cc/:city/:id[/:slug]` | [features/buildings/pages/BuildingDetails.tsx](../src/features/buildings/pages/BuildingDetails.tsx) | H | Core content screen. Sections: `BuildingInfoSection`, `BuildingAwardsSection`, `BuildingLocationMap`/`BuildingMap`, `RelatedByArchitectSection`, `RelatedByCitySection`, `RelatedBuildingCard`. Multiple URL shapes resolve here; canonical arch URL 301s to add slug. |
| **Add building** | `/add-building` | [features/buildings/pages/AddBuilding.tsx](../src/features/buildings/pages/AddBuilding.tsx) | H | Long multi-field submission form (map picker, images). |
| **Edit building** | `/building/:id[/:slug]/edit` | [features/buildings/pages/EditBuilding.tsx](../src/features/buildings/pages/EditBuilding.tsx) | H | Shares form primitives with Add. |
| **Edit note** | `/building/:id[/:slug]/note/:postId/edit` | [features/buildings/pages/EditNote.tsx](../src/features/buildings/pages/EditNote.tsx) | M | Edit a user note/review on a building. |
| **Review detail** | `/review/:id` | [features/buildings/pages/ReviewDetails.tsx](../src/features/buildings/pages/ReviewDetails.tsx) | M | Single review/audit view. |

### 1.3 Localities & geography

| Screen | Path | File | Complexity | Notes |
|---|---|---|---|---|
| **Country page** | `/architecture/:cc` | [features/localities/pages/CountryPage.tsx](../src/features/localities/pages/CountryPage.tsx) | M | Cities within a country. |
| **Locality / City page** | `/architecture/:cc/:city`, `/city/:citySlug` | [features/localities/pages/LocalityPage.tsx](../src/features/localities/pages/LocalityPage.tsx) | H | Buildings grid + `LocalityMap`/`CollectionMap` + `StewardCard`. Two URL entry points. |
| Locality redirect | `/locality/:slug` | [features/localities/pages/LocalityRedirect.tsx](../src/features/localities/pages/LocalityRedirect.tsx) | L | Legacy redirect stub. |

### 1.4 Events

| Screen | Path | File | Complexity | Notes |
|---|---|---|---|---|
| **Events list** | `/events` | [features/events/pages/Events.tsx](../src/features/events/pages/Events.tsx) | M | Browse/search events. |
| **Event detail** | `/events/:cc/:city/:slug`, `/events/:slug` | [features/events/pages/EventDetail.tsx](../src/features/events/pages/EventDetail.tsx) | M | Locality-scoped + virtual/legacy fallback URLs. Modal: `ClaimEventDialog`. |
| **Submit / edit event** | `/events/new`, `/events/:slug/edit` | [features/events/pages/SubmitEvent.tsx](../src/features/events/pages/SubmitEvent.tsx) | M | Shared create/edit form. |

### 1.5 Awards

| Screen | Path | File | Complexity | Notes |
|---|---|---|---|---|
| **Awards index** | `/awards` | [features/awards/pages/AwardsIndex.tsx](../src/features/awards/pages/AwardsIndex.tsx) | M | Browse awards. |
| **Award page** | `/award/:slug` | [features/awards/pages/AwardPage.tsx](../src/features/awards/pages/AwardPage.tsx) | M | Modals: `ClaimAwardDialog`, `SuggestAwardDialog`, `AwardLeaderboardDialog`. |
| **Award edition** | `/award/:slug/:editionSlug` | [features/awards/pages/AwardEditionPage.tsx](../src/features/awards/pages/AwardEditionPage.tsx) | M | Year/cohort view. |
| Award admin (owner) | `/award/:slug/admin` | [features/awards/pages/AwardAdminPage.tsx](../src/features/awards/pages/AwardAdminPage.tsx) | M | Award-owner panel (user-facing, not `/admin`). |

### 1.6 Credits — people & companies

| Screen | Path | File | Complexity | Notes |
|---|---|---|---|---|
| **Person / architect profile** | `/person/:slug` | [features/credits/pages/PersonDetails.tsx](../src/features/credits/pages/PersonDetails.tsx) | M | Public portfolio. Modals: `ClaimPersonDialog`, `RequestStewardAccessDialog`. |
| **Company profile** | `/company/:slug` | [features/credits/pages/CompanyDetails.tsx](../src/features/credits/pages/CompanyDetails.tsx) | M | Public firm profile. Modal: `ClaimCompanyDialog`. |
| Company claim dispute | `/company/:slug/dispute` | [features/credits/pages/CompanyClaimDispute.tsx](../src/features/credits/pages/CompanyClaimDispute.tsx) | M | Ownership dispute flow. |
| **Person dashboard (portfolio)** | `/portfolio` | [features/credits/pages/PersonDashboard.tsx](../src/features/credits/pages/PersonDashboard.tsx) | H | Authenticated architect portfolio management. |
| **Company dashboard** | `/company-portfolio` | [features/credits/pages/CompanyDashboard.tsx](../src/features/credits/pages/CompanyDashboard.tsx) | H | Authenticated company management. |
| Accept company steward | `/accept-company-steward` | [features/credits/pages/AcceptCompanySteward.tsx](../src/features/credits/pages/AcceptCompanySteward.tsx) | L | Accept steward membership. |
| Architect redirects (legacy) | `/architect/dashboard`, `/architect/:id`, `/architect/:id/edit` | Architect*Redirect.tsx | L | 3 thin redirect stubs → person routes. |

### 1.7 Profile, collections & settings

| Screen | Path | File | Complexity | Notes |
|---|---|---|---|---|
| **Profile** | `/profile`, `/profile/:username` | [features/profile/pages/Profile.tsx](../src/features/profile/pages/Profile.tsx) | H | Own/other profile. **In-page view modes:** grid, list, kanban, reviews, likes, photos (`ProfileKanbanView`, `ProfileListView`). Highlights, followers, social context. Many modals (see §3). |
| **Photo gallery** | `/profile/photos`, `/profile/:username/photos` | [features/profile/pages/UserPhotoGallery.tsx](../src/features/profile/pages/UserPhotoGallery.tsx) | M | Lightbox gallery. |
| **Folder view** | `/:username/folders/:slug` | [features/profile/pages/FolderView.tsx](../src/features/profile/pages/FolderView.tsx) | M | Saved-buildings folder. |
| **Collection map** | `/:username/map/:slug` | [features/collections/components/CollectionMapPage.tsx](../src/features/collections/components/CollectionMapPage.tsx) | H | Public/shared collection map (`CollectionMapGL`, `ItineraryList`, route planning). |
| **Settings** | `/settings` | [features/profile/pages/Settings.tsx](../src/features/profile/pages/Settings.tsx) | M | Account: name/username/avatar, password, privacy, data export. |

### 1.8 Community — ambassadors & embassy

| Screen | Path | File | Complexity | Notes |
|---|---|---|---|---|
| Support | `/support` | [features/ambassadors/pages/SupportPage.tsx](../src/features/ambassadors/pages/SupportPage.tsx) | L | Help / support / donate. |
| Become an ambassador | `/become-ambassador` | [features/ambassadors/pages/BecomeAmbassador.tsx](../src/features/ambassadors/pages/BecomeAmbassador.tsx) | M | Application form. |
| Ambassador portal | `/ambassador-portal` | [features/ambassadors/pages/AmbassadorPortal.tsx](../src/features/ambassadors/pages/AmbassadorPortal.tsx) | M | Ambassador dashboard/hub. |
| **Embassy — Contribute** | `/embassy`, `/embassy/contribute` | [features/embassy/pages/Contribute.tsx](../src/features/embassy/pages/Contribute.tsx) | H | Embassy workspace landing (index redirects to goals). |
| Embassy — My Goals | `/embassy/goals` | [features/embassy/pages/MyGoals.tsx](../src/features/embassy/pages/MyGoals.tsx) | M | Goals dashboard. |
| Embassy — Chapter Projects | `/embassy/projects` | [features/embassy/pages/ChapterProjects.tsx](../src/features/embassy/pages/ChapterProjects.tsx) | M | |
| Embassy — Team | `/embassy/team` | [features/embassy/pages/Team.tsx](../src/features/embassy/pages/Team.tsx) | M | |
| Embassy — Tasks | `/embassy/tasks` | [features/embassy/pages/Tasks.tsx](../src/features/embassy/pages/Tasks.tsx) | M | Task board/kanban. |
| Embassy — Leadership | `/embassy/leadership` | [features/embassy/pages/Leadership.tsx](../src/features/embassy/pages/Leadership.tsx) | M | Leader-only tab. |
| Embassy — Welcome/Onboarding | `/embassy/welcome` | [features/embassy/pages/Onboarding.tsx](../src/features/embassy/pages/Onboarding.tsx) | M | Ambassador onboarding. |

### 1.9 Social & engagement

| Screen | Path | File | Complexity | Notes |
|---|---|---|---|---|
| **Connect** | `/connect` | [features/connect/pages/Connect.tsx](../src/features/connect/pages/Connect.tsx) | M | `PeopleYouMayKnow`, `YourContacts`. |
| Notifications | `/notifications` | [features/notifications/pages/Notifications.tsx](../src/features/notifications/pages/Notifications.tsx) | M | Inbox. Modal: `NotificationSettingsDialog`. |
| Feedback history | `/feedback` | [features/feedback/pages/FeedbackHistory.tsx](../src/features/feedback/pages/FeedbackHistory.tsx) | L | User's submitted feedback. `FeedbackWidget` embedded app-wide. |
| Create post | `/post` | [pages/Post.tsx](../src/pages/Post.tsx) | M | Compose building note / public post. |

### 1.10 Auth & onboarding (public)

| Screen | Path | File | Complexity | Notes |
|---|---|---|---|---|
| **Auth (login/signup/reset)** | `/login`, `/auth` | [features/auth/pages/Auth.tsx](../src/features/auth/pages/Auth.tsx) | M | Combined login/signup/reset; inviter context + facepile. |
| Onboarding | `/onboarding` | [features/auth/pages/Onboarding.tsx](../src/features/auth/pages/Onboarding.tsx) | M | Post-signup setup (username, location, avatar, follow inviter). |
| Update password | `/update-password` | [features/auth/pages/UpdatePassword.tsx](../src/features/auth/pages/UpdatePassword.tsx) | L | Reset form. |

### 1.11 Static & informational (public)

| Screen | Path | File | Complexity | Notes |
|---|---|---|---|---|
| About | `/about` | [pages/About.tsx](../src/pages/About.tsx) | L | |
| Terms | `/terms` | [pages/Terms.tsx](../src/pages/Terms.tsx) | L | |
| Updates (news) | `/updates` | [pages/Updates.tsx](../src/pages/Updates.tsx) | L | Public changelog/news feed. |
| Update detail | `/updates/:slug` | [pages/UpdateDetail.tsx](../src/pages/UpdateDetail.tsx) | L | |

### 1.12 Utility, token & error screens

| Screen | Path | File | Complexity | Notes |
|---|---|---|---|---|
| Remove credit | `/remove-credit/:token` | [features/credits/pages/RemoveCredit.tsx](../src/features/credits/pages/RemoveCredit.tsx) | L | `token` — email flow (TokenFlowLayout). |
| Verify company claim | `/verify-company-claim/:token` | [features/credits/pages/VerifyCompanyClaim.tsx](../src/features/credits/pages/VerifyCompanyClaim.tsx) | L | `token`. |
| Approve steward request | `/approve-steward-request/:token` | [features/credits/pages/ApproveStewardRequest.tsx](../src/features/credits/pages/ApproveStewardRequest.tsx) | L | `token`. |
| 404 — Not found | `*`, `/groups/*` | [pages/NotFound.tsx](../src/pages/NotFound.tsx) | L | Catch-all + legacy groups catch-all. |
| Error boundary (500) | — | [src/root.tsx](../src/root.tsx) | L | Global error UI. |

---

## 2. ADMIN & INTERNAL SCREENS *(separated — internal tooling, redesign priority TBD)*

All `/admin/*` are wrapped by **AdminLayoutWithGuard** (`admin` auth). ~45 screens.

### 2.1 Core & moderation
| Screen | Path | File |
|---|---|---|
| Dashboard | `/admin` | [features/admin/pages/Dashboard.tsx](../src/features/admin/pages/Dashboard.tsx) |
| Moderation | `/admin/moderation` | [features/admin/pages/Moderation.tsx](../src/features/admin/pages/Moderation.tsx) |
| Feedback (kanban) | `/admin/feedback` | [features/admin/pages/Feedback.tsx](../src/features/admin/pages/Feedback.tsx) |
| Unauthorized (403) | `/admin/unauthorized` | [features/admin/pages/Unauthorized.tsx](../src/features/admin/pages/Unauthorized.tsx) |
| System (placeholder) | `/admin/system` | [pages/AdminSystemPlaceholder.tsx](../src/pages/AdminSystemPlaceholder.tsx) |

### 2.2 Buildings, images & entities
| Screen | Path | File |
|---|---|---|
| Buildings | `/admin/buildings` | [features/admin/pages/Buildings.tsx](../src/features/admin/pages/Buildings.tsx) |
| Building audit | `/admin/audit` | [features/admin/pages/BuildingAudit.tsx](../src/features/admin/pages/BuildingAudit.tsx) |
| Image wall | `/admin/images` | [features/admin/pages/ImageWall.tsx](../src/features/admin/pages/ImageWall.tsx) |
| Photo analytics | `/admin/photos` | [features/admin/pages/PhotoAnalytics.tsx](../src/features/admin/pages/PhotoAnalytics.tsx) |
| Entity claims | `/admin/claims` | [features/admin/pages/EntityClaims.tsx](../src/features/admin/pages/EntityClaims.tsx) |
| Merge entities | `/admin/merge` | [features/admin/pages/MergeEntities.tsx](../src/features/admin/pages/MergeEntities.tsx) |
| Merge comparison | `/admin/merge/:entityType/:targetId/:sourceId` | [features/admin/pages/MergeComparisonEntities.tsx](../src/features/admin/pages/MergeComparisonEntities.tsx) |

### 2.3 Users & credits
| Screen | Path | File |
|---|---|---|
| Users | `/admin/users` | [features/admin/pages/Users.tsx](../src/features/admin/pages/Users.tsx) |
| People (credits) | `/admin/credits/people` | [features/admin/pages/AdminPeople.tsx](../src/features/admin/pages/AdminPeople.tsx) |
| Companies (credits) | `/admin/credits/companies` | [features/admin/pages/AdminCompanies.tsx](../src/features/admin/pages/AdminCompanies.tsx) |
| Flagged credits | `/admin/credits/flagged` | [features/admin/pages/FlaggedCredits.tsx](../src/features/admin/pages/FlaggedCredits.tsx) |

### 2.4 Ambassadors
| Screen | Path | File |
|---|---|---|
| Chapters | `/admin/ambassadors` | [features/admin/pages/AmbassadorChapters.tsx](../src/features/admin/pages/AmbassadorChapters.tsx) |
| Applications | `/admin/ambassadors/applications` | [features/admin/pages/AmbassadorApplications.tsx](../src/features/admin/pages/AmbassadorApplications.tsx) |
| Coverage | `/admin/ambassadors/coverage` | [features/admin/pages/AmbassadorCoverage.tsx](../src/features/admin/pages/AmbassadorCoverage.tsx) |
| Campaigns | `/admin/ambassadors/campaigns` | [features/admin/pages/AmbassadorCampaigns.tsx](../src/features/admin/pages/AmbassadorCampaigns.tsx) |
| Chapter detail | `/admin/ambassadors/:chapterId` | [features/admin/pages/AmbassadorChapterDetail.tsx](../src/features/admin/pages/AmbassadorChapterDetail.tsx) |

### 2.5 Awards (admin)
| Screen | Path | File |
|---|---|---|
| Awards list | `/admin/awards` | [features/admin/pages/AwardsList.tsx](../src/features/admin/pages/AwardsList.tsx) |
| Award new/edit | `/admin/awards/new`, `/admin/awards/:awardId/edit` | [features/admin/pages/AwardForm.tsx](../src/features/admin/pages/AwardForm.tsx) |
| Award detail | `/admin/awards/:awardId` | [features/admin/pages/AwardDetail.tsx](../src/features/admin/pages/AwardDetail.tsx) |
| Edition new | `/admin/awards/:awardId/editions/new` | [features/admin/pages/EditionForm.tsx](../src/features/admin/pages/EditionForm.tsx) |
| Edition detail | `/admin/awards/:awardId/editions/:editionId` | [features/admin/pages/EditionDetail.tsx](../src/features/admin/pages/EditionDetail.tsx) |
| Award claims | `/admin/awards/claims` | [features/admin/pages/AwardClaimRequests.tsx](../src/features/admin/pages/AwardClaimRequests.tsx) |
| Award suggestions | `/admin/awards/suggestions` | [features/admin/pages/AwardSuggestions.tsx](../src/features/admin/pages/AwardSuggestions.tsx) |
| Suggestion detail | `/admin/awards/suggestions/:suggestionId` | [features/admin/pages/AwardSuggestionDetail.tsx](../src/features/admin/pages/AwardSuggestionDetail.tsx) |

### 2.6 Programme
| Screen | Path | File |
|---|---|---|
| Redirect | `/admin/programme` | [features/admin/pages/ProgrammeRedirect.tsx](../src/features/admin/pages/ProgrammeRedirect.tsx) |
| Health | `/admin/programme/health` | [features/admin/pages/ProgrammeHealth.tsx](../src/features/admin/pages/ProgrammeHealth.tsx) |
| Presidents | `/admin/programme/presidents` | [features/admin/pages/ProgrammePresidents.tsx](../src/features/admin/pages/ProgrammePresidents.tsx) |
| Interventions | `/admin/programme/interventions` | [features/admin/pages/ProgrammeInterventions.tsx](../src/features/admin/pages/ProgrammeInterventions.tsx) |
| Broadcasts | `/admin/programme/broadcasts` | [features/admin/pages/ProgrammeBroadcasts.tsx](../src/features/admin/pages/ProgrammeBroadcasts.tsx) |
| Rankings | `/admin/programme/rankings` | [features/admin/pages/ProgrammeRankings.tsx](../src/features/admin/pages/ProgrammeRankings.tsx) |

### 2.7 Content, events & system
| Screen | Path | File |
|---|---|---|
| Updates list | `/admin/updates` | [features/admin/pages/UpdatesList.tsx](../src/features/admin/pages/UpdatesList.tsx) |
| Update new/edit | `/admin/updates/new`, `/admin/updates/:updateId` | [features/admin/pages/UpdateForm.tsx](../src/features/admin/pages/UpdateForm.tsx) |
| Events (admin) | `/admin/events` | [features/admin/pages/AdminEvents.tsx](../src/features/admin/pages/AdminEvents.tsx) |
| Storage jobs | `/admin/storage-jobs` | [features/admin/pages/StorageJobs.tsx](../src/features/admin/pages/StorageJobs.tsx) |
| API requests log | `/admin/api-requests` | [features/admin/pages/ApiRequests.tsx](../src/features/admin/pages/ApiRequests.tsx) |

### 2.8 Superadmin
| Screen | Path | File |
|---|---|---|
| Card playground | `/superadmin/cards` | [features/superadmin/pages/CardPlayground.tsx](../src/features/superadmin/pages/CardPlayground.tsx) |

---

## 3. MODAL / DRAWER / IN-PAGE SURFACES (not routes, but full redesign surfaces)

**In-page view modes** — Profile: grid / list / kanban / reviews / likes / photos.
Embassy: 6-tab workspace. Search: list / pins / mode toggle.

**Dialogs & drawers** (~30):
- **Profile/collections:** AddBuildingDialog, AddToFolderDialog, ManageFoldersDialog,
  ManageFavoritesDialog, ManageHighlightsDialog, BlockUserDialog, DisconnectLegacyClaimDialog,
  CreateCollectionDialog, ManageCollectionDialog, AddBuildingsToCollectionDialog,
  CollectionSettingsDialog, **PlanRouteDialog** (AI itinerary).
- **Credits/claims:** ClaimPersonDialog, ClaimCompanyDialog, RequestStewardAccessDialog.
- **Events/awards:** ClaimEventDialog, ClaimAwardDialog, SuggestAwardDialog, AwardLeaderboardDialog.
- **Maps:** FilterDrawer, BuildingDetailDrawer, MapControls (in [src/features/maps/components/](../src/features/maps/components/)).
- **Search:** LeaderboardDialog.
- **Buildings:** ImageDetailsDialog.
- **Notifications/system:** NotificationSettingsDialog, WaitingListDialog (waitlist gate),
  admin ManageCategoriesDialog / AddRecipientDialog.

---

## 4. Summary counts

| Bucket | Approx. count |
|---|---|
| User-facing route screens (§1) | ~45 |
| Admin + superadmin route screens (§2) | ~45 |
| Modal / drawer surfaces (§3) | ~30 |
| In-page view modes | ~15 |
| API resource routes (not screens) | 6 |

---

## 5. Redesign considerations (flagged for the design phase)

1. **`/` is two screens.** Design the logged-out landing and the logged-in feed separately.
2. **Shells first.** MainLayout + nav ([navigation.ts](../src/components/layout/navigation.ts)),
   AdminLayout, EmbassyLayout frame everything — redesign these before leaf screens.
3. **Map-heavy screens** (Search, Explore, Building detail, Locality, Collection map) share
   map components in [src/features/maps/components/](../src/features/maps/components/) — one map
   system to redesign, reused everywhere.
4. **Form pairs** (Add/Edit building, Submit/Edit event, Award/Edition forms, Update form)
   share a route file each — redesign once per pair.
5. **Admin is ~half the surface area** but internal-only; recommend deferring/lightweight pass.
6. Reuse the existing **design tokens** (brand-primary is now near-black `#171717`,
   lime → brand-accent) and the [src/features/superadmin/pages/CardPlayground.tsx](../src/features/superadmin/pages/CardPlayground.tsx)
   as a live component reference.
