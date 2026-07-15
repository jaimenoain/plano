# Design System Page Audits

Per-page audit log for the design refinement programme ([Roadmap.md](Roadmap.md), R0–R9) and the successor **remaining surfaces** programme ([REMAINING_SURFACES_ROADMAP.md](REMAINING_SURFACES_ROADMAP.md), P0–P10). Each entry records intent, deltas, and rationale. Written by the agent during refinement phases; no human sign-off required.

## Agent workflow (kit comparison)

When refining a page with a website kit reference:

1. Read the kit file under `design-system/ui_kits/website/` and the production component(s) listed in [DESIGN_SYSTEM_SCREEN_INVENTORY.md](DESIGN_SYSTEM_SCREEN_INVENTORY.md).
2. Compare **section order**, **type scale** (eyebrow 11px tracked uppercase; display title clamp + line-height), **spacing** (`py-[26px]`, `mb-[14px]`, etc.), and **chrome** (borders, `rounded-none` on photos).
3. Record mismatches in **Before** / **After** / **Kit** columns below; kit HTML preview is optional — source JSX is the source of truth.
4. Set **Refinement** to `refined` only when exit criteria for that route’s phase are met.

## Audit template

| Field | Description |
|---|---|
| **Page** | Route + primary file |
| **Intent** | User goal on this surface |
| **Kit** | `design-system/ui_kits/website/*` file or N/A |
| **Before** | Layout/token gaps vs kit or COMPONENT_SPEC (baseline) |
| **After** | Concrete deltas applied (classes, component moves) |
| **States** | idle / loading / error / empty / success verified |
| **Phase** | Rollout phase (0–7), Refinement phase (R0–R9), or Remaining surfaces phase (P0–P10) |
| **Phase P*** | Remaining surfaces phase when applicable (P1–P10); `—` for R0–R9-only rows |
| **Refinement** | `not started` / `in progress` / `refined` |

---

## Phase 0 — Governance (rollout)

| Page | Intent | Kit | Before | After | States | Phase | Phase P* | Refinement |
|---|---|---|---|---|---|---|---|---|
| Inventory | Execution baseline | N/A | Routes missing from tracker | Verified routes in `app/routes.ts`; added missing admin/token routes | — | 0 | — | refined |
| ROADMAP + trackers | Measurable refinement programme | N/A | Rollout “complete” conflated with visual polish | `docs/Roadmap.md` canonical; inventory Rollout + Refinement columns; this audit template | — | R0 | — | refined |
| Remaining surfaces setup | Gap checklist + inventory linkage | N/A | 50 routes unnamed in audits | `REMAINING_SURFACES_ROADMAP.md` gap table; inventory **Remaining surfaces** column; audit **Phase P*** column | — | P0 | P0 | refined |

---

## Phase 1 — Shell (rollout)

| Page | Intent | Kit | Before | After | States | Phase | Refinement |
|---|---|---|---|---|---|---|---|
| App shell | Global navigation | `AppTopNav.jsx` | Red notification dot; embassy nav duplicated; explore bottom nav raw hex; embassy tabs used brand border | `navigation.ts` + `embassyNavItems`; lime `brand-accent` bell dot (7px); black active underlines; `bg-surface-inverse` sidebar + explore bottom nav; `text-feedback-destructive` sign-out; feed main `border-r` | idle | R1 | refined |
| Embassy shell | Ambassador workspace tabs | N/A | Inline `navItems`; `border-brand-primary` active tab | `embassyNavItems` from `navigation.ts`; `border-text-primary` active indicator | idle | R1 | refined |
| Admin shell | Console navigation | N/A | Sign out default chrome colour | `text-feedback-destructive` on sign-out; badges unchanged (semantic feedback only) | idle | R1 | refined |

---

## Refinement — Editorial spine (R2)

