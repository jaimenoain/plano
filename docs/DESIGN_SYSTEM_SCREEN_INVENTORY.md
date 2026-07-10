# Design System Screen Inventory

This inventory is the execution baseline for the design-system rollout across the web app.

**Refinement programme:** Family-level polish (R0–R9) is **complete** — see [ROADMAP.md](ROADMAP.md). **Remaining surfaces** (P0–P10) is **complete** (2026-05-24) — all 50 gap routes audited; see [REMAINING_SURFACES_ROADMAP.md](REMAINING_SURFACES_ROADMAP.md) summary.

## Complexity legend

- `L` (low): mostly static content or simple list/detail UI
- `M` (medium): multiple states, forms, or reusable modules
- `H` (high): dense interactions, map-heavy logic, or multi-panel workflows
- `XH` (extra high): very large pages with many tools/workflows

## Remaining surfaces legend

Per-route polish after R0–R9 (programme [REMAINING_SURFACES_ROADMAP.md](REMAINING_SURFACES_ROADMAP.md), P0–P10):

- `not started` — in gap checklist; no dedicated audit row yet
- `in progress` — phase active
- `refined` — audit row written; exit criteria met
- `n/a` — covered by R0–R9 family pass or out of scope (redirects, API)

## Global shells and shared surfaces

| Surface | File | Complexity | Remaining surfaces | Notes |
|---|---|---:|---|---|
| Main app shell | `src/components/layout/MainLayout.tsx` | H | n/a | Top nav, mobile shell, sidebar provider |
| Desktop top nav | `src/components/layout/AppTopNav.tsx` | M | n/a | Global nav, auth-aware actions |
| Mobile top bar | `src/components/layout/MobileTopBar.tsx` | M | n/a | Mobile entry-point chrome |
| Mobile sidebar | `src/components/layout/AppSidebar.tsx` | H | n/a | Mobile navigation + account navigation |
| Bottom nav | `src/components/layout/BottomNav.tsx` | M | n/a | Mobile persistent nav |
| App inner shell | `src/components/layout/AppLayout.tsx` | M | n/a | Header/footer/nav orchestration |
| Page header (legacy) | `src/components/layout/Header.tsx` | M | n/a | Still imported by `AppLayout`; rendered when `showHeader` (e.g. building detail, award pages) |
| Embassy shell | `src/features/embassy/components/EmbassyLayout.tsx` | H | n/a | Ambassador workspace chrome |
| Admin shell | `src/features/admin/components/AdminLayoutWithGuard.tsx` | H | n/a | Admin guard and navigation shell |

## Standalone public/auth pages

| Route | File | Complexity | Remaining surfaces | Family |
|---|---|---:|---|---|
| `/login`, `/auth` | `src/features/auth/pages/Auth.tsx` | M | n/a | Auth |
| `/update-password` | `src/features/auth/pages/UpdatePassword.tsx` | L | n/a | Auth |
| `/onboarding` | `src/features/auth/pages/Onboarding.tsx` | M | n/a | Auth |
| `/terms` | `src/pages/Terms.tsx` | L | n/a | Static |
| `/about` | `src/pages/About.tsx` | L | n/a | Static |
| `/updates` | `src/pages/Updates.tsx` | M | n/a | Content |
| `/updates/:slug` | `src/pages/UpdateDetail.tsx` | M | n/a | Content |
| `/remove-credit/:token` | `src/features/credits/pages/RemoveCredit.tsx` | L | n/a | Token flow |
| `/verify-company-claim/:token` | `src/features/credits/pages/VerifyCompanyClaim.tsx` | L | n/a | Token flow |
| `/approve-steward-request/:token` | `src/features/credits/pages/ApproveStewardRequest.tsx` | L | n/a | Token flow |
| `/accept-company-steward` | `src/features/credits/pages/AcceptCompanySteward.tsx` | L | n/a | Token flow |
| `/company/:slug/dispute` | `src/features/credits/pages/CompanyClaimDispute.tsx` | M | n/a | Token flow |
| `/portfolio`, `/company-portfolio` | `PersonDashboard.tsx`, `CompanyDashboard.tsx` | M | n/a | Credits |
| `/become-ambassador` | `src/features/ambassadors/pages/BecomeAmbassador.tsx` | M | refined (P3) | Ambassadors |
| `/ambassador-portal` | `src/features/ambassadors/pages/AmbassadorPortal.tsx` | M | refined (P3) | Ambassadors |

