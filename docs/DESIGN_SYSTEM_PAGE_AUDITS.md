# Design System Page Audits

Per-page audit log for the design refinement programme ([ROADMAP.md](ROADMAP.md)). Each entry records intent, deltas, and rationale. Written by the agent during phases R0–R8; no human sign-off required.

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
| **Phase** | Rollout phase (0–7) or Refinement phase (R0–R9) |
| **Refinement** | `not started` / `in progress` / `refined` |

---

## Phase 0 — Governance (rollout)

| Page | Intent | Kit | Before | After | States | Phase | Refinement |
|---|---|---|---|---|---|---|---|
| Inventory | Execution baseline | N/A | Routes missing from tracker | Verified routes in `app/routes.ts`; added missing admin/token routes | — | 0 | refined |
| ROADMAP + trackers | Measurable refinement programme | N/A | Rollout “complete” conflated with visual polish | `docs/ROADMAP.md` canonical; inventory Rollout + Refinement columns; this audit template | — | R0 | refined |

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

## Phases 2–7 (rollout) and R1–R8 (refinement)

Audits for remaining route families are recorded as each phase batch completes. See completion tracker in [DESIGN_SYSTEM_SCREEN_INVENTORY.md](DESIGN_SYSTEM_SCREEN_INVENTORY.md) and phase checklist in [ROADMAP.md](ROADMAP.md).