| Page | Intent | Kit | Before | After | States | Phase | Refinement |
|---|---|---|---|---|---|---|---|
| `/` logged-out landing | Marketing first impression | `Landing*.jsx` | Nav missing Sign in; marquee was building names; hero type scale loose | `LandingNav` dual CTA; `LandingHero` clamp scale + kit triptych; `LandingMarquee` 60s avatar strip; feature grid `max-w-[1080px]`; footer `max-w-[1080px]` | idle | R2 | refined |
| `/` signed-in feed | Discover reviews in editorial layout | `FeedPage.jsx` | Card empty/error states; sidebar avatar rows | `EditorialFeedPost` order + descender-safe `BuildingHeadline`; feed states border-only; `FeedSidebar` ranked list rows; shell unchanged from R1 | loading, error, empty | R2 | refined |
| `/building/:id` | Canonical building record | `BuildingDetail.jsx` | Title below hero; review stream in shadow cards | Hero overlay title + PLN id; `§ 01` architect statement header; stream blocks `border-b` editorial; tabs uppercase tracked; media `rounded-none` | idle, loading | R2 | refined |
| `/review/:id` | Single visit log | N/A | `Card` wrappers, admin density | `max-w-4xl`, `§ 01` header, article layout, text CTA to building | idle, loading | R2 | refined |
| `/post` | Log a visit composer | N/A | Raw gray rating fill, rounded-md inputs | Semantic rating dots; `rounded-sm` controls | idle | R2 | refined |

**Kit diff notes (R2.16):** Feed still adds `CardFooter` below byline (kit folds Save into byline) — documented exception. Landing hero has motion (framer) not in static kit. Building detail retains tabbed IA beyond kit single-page mock.

---

## Refinement — Discovery, search, and geography (R3)

| Page | Intent | Kit | Before | After | States | Phase | Refinement |
|---|---|---|---|---|---|---|---|
| `/explore` | Swipe discovery feed | N/A | Raw `#0A0A0A` canvas; black location pill; lime on rating overlay | `bg-surface-inverse` immersive panel; `surface-inverse/80` location pill; rating selection `text-white` on dark overlay; filter sheet labels `tracking-[0.15em]` | idle, loading, empty | R3 | refined |
| `/search` | Map + SERP discovery | N/A | Mobile search bar without grouped focus affordance | `focus-within` ring on mobile floating search shell; sidebar/list unchanged (border-only, no shadow) | idle, loading, empty | R3 | refined |
| `/guides` | Browse cities and collections | N/A | `tracking-widest` section labels; rounded skeleton cells | Editorial `tracking-[0.15em]` labels; `rounded-none` skeletons; list rows unchanged | loading, empty | R3 | refined |
| `/architecture` + country | Geography index | N/A | `hover:text-brand-primary` link; loose tracking | Hub eyebrow/stats `tracking-[0.15em]`; country grid hover border not shadow; locality cards border hover | idle, error | R3 | refined |
| `/architecture/:cc/:city` (locality) | City hub | N/A | `gap-0.5` collection mosaic; lime hover on titles | `gap-[1.5px]` mosaic hairlines; `rounded-none` cover cells; hover uses `text-text-secondary` not brand | idle, loading, 404 | R3 | refined |
| Collection map (`/:user/collections/:slug`) | Curated map + list | COMPONENT_SPEC §13g | Sidebar title only, no cover mosaic | 4-up portrait mosaic `grid-cols-4 gap-[1.5px] aspect-[4/5] rounded-none` when ≥4 preview images | idle, loading, not found | R3 | refined |
| Map popups | Building cluster detail on map | N/A | `bg-white/90` + `shadow-sm` on photography badge | `bg-surface-card/90`, border-only badge | idle | R3 | refined |

**R3 notes:** Explore location filter active state still uses `bg-brand-primary` (monochrome pill on dark canvas — not lime). `pinStyling.ts` hex pin colours deferred to R9 grep pass. `FolderView` empty dashed border `rounded-none` touched as adjacent geography/collections surface.

---

## Refinement — Identity and social graph (R4)

