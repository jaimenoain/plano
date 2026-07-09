# Components

Plano's UI is shadcn/ui primitives (in `src/components/ui/`) restyled to the tokens, plus a small set of
Plano-specific components. **Paths below are the documented source locations — confirm against the live
repo and use whatever the codebase actually exports.** Always reuse an existing component before writing
a new one; don't fork a variant for a one-off.

> Props marked *(intended)* describe the design contract. Match the real component's prop names when they
> differ — the behaviour and styling are what must hold.

---

## Button — `src/components/ui/button.tsx`

shadcn Button extended with Plano variants. Geometry is shared: `h-10 px-4`, `radius-sm` (2px),
`font-medium` (500), **sentence case**, `active:scale-[0.98]` on press, `focus-visible` **lime** ring
(`ring-brand-accent`, 2px + 2px white offset).

| Variant | Look | When |
|---|---|---|
| `default` | Black fill `#171717`, white text; hover `#000` | The neutral default action (most buttons) |
| `accent` | **Lime fill** (`bg-brand-accent`), dark `#171717` text; hover `#9ACC00` | The primary call-to-action / hero button |
| `secondary` | `surface-muted` fill, dark text, `border-default` | Secondary action |
| `outline` | White fill, `border-default`; hover fills `surface-muted` | Secondary action |
| `ghost` | Transparent; hover `surface-muted` | Tertiary / cancel |
| `destructive` | Red fill (`feedback-destructive`), white text; hover `opacity-90` | Delete / destroy |
| `link` | `text-primary`, underline on hover | Inline text action |

Sizes (from source): `sm` (`h-8 px-3`, mobile min-h-11) · `default` (`h-10 px-4`) · `lg` (`h-12 px-6`) ·
`icon` / `icon-sm` / `icon-md`. Disabled: `opacity-50` + `pointer-events-none`.

**The lime button is the `accent` variant** (`bg-brand-accent`, dark `#171717` text) — the primary
call-to-action, at most one per view. `default` is black (`brand-primary`) for the many neutral actions;
secondary/outline/ghost stay monochrome. shadcn's generic `--primary` stays black so lime doesn't bleed
onto every primitive. Confirm the exact variant names against the live repo — the behaviour that must hold
is *one lime CTA, everything else monochrome*.

## Editorial CTA — the in-page action (not a Button)

For in-content actions on editorial surfaces (review, save, follow, directions, read more) Plano does
**not** use a filled button. It uses uppercase tracked text + a `→` arrow, no container:

```
class: text-xs font-medium uppercase tracking-widest text-primary
hover: label dims to text-secondary; the → nudges 3px right and colours lime
```

`plano-tokens.css` ships this as `.cta-link`. Examples: `REVIEW THIS BUILDING →`, `EXPLORE NEARBY →`, `READ MORE →`.

---

## Michelin Rating — `src/components/ui/michelin-rating-input.tsx`

The signature differentiator. **1–3 dots, never stars, never empty placeholders.**

- A dot is a filled circle (`radius-full`), **black** (`fill-brand-primary`). Dots are a **reward, not a
  rating scale** — show only the earned dots (1, 2, or 3). Not lime: it has poor contrast on white.
- **Dots are awards, not a 5-star scale.** Most buildings have **none** — a visited entry with zero dots
  is complete. Never render hollow placeholder rings: a 1-dot award is *one* dot, not one filled + two
  empty. The absence of dots carries meaning.
- Input affordance only: unfilled tap targets show a faint stroked ring **during interaction**; a displayed
  rating never shows empty slots. On select, dots fill **black** (`fill-brand-primary`), never lime.
- Tiers and their meaning:

| Dots | Tier | Meaning |
|---|---|---|
| 1 | **Impressive** | Worth a detour |
| 2 | **Essential** | Worth a journey |
| 3 | **Masterpiece** | Once in a lifetime |

- Sizes: inline meta ~9–10px dots · default 16px · input/display 20px, 5px gap.
- Input interaction: `whileTap: { scale: 0.9 }` — the only place anything squishes.
- A rating ≥ 2 fires a toast: *"You just boosted this building's rank!"* (see VOICE-AND-CONTENT.md).

---

## Feed item — `src/features/feed/`

The editorial gallery card. **No box, no border, no background, no shadow.** Content floats on the canvas;
structure comes from type scale + 64–96px vertical gaps.

Anatomy (top → bottom):
1. **Eyebrow** (optional) — short text-only context above the title: `London · 1982`, `VISITED`,
   `COLLECTION · 12 BUILDINGS`. 10–11px uppercase tracked, `text-secondary`.
2. **Headline** — building name, `.headline` (clamp 40–60px, 700, −0.03em, lh ~1.0). Hard-left.
3. **Meta line** — avatar · who · `·` · action · `·` rating dots · `·` when. Avatar is the only round
   element (`radius-full`, ~20px). `when` uses `text-disabled`.