## Main app pages (inside MainLayout)

| Route family | Primary files | Complexity |
|---|---|---:|
| Feed + landing (`/`) | `src/features/feed/pages/Index.tsx`, `src/features/feed/components/landing/*` | XH |
| Explore (`/explore`) | `src/features/explore/pages/Explore.tsx` | H |
| Search (`/search`) | `src/features/search/SearchPage.tsx` | XH |
| Guides (`/guides`) | `src/features/guides/GuidesPage.tsx` | M |
| Connect (`/connect`) | `src/features/connect/pages/Connect.tsx` | M |
| Notifications (`/notifications`) | `src/features/notifications/pages/Notifications.tsx` | M |
| Post (`/post`) | `src/pages/Post.tsx` | H |
| Profile (`/profile*`) | `src/features/profile/pages/Profile.tsx` | XH |
| Profile photos | `src/features/profile/pages/UserPhotoGallery.tsx` | M |
| Settings (`/settings`) | `src/features/profile/pages/Settings.tsx` | H |
| Feedback history (`/feedback`) | `src/features/feedback/pages/FeedbackHistory.tsx` | M |
| Buildings detail/edit/review | `src/features/buildings/pages/BuildingDetails.tsx`, `EditBuilding.tsx`, `EditNote.tsx`, `ReviewDetails.tsx` | XH |
| Add building (`/add-building`) | `src/features/buildings/pages/AddBuilding.tsx` | H |
| Events (list/detail/create/edit) | `src/features/events/pages/Events.tsx`, `EventDetail.tsx`, `SubmitEvent.tsx` | H |
| Awards (public + admin surface) | `src/features/awards/pages/AwardsIndex.tsx`, `AwardPage.tsx`, `AwardEditionPage.tsx`, `AwardAdminPage.tsx` | H |
| Credits people/companies | `src/features/credits/pages/PersonDetails.tsx`, `CompanyDetails.tsx` | H |
| Credits dashboards | `src/features/credits/pages/PersonDashboard.tsx`, `CompanyDashboard.tsx` | H |
| Collections/folders | `src/features/collections/components/CollectionMapPage.tsx`, `src/features/profile/pages/FolderView.tsx` | H |
| Geography pages (`/architecture*`, `/city/*`) | `src/pages/ArchitectureHub.tsx`, `src/features/localities/pages/CountryPage.tsx`, `LocalityPage.tsx` | H |
| Ambassadors public pages | `src/features/ambassadors/pages/SupportPage.tsx`, `BecomeAmbassador.tsx`, `AmbassadorPortal.tsx` | M |
| Superadmin playground | `src/features/superadmin/pages/CardPlayground.tsx` | M |

## Embassy workspace pages

| Route | File | Complexity | Remaining surfaces |
|---|---|---:|---|
| `/embassy/contribute` | `src/features/embassy/pages/Contribute.tsx` | XH | n/a (R7) |
| `/embassy/goals` | `src/features/embassy/pages/MyGoals.tsx` | H | n/a (R7) |
| `/embassy/projects` | `src/features/embassy/pages/ChapterProjects.tsx` | H | refined (P4) |
| `/embassy/team` | `src/features/embassy/pages/Team.tsx` | M | refined (P4) |
| `/embassy/tasks` | `src/features/embassy/pages/Tasks.tsx` | H | refined (P4) |
| `/embassy/leadership` | `src/features/embassy/pages/Leadership.tsx` | H | n/a (R7) |
| `/embassy/welcome` | `src/features/embassy/pages/Onboarding.tsx` | M | refined (P4) |

## Admin pages