| Page | Intent | Kit | Before | After | States | Phase | Refinement |
|---|---|---|---|---|---|---|---|
| `/profile` (own + other) | Portfolio + social identity | N/A | `shadow-lg` drag overlays; small follower counts; filled portfolio CTAs | Metric tabs `tracking-[0.15em]`; follower counts at display scale; sign-out destructive hover; drag uses border-only; portfolio text CTAs | idle, loading, empty, owner/viewer | R4 | refined |
| `/settings` | Account preferences | N/A | Card-wrapped sections; ghost back button | `max-w-2xl`; uppercase section labels; `border-y` rows not cards; legacy claim destructive token; text back link | idle, saving | R4 | refined |
| `/connect` | Find people | N/A | (mostly done) filled follow buttons | `FollowButton` outline editorial; PYMK/contacts labels `tracking-[0.15em]` | idle, empty | R4 | refined |
| `/notifications` | Activity inbox | N/A | `tracking-widest` labels | `tracking-[0.15em]` on section chrome (rows unchanged from prior pass) | loading, empty | R4 | refined |
| `/feedback` | Submission history | N/A | Wide admin-style heading | `max-w-2xl` editorial header + border-b | idle | R4 | refined |
| `/person/:slug` | Professional credit page | N/A | Filled claim/browse CTAs; wide tracking | Text CTAs with `→`; tier labels `tracking-[0.15em]` | idle, unclaimed | R4 | refined |
| `/company/:slug` + dashboards | Firm portfolio | N/A | Card stat widgets; lime award hover | Hairline stat grid; pending list `border-y`; portfolio bar border-only | idle, owner | R4 | refined |
| `/:user/photos` | Photo grid | N/A | `gap-4` rounded grid | `gap-[1.5px]` mosaic; dashed empty state | empty, loading | R4 | refined |

**R4 notes:** Profile kanban still uses `brand-secondary` drop highlight (neutral grey token, not lime). Viewer vs owner: edit pencil/settings/sign-out only render when `isOwnProfile`; follow button only when viewing others — unchanged logic, verified in code review.

---

## Refinement — Events, awards, collections, public content (R5)

| Page | Intent | Kit | Before | After | States | Phase | Refinement |
|---|---|---|---|---|---|---|---|
| `/events` | Browse upcoming events | COMPONENT_SPEC §13i | Filled share button; card rows | Editorial header; text CTA; `divide-y` list rows without card fill | loading, error, empty | R5 | refined |
| `/events/:slug` | Event detail | §13i (date box allowed) | `tracking-widest`; lime link hovers | `tracking-[0.15em]`; text CTAs; RSVP typographic | idle, RSVP | R5 | refined |
| `/events/new` | Submit event | Form spec | Shadcn `Card` sections | `FormSection` with `border-t` + uppercase labels; feedback error banner | idle, error | R5 | refined |
| `/awards` + award detail | Trophy catalogue | N/A | `text-amber-500` trophies; amber badges | Monochrome ranks; `surface-muted` badges | loading, empty | R5 | refined |
| Folder + `/updates` | Collections + product news | §13g (collections) | `rounded-lg` heroes; card folder chrome | Folder editorial header; updates `rounded-none`; `max-w-2xl` article | empty | R5 | refined |
| `/about`, `/terms`, `/support` | Static / marketing | Landing tone | Mixed heading scale; accent CTA on support | Uppercase section labels; `max-w-2xl` terms; outline apply CTA | idle | R5 | refined |

## Refinement — Auth and token flows (R6)

| Page | Intent | Kit | Before | After | States | Phase | Refinement |
|---|---|---|---|---|---|---|---|
| `/auth`, `/login` | Sign in / sign up | Form spec + landing tone | `shadow-lg` inviter avatar; brand link underlines; loud check-email icon | Calm card shell; neutral mail icon; subdued link hovers | idle, check-email, loading | R6 | refined |
| `/onboarding` | Profile setup | Form spec | Candy-bar progress (`bg-brand-primary` bars) | `Step 1 of 3 · Profile` uppercase label; text skip CTA | loading, saving | R6 | refined |
| `/update-password` | Reset password | Auth shell | `min-h-screen`; lock icon hero | Matches Auth `min-h-dvh` + safe areas; no decorative icon | idle, loading | R6 | refined |
| Token flows (`/remove-credit`, `/verify-company-claim`, steward approve/accept) | Email deep links | Landing tone | Mixed layouts; filled `Button` CTAs; `AppLayout` on steward accept | Shared `TokenFlowLayout`; editorial headline; text primary actions | success, error, needs_auth | R6 | refined |
| `/company/:slug/dispute` | Dispute claim | Form spec | Boxed sign-in CTA; `tracking-widest` button | Section labels; text login + cancel links | idle, submitting | R6 | refined |