4. **Image** — `radius-none` (sharp), full-bleed within column, `card-image-ratio-hero` (16/9). Real photo
   or `.photo-placeholder`.
5. **Body** (optional) — 15–16px, `lh 1.75`, max ~56ch, clamp 3–4 lines, with `READ MORE →`.
6. **Hairline footer** — likes/comments far-left (`.meta-code`), Save/Review/bookmark far-right.

Intended props: `who`, `when`, `action`, `rating`, `place` (eyebrow), `title`, `body`, `img`, `likes`,
`comments`. Variants seen in the kit:
- **A — full:** eyebrow + meta + image + body + footer.
- **B — no body:** the image carries; headline + meta + image only.
- **C — no eyebrow:** when the title is already the whole statement (e.g. a collection title).

64–96px gap between items. No containing box, ever.

---

## Photo placeholder — `.photo-placeholder` (in `plano-tokens.css`)

The on-brand stand-in wherever real photography isn't available yet. A faint neutral diagonal hatch on
`surface-muted` with a monospace caption naming what belongs there. Sharp 0px corners, same aspect ratios
as real imagery.

```html
<div class="photo-placeholder"
     style="aspect-ratio: var(--card-image-ratio-hero)"
     data-label="Barbican Centre · 1982"></div>
```

A grey hatch with a label reads as *deliberate, awaiting art*. A blank box, a flat-grey rectangle, a
gradient, or invented vector art reads as *broken* — never substitute those.

## Bell notification dot & status pill — the small lime indicators

The `Bell` icon carries a small lime dot when there are unread notifications — a small, non-decorative
status indicator. Its sibling is the `.accent-tag` status pill (BETA / NEW / LIVE): a lime chip with dark
`#171717` text, **at most one per view**, marking a single status. Both are deliberate, rationed uses —
never a section accent, a surface fill, or a verified badge.

---

## App chrome (see LAYOUT-AND-CHROME.md for placement rules)

| Component | Path | Notes |
|---|---|---|
| `AppTopNav` | `src/components/layout/AppTopNav.tsx` | **Desktop shell** — horizontal sticky top nav (logo + nav links + search + bell + avatar). Active link = bold + 1px underline. |
| Right rail | rendered by `MainLayout` / feed shell | 320px sticky right column beside the feed on desktop. |
| `MobileTopBar` | `src/components/layout/MobileTopBar.tsx` | Mobile top bar. |
| `BottomNav` | `src/components/layout/BottomNav.tsx` | Mobile bottom tab bar (PWA); hit targets ≥ 44px. |
| `AppSidebar` | `src/components/layout/AppSidebar.tsx` | **Mobile** navigation + account drawer — inverts to the black surface. Not a desktop rail. |
| `SiteFooter` | `src/components/layout/SiteFooter.tsx` | **Inverse** surface (`#000000`), `text-inverse`. |
| `MainLayout` | `src/components/layout/MainLayout.tsx` | Orchestrates top nav + right rail + mobile shell. |

Nav labels + Lucide icons come from `src/components/layout/navigation.ts`. Icons are `currentColor`,
never lime.

## Logo — `assets/plano-logo.svg`

Custom geometric wordmark. `fill: currentColor` — it inherits the text colour of its container (white on
the black sidebar, `text-primary` on the landing page). **Never recolour it to lime.**

---

## Iconography — Lucide (`lucide-react`)

- Stroke-based, **1.5px stroke**, monoline/open. Ships with shadcn.
- `currentColor` always — `text-primary` or `text-secondary` on content; **never lime**.
- Sizes: 16px inline (`size-4`), 20–24px nav, `h-3.5 w-3.5` for inline meta checks.
- **Never decorative** — an icon next to text must carry information.

Common icons: `Bookmark`/`BookmarkCheck` (save) · `MapPin` (location/markers) · `Building2` (building meta)
· `Briefcase` (architect portfolio) · `CalendarDays` (events) · `BadgeCheck` (verified) · `Heart` (like) ·
`MessageSquare` (comments) · `Check` (visited) · `Bell` (notifications) · `ChevronDown`/`→` (disclosure/CTA)
· `X` (close).

---

## Cards — the rule of three

Plano cards are almost never boxed. Three legitimate treatments:

1. **Content / feed cards:** no border, no background, no shadow. Pure type + imagery. Image `radius-none`.
2. **Admin / form cards:** 1px `border-default`, white `surface-card` fill, `radius-sm` (2px), no shadow
   (shadow optional, almost never used). Sidebars only appear on admin/settings.
3. **Modals:** white fill, `radius-lg` (6px), `shadow-lg`, black 50% backdrop.
