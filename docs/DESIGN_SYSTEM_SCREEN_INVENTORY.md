# Design System Screen Inventory

This inventory is the execution baseline for the design-system rollout across the web app.

## Complexity legend

- `L` (low): mostly static content or simple list/detail UI
- `M` (medium): multiple states, forms, or reusable modules
- `H` (high): dense interactions, map-heavy logic, or multi-panel workflows
- `XH` (extra high): very large pages with many tools/workflows

## Global shells and shared surfaces

| Surface | File | Complexity | Notes |
|---|---|---:|---|
| Main app shell | `src/components/layout/MainLayout.tsx` | H | Top nav, mobile shell, sidebar provider |
| Desktop top nav | `src/components/layout/AppTopNav.tsx` | M | Global nav, auth-aware actions |
| Mobile top bar | `src/components/layout/MobileTopBar.tsx` | M | Mobile entry-point chrome |
| Mobile sidebar | `src/components/layout/AppSidebar.tsx` | H | Mobile navigation + account navigation |
| Bottom nav | `src/components/layout/BottomNav.tsx` | M | Mobile persistent nav |
| App inner shell | `src/components/layout/AppLayout.tsx` | M | Header/footer/nav orchestration |
| Legacy header | `src/components/layout/Header.tsx` | M | Used on selected pages |
| Embassy shell | `src/features/embassy/components/EmbassyLayout.tsx` | H | Ambassador workspace chrome |
| Admin shell | `src/features/admin/components/AdminLayoutWithGuard.tsx` | H | Admin guard and navigation shell |

## Standalone public/auth pages

| Route | File | Complexity | Family |
|---|---|---:|---|
| `/login`, `/auth` | `src/features/auth/pages/Auth.tsx` | M | Auth |
| `/update-password` | `src/features/auth/pages/UpdatePassword.tsx` | L | Auth |
| `/onboarding` | `src/features/auth/pages/Onboarding.tsx` | M | Auth |
| `/terms` | `src/pages/Terms.tsx` | L | Static |
| `/about` | `src/pages/About.tsx` | L | Static |
| `/updates` | `src/pages/Updates.tsx` | M | Content |
| `/updates/:slug` | `src/pages/UpdateDetail.tsx` | M | Content |
| `/remove-credit/:token` | `src/features/credits/pages/RemoveCredit.tsx` | L | Token flow |
| `/verify-company-claim/:token` | `src/features/credits/pages/VerifyCompanyClaim.tsx` | L | Token flow |
| `/approve-steward-request/:token` | `src/features/credits/pages/ApproveStewardRequest.tsx` | L | Token flow |
| `/accept-company-steward` | `src/features/credits/pages/AcceptCompanySteward.tsx` | L | Token flow |
| `/company/:slug/dispute` | `src/features/credits/pages/CompanyClaimDispute.tsx` | M | Token flow |
| `/portfolio`, `/company-portfolio` | `PersonDashboard.tsx`, `CompanyDashboard.tsx` | M | Credits |
| `/ambassador-portal` | `src/features/ambassadors/pages/AmbassadorPortal.tsx` | M | Ambassadors |

## Main app pages (inside MainLayout)

| Route family | Primary files | Complexity |
|---|---|---:|
| Feed + landing (`/`) | `src/features/feed/pages/Index.tsx` | XH |
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

| Route | File | Complexity |
|---|---|---:|
| `/embassy/contribute` | `src/features/embassy/pages/Contribute.tsx` | XH |
| `/embassy/goals` | `src/features/embassy/pages/MyGoals.tsx` | H |
| `/embassy/projects` | `src/features/embassy/pages/ChapterProjects.tsx` | H |
| `/embassy/team` | `src/features/embassy/pages/Team.tsx` | M |
| `/embassy/tasks` | `src/features/embassy/pages/Tasks.tsx` | H |
| `/embassy/leadership` | `src/features/embassy/pages/Leadership.tsx` | H |
| `/embassy/welcome` | `src/features/embassy/pages/Onboarding.tsx` | M |

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

Use this table during implementation to mark rollout progress.

| Family | Status |
|---|---|
| Global shell + nav | complete |
| Editorial core (landing/feed/building detail) | complete |
| Discovery/map/geography | complete |
| Identity/content ecosystems | complete |
| Embassy workspace | complete |
| Admin console | complete |
| QA + hardening | complete |