## Refinement — Embassy workspace (R7)

| Page | Intent | Kit | Before | After | States | Phase | Refinement |
|---|---|---|---|---|---|---|---|
| `/embassy/contribute` | Ambassador tools hub | Operational UI | Filled tool CTAs; `rounded-xl`; amber conflict badges | `EmbassyPageHeader`; outline tool cards; semantic warning tokens; hairline moderation tabs | loading, error, empty | R7 | refined |
| `/embassy/goals` | Personal dashboard | Operational UI | Brand section icons; candy progress labels | Editorial page head; monochrome goal progress; hairline task rows | loading, empty | R7 | refined |
| `/embassy/leadership` | Chapter ops | Operational UI | Filled tab pills; `bg-card` application rows | Underline tabs; divide-y applications; onboarding card on tokens | loading, tabs | R7 | refined |

## Refinement — Admin console (R8)

| Page | Intent | Kit | Before | After | States | Phase | Refinement |
|---|---|---|---|---|---|---|---|
| `/admin` dashboard | Ops overview | Admin patterns | `text-4xl` zone titles; default cards | `AdminPageHeader`; `AdminSectionLabel` zones; pulse cards on tokens | loading, error | R8 | refined |
| `/admin/moderation` + `/admin/users` | Queue + roster | Table spec | Plain `TableHead`; extra `p-8` | `adminTableHeadClass`; editorial page heads | loading, empty | R8 | refined |
| Awards form | CRUD | Form spec | `text-4xl` title; default labels | `AdminPageHeader`; `AdminFormLabel`; `border-t` form shell | saving | R8 | refined |
| Feedback + programme routes | Internal tools | Feedback tokens | `amber-*` status chips | `feedback-warning` semantic badges | idle | R8 | refined |

---

## Remaining surfaces — Ambassador marketing (P3)

| Page | Intent | Kit | Before | After | States | Phase | Phase P* | Refinement |
|---|---|---|---|---|---|---|---|---|
| `/become-ambassador` | Apply to chapter | `SupportPage` / landing editorial | `text-xl` sections; filled login CTA; lime interest toggles | `ambassador-marketing-ui`; Support-scale hero; numbered `01–03` steps; outline CTAs; monochrome toggle selection | loading, guest, member, pending, form | P3 | P3 | refined |
| `/ambassador-portal` | Ambassador entry | N/A (redirect) | `null` component; loader-only redirect | `meta` + editorial fallback shell; loader redirects to `/embassy/contribute` | redirect | P3 | P3 | refined |

---

## Remaining surfaces — Awards portal and event edit (P2)

| Page | Intent | Kit | Before | After | States | Phase | Phase P* | Refinement |
|---|---|---|---|---|---|---|---|---|
| `/award/:slug/admin` | Owner CMS for award | Admin form/table spec | `text-2xl` head; pill tabs; invalid `feedback-error`; default outcome badges | `AwardAdminPageHeader`; hairline `border-text-primary` tabs; `awardAdminTableHeadClass`; `AdminFormLabel`; monochrome `outcomeBadgeClassName`; `feedback-destructive` actions | loading, empty, approve/reject | P2 | P2 | refined |
| `/award/:slug/:editionSlug` | Edition recipients | R5 award catalogue | `brand-primary` winner badge on cards | `AwardRecipientCard` monochrome outcome badges; edition meta trophy `text-text-secondary`; category `text-2xs` labels | empty, idle | P2 | P2 | refined |
| `/events/:slug/edit` | Edit submitted event | `SubmitEvent` create | Plain `h1`; centered load error text | Editorial eyebrow header; bordered `feedback-destructive` load-error banner; shared `FormSection` shell with create | loading, error, saving | P2 | P2 | refined |

---

## Remaining surfaces — Building authoring (P1)