| Area | Representative routes | Primary files | Complexity |
|---|---|---|---:|
| Dashboard | `/admin` | `src/features/admin/pages/Dashboard.tsx` | H |
| Core moderation | `/admin/moderation`, `/admin/images`, `/admin/photos`, `/admin/audit` | `Moderation.tsx`, `ImageWall.tsx`, `PhotoAnalytics.tsx`, `BuildingAudit.tsx` | H |
| User/entity management | `/admin/users`, `/admin/buildings`, `/admin/claims` | `Users.tsx`, `Buildings.tsx`, `EntityClaims.tsx` | H |
| Credits ops | `/admin/credits/*` | `FlaggedCredits.tsx`, `AdminPeople.tsx`, `AdminCompanies.tsx` | H |
| Ambassador operations | `/admin/ambassadors*` | `AmbassadorChapters.tsx`, `AmbassadorCoverage.tsx`, `AmbassadorCampaigns.tsx`, `AmbassadorChapterDetail.tsx`, `AmbassadorApplications.tsx` | H |
| Programme | `/admin/programme/*` | `ProgrammeHealth.tsx`, `ProgrammePresidents.tsx`, `ProgrammeInterventions.tsx`, `ProgrammeBroadcasts.tsx`, `ProgrammeRankings.tsx` | H |
| Awards admin | `/admin/awards*` | `AwardsList.tsx`, `AwardForm.tsx`, `AwardDetail.tsx`, `EditionForm.tsx`, `EditionDetail.tsx`, `AwardClaimRequests.tsx`, `AwardSuggestions.tsx`, `AwardSuggestionDetail.tsx` | H |
| Updates CMS | `/admin/updates*` | `UpdatesList.tsx`, `UpdateForm.tsx` | M |
| API + system | `/admin/api-requests`, `/admin/system`, `/admin/storage-jobs`, `/admin/feedback` | `ApiRequests.tsx`, `AdminSystemPlaceholder.tsx`, `StorageJobs.tsx`, `Feedback.tsx` | M |
| Events admin | `/admin/events` | `AdminEvents.tsx` | M |
| Merge tools | `/admin/merge*` | `MergeEntities.tsx`, `MergeComparisonEntities.tsx` | H |
| Unauthorized | `/admin/unauthorized` | `Unauthorized.tsx` | L |

## Route-family completion tracker

**Rollout** (tokens + wiring, 2026-05-24):

| Family | Rollout |
|---|---|
| Global shell + nav | complete |
| Editorial core (landing/feed/building detail) | complete |
| Discovery/map/geography | complete |
| Identity/content ecosystems | complete |
| Embassy workspace | complete |
| Admin console | complete |
| QA + hardening | complete |

**Refinement** (layout + typography + kit fidelity — see [ROADMAP.md](ROADMAP.md)):

| Family | Refinement |
|---|---|
| Programme setup (R0) | complete |
| Global shell + nav | refined (R1) |
| Editorial core (landing/feed/building detail) | refined (R2) |
| Discovery/map/geography | refined (R3) |
| Identity/content ecosystems | refined (R4) |
| Events / awards / collections | refined (R5) |
| Auth / token flows | refined (R6) |
| Embassy workspace | refined (R7) |
| Admin console | refined (R8) |
| QA + hardening | complete (R9) |

**Remaining surfaces** (per-route audits — see [REMAINING_SURFACES_ROADMAP.md](REMAINING_SURFACES_ROADMAP.md)):

| Phase block | Remaining surfaces |
|---|---|
| P0 setup | complete |
| P1 building authoring | complete |
| P2 awards portal + event edit | complete |
| P3 ambassador marketing | complete |
| P4 embassy remainder | complete |
| P5 admin media/moderation | complete |
| P6 admin entity/credits | complete |
| P7 programme + ambassadors | complete |
| P8 awards CMS | complete |
| P9 admin content/system | complete |
| P10 utility + closure | complete |

## Remaining surfaces gap tracker (50 routes)