| Page | Intent | Kit | Before | After | States | Phase | Phase P* | Refinement |
|---|---|---|---|---|---|---|---|---|
| `/add-building` | Pin location + continue to details | `BuildingDetail.jsx` tone | `Card` stacks; `amber-*` duplicate rows; map `shadow-sm` / `rounded-xl` | `BuildingPageHeader`; `BuildingFormPanel` sidebar; semantic `feedback-warning` duplicates; border-only map + `MapPin` tokens | idle, loading map, duplicate dialog | P1 | P1 | refined |
| `/building/:id/edit` | Update catalogue record | Form spec | Twin `Card` sections; `bg-white/50` duplicate list | `BuildingPageHeader`; `BuildingFormSection` location + details; duplicate banner on feedback tokens | loading, saving, duplicate warning | P1 | P1 | refined |
| `/building/:id/note/:postId/edit` | Edit visit note | Editorial narrow column | `tracking-wider` 10px labels | `text-2xs` `tracking-[0.15em]` section labels; `text-3xl` building context; borderless title/body unchanged | loading, saving, delete confirm | P1 | P1 | refined |
| Building form shared | Add/edit fields | `SubmitEvent` `FormSection` | Default `Label`; nested bordered boxes; `amber` slug hint | `building-form-ui` (`BuildingFormSection` / `BuildingFormLabel`); `BuildingLocationPicker` `MapPin` + semantic pins; slug hint `feedback-warning` | idle, validation toasts, skeletons | P1 | P1 | refined |

---

## Remaining surfaces — Embassy workspace remainder (P4)

| Page | Intent | Kit | Before | After | States | Phase | Phase P* | Refinement |
|---|---|---|---|---|---|---|---|---|
| `/embassy/projects` | Chapter projects + drafts | `embassy-ui` | `Card` project tiles; `text-muted-foreground`; `hover:shadow-md`; raw error empty | `EmbassyPageHeader`; `EmbassySectionLabel` campaigns; bordered project/draft rows; `EmbassyEmptyState` / `EmbassyErrorState`; `EMBASSY_SKELETON_ROUNDED` | loading, empty, error, drawer, sheets | P4 | P4 | refined |
| `/embassy/team` | Chapter roster | `embassy-ui` | Global roles lumped into ambassadors | `EmbassyPageHeader`; explicit sections (`global_president`, `global_leaders`, `global_team`, `president`, `exco`, `ambassador`); `ROLE_BADGE_LABELS` outline badges | loading, empty | P4 | P4 | refined |
| `/embassy/tasks` | Task queue | `embassy-ui` | `Card` task rows; `text-muted-foreground` / `text-destructive`; `hover:bg-muted/50` | `EmbassyPageHeader`; border-only `TaskCard`; semantic `text-text-secondary` / `text-feedback-destructive`; `hover:bg-surface-muted/50` | loading, empty, filters, drawer | P4 | P4 | refined |
| `/embassy/welcome` | Ambassador onboarding | `embassy-ui` | `Card` tool picker; filled CTAs; `text-muted-foreground`; secondary ExCo badge | Per-step `EmbassyPageHeader`; border-only tool tiles; outline CTAs; global leadership in ExCo filter; monochrome role badges | steps 1–3, saving | P4 | P4 | refined |

---

## Remaining surfaces — Admin moderation and media ops (P5)

| Page | Intent | Kit | Before | After | States | Phase | Phase P* | Refinement |
|---|---|---|---|---|---|---|---|---|
| `/admin/images` | Profile avatar wall | `admin-ui` | Plain `h1`; spinner load; `ring-brand-primary` selection | `AdminPageHeader`; skeleton grid; `ring-text-primary` selection; `AdminEmptyState`; inverse overlay on hover | loading, empty, selected | P5 | P5 | refined |
| `/admin/photos` | Photo coverage analytics | `admin-ui` | `text-3xl` section heads; rainbow heatmap; default stat cards | `AdminPageHeader` + `AdminSectionLabel`; monochrome heatmap/circles; tracked stat cards + coverage bar; hairline zone tabs; `adminTableHeadClass` | loading, table, map | P5 | P5 | refined |
| `/admin/audit` | Building change log | `admin-ui` | Plain `h1`; default `TableHead`; inline empty row | `AdminPageHeader`; `AdminFormLabel` filter; `adminTableHeadClass`; `AdminEmptyState`; semantic diff colors retained | loading, empty, filtered, revert dialog | P5 | P5 | refined |

---

## Remaining surfaces — Admin entity and credits ops (P6)

| Page | Intent | Kit | Before | After | States | Phase | Phase P* | Refinement |
|---|---|---|---|---|---|---|---|---|
| `/admin/buildings` | Building registry | `admin-ui` | Plain `h1`; default table heads; inline empty row | `AdminPageHeader`; `AdminFormLabel` search/status; `adminTableHeadClass`; `AdminEmptyState` | loading, empty, edit dialog, pagination | P6 | P6 | refined |
| `/admin/claims` | Architect + company claims | `admin-ui` | Filled lime approve CTA; pill tabs; brand links | Hairline tabs; outline approve; `feedback-warning` dispute count; `adminTableHeadClass`; `AdminEmptyState` | loading, empty queues, processing | P6 | P6 | refined |
| `/admin/merge` | Duplicate picker | `admin-ui` | Lime badges/CTAs; brand selection chrome | `AdminPageHeader`; hairline entity tabs; monochrome connector; semantic master/duplicate cards; outline compare CTA | idle, selected, scan results | P6 | P6 | refined |
| `/admin/merge/.../compare` | Side-by-side merge | `admin-ui` | Lime unify CTA; `rounded-xl` cards; brand swap hover | Border-only cards; outline swap; `variant="destructive"` unify + confirm; semantic target/source badges | loading, swap, confirm dialog | P6 | P6 | refined |
| `/admin/credits/flagged` | Flagged credit queue | `admin-ui` | Extra `p-6`; brand links; filled verify | `AdminPageHeader`; `adminTableHeadClass`; `AdminEmptyState`/`AdminErrorState`; outline verify; destructive hide | loading, empty, acting | P6 | P6 | refined |
| `/admin/credits/people` | People directory + merge | `admin-ui` | Plain `h1`; brand merge CTAs | `AdminPageHeader`; `AdminSectionLabel` steps; `adminTableHeadClass`; destructive merge confirm | search, merge dialog, directory | P6 | P6 | refined |
| `/admin/credits/companies` | Companies directory + merge | `admin-ui` | Plain `h1`; brand links/merge | Same as people; steward collapsible unchanged; destructive merge | search, stewards, merge | P6 | P6 | refined |

---

## Remaining surfaces — Admin programme and ambassadors (P7)