Mirrors [gap route checklist](REMAINING_SURFACES_ROADMAP.md#gap-route-checklist-full-list). Update **Remaining surfaces** here and in audits as each phase completes.

| # | Route | File | Phase | Remaining surfaces |
|---:|---|---|---|---|
| 1 | `/add-building` | `AddBuilding.tsx` | P1 | refined |
| 2 | `/building/:id/edit` | `EditBuilding.tsx` | P1 | refined |
| 3 | `/building/:id/note/:postId/edit` | `EditNote.tsx` | P1 | refined |
| 4 | Building form shared | `BuildingForm.tsx`, `BuildingLocationPicker.tsx` | P1 | refined |
| 5 | `/award/:slug/admin` | `AwardAdminPage.tsx` | P2 | refined |
| 6 | `/award/:slug/:editionSlug` | `AwardEditionPage.tsx` | P2 | refined |
| 7 | `/events/:slug/edit` | `SubmitEvent.tsx` | P2 | refined |
| 8 | `/become-ambassador` | `BecomeAmbassador.tsx` | P3 | refined |
| 9 | `/ambassador-portal` | `AmbassadorPortal.tsx` | P3 | refined |
| 10 | `/embassy/projects` | `ChapterProjects.tsx` | P4 | refined |
| 11 | `/embassy/team` | `Team.tsx` | P4 | refined |
| 12 | `/embassy/tasks` | `Tasks.tsx` | P4 | refined |
| 13 | `/embassy/welcome` | `Onboarding.tsx` (embassy) | P4 | refined |
| 14 | `/admin/images` | `ImageWall.tsx` | P5 | refined |
| 15 | `/admin/photos` | `PhotoAnalytics.tsx` | P5 | refined |
| 16 | `/admin/audit` | `BuildingAudit.tsx` | P5 | refined |
| 17 | `/admin/buildings` | `Buildings.tsx` | P6 | refined |
| 18 | `/admin/claims` | `EntityClaims.tsx` | P6 | refined |
| 19 | `/admin/merge` | `MergeEntities.tsx` | P6 | refined |
| 20 | `/admin/merge/.../compare` | `MergeComparisonEntities.tsx` | P6 | refined |
| 21 | `/admin/credits/flagged` | `FlaggedCredits.tsx` | P6 | refined |
| 22 | `/admin/credits/people` | `AdminPeople.tsx` | P6 | refined |
| 23 | `/admin/credits/companies` | `AdminCompanies.tsx` | P6 | refined |
| 24 | `/admin/ambassadors` | `AmbassadorChapters.tsx` | P7 | refined |
| 25 | `/admin/ambassadors/applications` | `AmbassadorApplications.tsx` | P7 | refined |
| 26 | `/admin/ambassadors/coverage` | `AmbassadorCoverage.tsx` | P7 | refined |
| 27 | `/admin/ambassadors/campaigns` | `AmbassadorCampaigns.tsx` | P7 | refined |
| 28 | `/admin/ambassadors/:chapterId` | `AmbassadorChapterDetail.tsx` | P7 | refined |
| 29 | `/admin/programme/health` | `ProgrammeHealth.tsx` | P7 | refined |
| 30 | `/admin/programme/presidents` | `ProgrammePresidents.tsx` | P7 | refined |
| 31 | `/admin/programme/interventions` | `ProgrammeInterventions.tsx` | P7 | refined |
| 32 | `/admin/programme/broadcasts` | `ProgrammeBroadcasts.tsx` | P7 | refined |
| 33 | `/admin/programme/rankings` | `ProgrammeRankings.tsx` | P7 | refined |
| 34 | `/admin/awards` | `AwardsList.tsx` | P8 | refined |
| 35 | `/admin/awards/:awardId` | `AwardDetail.tsx` | P8 | refined |
| 36 | `/admin/awards/new`, `.../edit` | `AwardForm.tsx` | P8 | refined |
| 37 | `/admin/awards/.../editions/new` | `EditionForm.tsx` | P8 | refined |
| 38 | `/admin/awards/.../editions/:editionId` | `EditionDetail.tsx` | P8 | refined |
| 39 | `/admin/awards/claims` | `AwardClaimRequests.tsx` | P8 | refined |
| 40 | `/admin/awards/suggestions` | `AwardSuggestions.tsx` | P8 | refined |
| 41 | `/admin/awards/suggestions/:id` | `AwardSuggestionDetail.tsx` | P8 | refined |
| 42 | `/admin/updates` | `UpdatesList.tsx` | P9 | refined |
| 43 | `/admin/updates/new`, `/:updateId` | `UpdateForm.tsx` | P9 | refined |
| 44 | `/admin/events` | `AdminEvents.tsx` | P9 | refined |
| 45 | `/admin/api-requests` | `ApiRequests.tsx` | P9 | refined |
| 46 | `/admin/storage-jobs` | `StorageJobs.tsx` | P9 | refined |
| 47 | `/admin/feedback` | `Feedback.tsx` | P9 | refined |
| 48 | `/admin/system` | `AdminSystemPlaceholder.tsx` | P9 | refined |
| 49 | `*` | `NotFound.tsx` | P10 | refined |
| 50 | `/superadmin/cards` | `CardPlayground.tsx` | P10 | refined |

Paths under `src/features/` unless noted (`NotFound.tsx` → `src/pages/`).