| Page | Intent | Kit | Before | After | States | Phase | Phase P* | Refinement |
|---|---|---|---|---|---|---|---|---|
| `/admin/ambassadors` | Chapter registry | `admin-ui` | Shield icon + plain `h1`; default table heads | `AdminPageHeader` + nav actions; `adminTableHeadClass`; `AdminFormLabel` create dialog; `AdminEmptyState` | loading, empty, attention banner, create | P7 | P7 | refined |
| `/admin/ambassadors/applications` | Application queue | `admin-ui` | `text-2xl` head; filled approve; inline empty row | `AdminPageHeader`; outline approve; `adminTableHeadClass`; `AdminEmptyState`; `AdminFormLabel` dialogs | loading, empty, approve/reject | P7 | P7 | refined |
| `/admin/ambassadors/coverage` | Coverage gaps + national overview | `admin-ui` | Plain `h1`; pill tabs; default table heads | `AdminPageHeader`; hairline tabs; `AdminSectionLabel`; `adminTableHeadClass`; `AdminEmptyState`/`AdminErrorState` | loading, gaps, national, localities | P7 | P7 | refined |
| `/admin/ambassadors/campaigns` | Programme campaigns + ideas inbox | `admin-ui` | Icon + plain `h1`; `muted/20` cards; `text-[11px]` meta | `AdminPageHeader`; `AdminSectionLabel`; semantic idea cards; `adminTableHeadClass`; `AdminEmptyState`/`AdminErrorState` | loading, empty inbox, campaigns table, create dialog | P7 | P7 | refined |
| `/admin/ambassadors/:chapterId` | Chapter detail | `admin-ui` | Plain `h1`; pill tabs; default section heads | `AdminPageHeader`; hairline tabs; `AdminSectionLabel`; `adminTableHeadClass`; `AdminEmptyState` on all tabs | loading, overview, members, quality, settings | P7 | P7 | refined |
| `/admin/programme/health` | Programme pulse dashboard | `admin-ui` | Plain `h1`; `text-xl` sections; raw chart hex colors | `AdminPageHeader`; `AdminSectionLabel`; token-aligned chart colors; `AdminEmptyState`/`AdminErrorState`; `adminTableHeadClass` top-5 table | loading, error, pulse, chart, flagged, top 5 | P7 | P7 | refined |
| `/admin/programme/presidents` | President directory | `admin-ui` | Plain `h1`; pill tabs; inline empty rows | `AdminPageHeader`; hairline tabs; `adminTableHeadClass`; `AdminEmptyState`/`AdminErrorState`; onboarding slide-out unchanged | loading, filters, directory, onboarding tab | P7 | P7 | refined |
| `/admin/programme/interventions` | Automated flag queue | `admin-ui` | Plain `h1`; custom empty hero | `AdminPageHeader`; `AdminSectionLabel` severity groups; `AdminEmptyState`/`AdminErrorState`; dismiss/snooze retained | loading, empty, urgent/warning/info | P7 | P7 | refined |
| `/admin/programme/broadcasts` | President broadcasts | `admin-ui` | Plain `h1`; default `Label`; inline empty sent list | `AdminPageHeader`; `AdminFormLabel` composer; `AdminSectionLabel` sent; `adminTableHeadClass` read-status; outline send retained | compose, preview, sent, read dialog | P7 | P7 | refined |
| `/admin/programme/rankings` | Chapter performance ranking | `admin-ui` | Plain `h1`; default table heads; inline empty | `AdminPageHeader` + period/export actions; `adminTableHeadClass`; `AdminEmptyState`/`AdminErrorState`; outline CSV export | loading, sort, top-10% highlight, export | P7 | P7 | refined |

---

## Remaining surfaces — Admin awards CMS (P8)

| Page | Intent | Kit | Before | After | States | Phase | Phase P* | Refinement |
|---|---|---|---|---|---|---|---|---|
| `/admin/awards` | Award catalogue | `admin-ui` | Plain `h1`; default table heads; inline empty | `AdminPageHeader` + search/new actions; `adminTableHeadClass`; semantic claim badges; `AdminEmptyState` | loading, empty, sort, toggle active | P8 | P8 | refined |
| `/admin/awards/:awardId` | Award detail + editions | `admin-ui` | Plain `h1`; `text-lg` editions head | `AdminPageHeader`; `AdminSectionLabel` editions; `adminTableHeadClass`; `AdminEmptyState`/`AdminErrorState` | loading, not found, editions, delete confirm | P8 | P8 | refined |
| `/admin/awards/new`, `.../edit` | Award create/edit form | `admin-ui` | Mixed `Label`/`AdminFormLabel` | Full `AdminFormLabel`; `AdminPageHeader`; `border-t` form (R8 pattern retained) | loading, create, edit, wikidata sync | P8 | P8 | refined |
| `/admin/awards/.../editions/new` | Edition create/edit | `admin-ui` | Plain `h1`; `p-8`; default `Label` | `AdminPageHeader`; `border-t` form; all `AdminFormLabel` | loading, create, edit | P8 | P8 | refined |
| `/admin/awards/.../editions/:editionId` | Edition recipients | `admin-ui` | Plain `h1`; default table heads; inline empty | `AdminPageHeader`; `AdminSectionLabel` categories; `adminTableHeadClass`; `AdminEmptyState` | loading, empty recipients, add/delete dialogs | P8 | P8 | refined |
| `/admin/awards/claims` | Claim request queue | `admin-ui` | `text-2xl` head; pill tabs; `feedback-error` token | `AdminPageHeader`; hairline tabs; `adminTableHeadClass`; outline approve/reject; `feedback-destructive` | pending/approved/rejected tabs, reject popover | P8 | P8 | refined |
| `/admin/awards/suggestions` | Suggestion inbox | `admin-ui` | `text-2xl`; raw `text-secondary`; emerald approved badge | `AdminPageHeader`; `adminTableHeadClass`; semantic status badges; `AdminEmptyState` | loading, empty, review link | P8 | P8 | refined |
| `/admin/awards/suggestions/:id` | Suggestion review | `admin-ui` | Filled approve CTA; raw `text-secondary` | `AdminPageHeader`; `AdminSectionLabel`; outline approve; destructive reject; `AdminErrorState` not found | pending review, reject form, audit trail | P8 | P8 | refined |

---

## Remaining surfaces — Admin content and system tools (P9)

| Page | Intent | Kit | Before | After | States | Phase | Phase P* | Refinement |
|---|---|---|---|---|---|---|---|---|
| `/admin/updates` | Plano Updates CMS list | `admin-ui` | Plain `h1`; default table heads; inline empty | `AdminPageHeader`; `adminTableHeadClass`; semantic published badge; `AdminEmptyState` | loading, empty, delete confirm | P9 | P9 | refined |
| `/admin/updates/new`, `/:updateId` | Update create/edit | `admin-ui` | Plain `h1`; `p-8`; default `Label`; raw hero overlay | `AdminPageHeader`; `border-t` form; all `AdminFormLabel`; tokenized hero clear control | loading, create, edit, geo scope, publish | P9 | P9 | refined |
| `/admin/events` | Event discover + manage | `admin-ui` | Plain `h1`; pill tabs; default table heads | `AdminPageHeader`; hairline tabs; discover result cards; `adminTableHeadClass`; `AdminEmptyState` manage tab | discover search, add, manage pagination, delete | P9 | P9 | refined |
| `/admin/api-requests` | LLM API monitor | `admin-ui` | `text-2xl` head; `p-6`; inline empty/error | `AdminPageHeader` + refresh action; stat cards; `adminTableHeadClass`; drawer tokens retained; `AdminEmptyState`/`AdminErrorState` | loading, empty, filters, row detail sheet | P9 | P9 | refined |
| `/admin/storage-jobs` | Storage deletion jobs | `admin-ui` | Plain `h1`; default label; black completed badge | `AdminPageHeader`; `AdminFormLabel` queue; `AdminSectionLabel` history; semantic status badges; `adminTableHeadClass` | queue form, loading, empty, realtime refresh | P9 | P9 | refined |
| `/admin/feedback` | Feedback triage | `admin-ui` | Plain `h1`; extra `p-6` | `AdminPageHeader`; `FeedbackBoard` unchanged below | board kanban/list (component) | P9 | P9 | refined |
| `/admin/system` | System placeholder | `admin-ui` | Bare bordered box | `AdminPageHeader`; `AdminEmptyState` coming soon | placeholder only | P9 | P9 | refined |

---

## Remaining surfaces — Utility pages (P10)

| Page | Intent | Kit | Before | After | States | Phase | Phase P* | Refinement |
|---|---|---|---|---|---|---|---|---|
| `*` (404) | Unknown route recovery | Editorial / `Unauthorized` tone | Standalone `min-h-screen`; raw `#ef4444` SVG; duplicate `BottomNav`; filled primary home CTA | `AppLayout` inside `MainLayout`; uppercase eyebrow + `text-3xl` head; `feedback-destructive` revision cloud; text link “Return home →”; outline back button | 404 loader status | P10 | P10 | refined |
| `/superadmin/cards` | Internal card fixture lab | Token surfaces only | `bg-black` dark canvas; no internal label | “Internal tool · not production UI” banner; `bg-surface-inverse` dark canvas; sidebar copy clarifies fixture lab | one fixture, show all, controls | P10 | P10 | refined |

---

## Phases 2–7 (rollout) and R1–R8 (refinement)

Audits for remaining route families are recorded as each phase batch completes. See completion tracker in [DESIGN_SYSTEM_SCREEN_INVENTORY.md](DESIGN_SYSTEM_SCREEN_INVENTORY.md) and phase checklist in [Roadmap.md](Roadmap.md).
