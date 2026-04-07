# Plano: Component Specification

> This document gives Cursor two things: exact specifications for listed
> components, and a reasoning foundation for everything else.
>
> When a component or page type is not explicitly listed here, do not
> produce a minimal placeholder. Instead:
> 1. Find the most structurally similar listed component and use its
>    token assembly as the starting point.
> 2. Use Appendix B to select the correct surface, border, and text tokens.
> 3. Use Appendix A for all text styling decisions.
> 4. Apply the Interaction Design Principles in full — they govern
>    every component in this product, listed or not.
>
> A component derived this way will be visually consistent and
> behaviourally intentional. That is the standard.

---

## How to read this document

**Interaction Design Principles** (below, before components) — five
product-specific rules covering progressive disclosure, action
representation, width discipline, action hierarchy, and spacing rhythm.
Read these before building anything. They apply to every component and
every page in this product, whether listed here or not.

**Component entries** (sections 1–12) — for each listed component:
layout composition (structural arrangement), token assembly (visual
properties), interaction design notes (behavioural decisions), and
constraints (Always/Default rules with reasons).

**Appendix A — Typography Matrix** — the authoritative reference for
text size, weight, colour, and spacing across every UI context. When a
component entry does not specify typography, this matrix governs.

**Appendix B — Semantic Colour Guide** — a reasoning guide for choosing
surface, border, text, and feedback tokens in any context. Use it to
derive token choices for components and situations not explicitly covered
in the entries above.

---

## Interaction Design Principles

Plano is an architectural portfolio platform with an **editorial** personality inspired by A24 Films (a24films.com) and contemporary architecture studios (OMA, BIG, Zaha Hadid Architects). Its personality is **editorial, modern, minimalist, sharp, and photographic**. The density setting is **spacious** — generous whitespace creates editorial breathing room. The radius direction is **sharp** — 2px default for app UI, 0px for editorial feed content. In the feed, hierarchy comes from **typography scale and whitespace alone** — not from borders, not from card containers, not from shadows. Tiny uppercase labels contrasted against massive bold headlines create structure. Content floats directly on the white canvas. These five principles are calibrated to that identity, with editorial feed exceptions noted where applicable.

### 1. Progressive Disclosure

**Rule:** Primary actions (Add, Save, View) and safe secondary actions (Filter, Sort) are always visible. Destructive actions (Delete, Archive) and rarely-used secondary actions (Duplicate, Export) in list and table rows are hidden at rest and revealed on hover.

**Implementation:** The row or card container carries `group`. Hidden affordances carry `opacity-0 group-hover:opacity-100 transition-opacity duration-150`. The 150ms duration is fast — Plano's personality is precise and responsive; animations should feel instantaneous, not cushioned.

**Why this applies to Plano:** Architecture portfolios present curated content. A persistent Delete button next to every building card undermines the curatorial composure of the layout. Hiding destructive actions preserves the gallery-like calm and prevents accidental clicks in a photography-dense interface.

**Exception:** A destructive action may be persistently visible when it is the sole action on a dedicated confirmation screen or within a modal whose entire purpose is the destructive operation.

### 2. Action Representation

**Rule:** Use text labels when an action appears once or twice on a screen. Use icon buttons when the action repeats across every row or card in a list or grid. Plano is spacious, not compact — text labels are affordable in single-instance contexts and preferred for clarity.

**Standard icons (lucide-react):**
- Edit: `Pencil` — aria-label: `"Edit {item name}"`
- Delete: `Trash2` — aria-label: `"Delete {item name}"`
- View/Detail: `ArrowUpRight` — aria-label: `"View {item name}"`
- External link: `ExternalLink` — aria-label: `"Open {item name} in new tab"`
- More actions: `MoreHorizontal` — aria-label: `"More actions for {item name}"`
- Close: `X` — aria-label: `"Close"`
- Add: `Plus` — aria-label: `"Add {item type}"`

**Why this applies to Plano:** The spacious layout provides room for text labels in page-level CTAs and modal footers. But building grids, review lists, and collection tables repeat actions per row — icon-only buttons keep each row clean and let the building photography remain the dominant visual element.

### 3. Input and Content Width

**Rule:** Inputs are constrained by expected content length, never stretched to fill available viewport width.

**Width constraints by content type:**
- Building name, project title: `max-w-md` (28rem) — titles are typically under 60 characters
- Short identifiers, building IDs, postcodes: `max-w-xs` (20rem)
- Description, review body, notes: `max-w-xl` (36rem) — multi-line but not full-width
- Numeric values (year, area, floors): `max-w-[8rem]`
- Email, URL: `max-w-sm` (24rem)

**Page-level content width:**
- Data tables and building grids: full content-area width — density is intentional; the table or grid should use all available space within the content region
- Settings pages, single-record forms, profile management: `max-w-2xl` (42rem) — a form stretching to 1440px is a layout decision that was never made
- The underlying principle: an unconstrained input or form on a wide viewport is as much a defect as a wrong colour token

### 4. Action Hierarchy

**Rule:** At most one filled primary button per visible surface. Secondary supporting actions use ghost or outline variants. Row-level actions use icon-only ghost buttons, hover-revealed if destructive.

**Maximum visible actions per surface:** 3 before overflow into a `MoreHorizontal` menu. Plano's spacious layout has room, but architectural composure requires restraint — more than three actions creates toolbar noise.

**Destructive confirmation pattern by severity:**
- Low severity (remove a tag, unlink a collection): inline confirmation — the button text changes to "Confirm?" for 3 seconds, then reverts. No modal.
- Medium severity (delete a review, remove a building from a collection): dialog confirmation with a clear description of what will be lost.
- High severity (delete a building with all associated data, delete account): dialog confirmation requiring the user to type the building name or "DELETE" to proceed.

**Why this applies to Plano:** Buildings and their associated photography, reviews, and metadata represent significant curatorial effort. The confirmation pattern scales with the irreversibility and data loss of each action, ensuring that high-consequence deletions demand deliberate intent.

### 5. Spacing Rhythm

**Rule:** Consistent spacing tokens create visual grouping. Inconsistent gaps between sibling components of the same type are a visual defect — as detectable as a wrong colour, and as worth fixing.

**Token assignments:**
- `spacing-2` (8px): gap between tightly coupled elements within a component — icon and label text, label and input, badge icon and badge text
- `spacing-4` (16px): gap between sibling elements within a component — fields within a form group, items within a card body, action buttons in a row
- `spacing-6` (24px): gap between sibling components on a page — card to card in a grid, section heading to its content block
- `spacing-8` (32px): internal padding of major containers — card padding, modal body padding, page content area padding
- `spacing-12` (48px): separation between logical page sections — the gap between "Building Details" and "Reviews" sections on a building page
- `spacing-16` (64px): major page-level vertical rhythm — top-of-page to first content block, between primary page regions

**Section separation method (app UI — admin, settings, forms):** `spacing-12` margin-top plus a `border-t border-border-default` divider line. Plano's flat design uses borders as the primary section separator — not extra whitespace alone, and never shadows.

**Section separation method (editorial content pages — building detail, profile, architect profile):** `border-t border-border-default` divider with a `text-2xs font-medium uppercase tracking-widest text-text-secondary` section label immediately after it. The section label replaces a traditional `<h2>` heading — it is structural marginalia, not a headline. Vertical padding above the divider: `pt-8` to `pt-12`. This pattern applies to all named sections: "About", "Portfolio", "Reviews", "Location", "Resources", "Highlights", "All-time Favourites", etc.

**Section separation method (editorial feed):** `spacing-16` to `spacing-20` vertical margin between feed items. No borders between major feed items (hero cards, collection cards). The whitespace *is* the separator — editorial breathing room. Borders may appear only as subtle `border-b` dividers between compact/activity card rows where items are dense enough to merge visually.

---

## 1. Page Layout

### Purpose
The outermost structural shell that establishes page background, sidebar placement, header bar, content max-width, and content area padding. Every page in Plano is composed inside this layout.

### Layout Composition
The root element is a full-viewport flex row: `flex min-h-screen`. The sidebar is a fixed-width column on the left (`w-64 flex-shrink-0`). The main area is a flex column filling the remaining space (`flex-1 flex flex-col min-w-0`).

The header bar sits at the top of the main area: `flex items-center justify-between h-16 px-8 border-b border-border-default`. It holds the page title on the left and page-level actions on the right.

The content area fills below the header: `flex-1 overflow-y-auto`. Content inside it is padded with `p-8`. For pages that should not stretch to the full width (settings, forms, single-record views), the inner content block uses `max-w-2xl`. For data tables and grids, content fills the available width — no inner max-width constraint.

Responsive behaviour: below `lg` (1024px), the sidebar collapses to a hamburger-triggered overlay. The content padding reduces to `p-6` at `md` and `p-4` at `sm`.

### Token Assembly

| Part | Property | Token | Tailwind class |
|---|---|---|---|
| Root | background | surface-default | bg-surface-default |
| Sidebar | background | surface-muted | bg-surface-muted |
| Sidebar | border-right | border-default | border-r border-border-default |
| Sidebar | width | — | w-64 |
| Header bar | background | surface-card | bg-surface-card |
| Header bar | border-bottom | border-default | border-b border-border-default |
| Header bar | height | spacing-16 | h-16 |
| Header bar | padding-x | spacing-8 | px-8 |
| Content area | padding | spacing-8 | p-8 |
| Content area | background | surface-default | bg-surface-default |

### Interaction Design Notes

**Width constraints:** The content area itself has no max-width — it fills the space right of the sidebar. Pages that need a narrower column (settings, forms) apply `max-w-2xl mx-auto` to their own root wrapper inside the content area. Data-heavy pages (building tables, collection grids) intentionally use the full width.

### Constraints

**Always:** `surface-default` is applied only to the root page background — never to cards, panels, or components that sit on it. A component using `surface-default` becomes invisible against the page.

**Always:** The sidebar uses `surface-muted`, not `surface-card`. The sidebar is a supporting structural element; giving it the same surface as content cards destroys the visual hierarchy.

**Default:** Content area padding is `spacing-8`. Legitimate exception: a full-bleed photo gallery or map view that intentionally extends to the edges of the content region.

---

## 2. Card

### Purpose
The primary container surface for grouping related content — a building summary, a review, a stat block, a collection tile. Cards sit on `surface-default` and must be visually distinct from it.

### Layout Composition
Cards are `flex flex-col` containers. Internal content is separated with `gap-4`. When cards appear in a grid, the grid uses `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`.

For cards containing a hero image (building cards), the image sits at the top with `aspect-[4/3] w-full object-cover rounded-t-sm` and the text content below with `p-6`.

For text-only cards (stat blocks, review cards), the entire card is padded with `p-6`.

### Token Assembly

| Part | Property | Token | Tailwind class |
|---|---|---|---|
| Container | background | surface-card | bg-surface-card |
| Container | border | border-default | border border-border-default |
| Container | border-radius | radius-sm | rounded-sm |
| Container | shadow | shadow-none | shadow-none |
| Container | padding | spacing-6 | p-6 |
| Container | gap (children) | spacing-4 | gap-4 |

### Interactive States

| State | Part | Property | Tailwind class |
|---|---|---|---|
| hover | Container | border | hover:border-border-strong |
| focus-visible | Container | ring | focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 |

### Interaction Design Notes

**Progressive disclosure:** Row-level actions (Edit, Delete) on cards in a grid are hover-revealed. The card container carries `group`. The action container (positioned `absolute top-3 right-3`) carries `opacity-0 group-hover:opacity-100 transition-opacity duration-150`.

**Action representation:** Card actions use icon-only ghost buttons (`Pencil`, `Trash2`, `ArrowUpRight`) because they repeat across every card in the grid. Each button uses `h-8 w-8 p-1.5 rounded-sm` with `bg-surface-card/80 backdrop-blur-sm` to ensure visibility over photographs.

### Constraints

**Always (non-editorial):** Cards in app contexts (admin, settings, tables, building detail pages) use `border border-border-default`. A card with `surface-card` but no border is invisible against `surface-default` in light mode — this is a rendering bug, not a stylistic choice.

**Exception — editorial feed cards:** Feed cards (hero, activity, compact, collection, cluster) do not use the Card component's container styling. They have no `surface-card` background, no `border-default`, no `rounded-sm`. They are open compositions that sit directly on the page surface, with structure provided by typographic hierarchy and vertical spacing. See section 13 (Feed Editorial Components) for their specifications.

**Always:** Cards use `shadow-none` by default. Plano's hierarchy is border-driven, not shadow-driven. Use `shadow-md` only when a card needs explicit visual lift above sibling cards (e.g. a featured or pinned building).

**Default:** Card border-radius is `radius-sm` (2px). The sharp aesthetic is the single most important spatial decision in Plano. Legitimate exception: none — cards are always sharp.

---

## 3. Button

### Purpose
The primary interactive affordance for triggering actions — submitting forms, opening modals, navigating to detail views, confirming destructive operations.

### Layout Composition
Buttons use `inline-flex items-center justify-center gap-2`. Button groups (e.g. modal footer) use `flex items-center gap-3` with the primary action last (rightmost).

### Token Assembly (primary variant — base)

| Part | Property | Token | Tailwind class |
|---|---|---|---|
| Container | background | brand-primary | bg-brand-primary |
| Container | border-radius | radius-sm | rounded-sm |
| Container | shadow | shadow-none | shadow-none |

### Variants

| Variant | Part | Property | Token | Tailwind class |
|---|---|---|---|---|
| secondary | Container | background | brand-secondary | bg-brand-secondary |
| secondary | Container | border | border-default | border border-border-default |
| ghost | Container | background | transparent | bg-transparent |
| ghost | Container | background (hover) | surface-muted | hover:bg-surface-muted |
| destructive | Container | background | feedback-destructive | bg-feedback-destructive |

### Sizes

| Size | Height | Padding X | Padding Y | Tailwind classes |
|---|---|---|---|---|
| sm | spacing-8 | spacing-3 | spacing-1 | h-8 px-3 py-1 |
| md | spacing-10 | spacing-4 | spacing-2 | h-10 px-4 py-2 |
| lg | spacing-12 | spacing-6 | spacing-3 | h-12 px-6 py-3 |
| icon-sm | spacing-8 | spacing-2 | spacing-2 | h-8 w-8 p-2 |
| icon-md | spacing-10 | spacing-2 | spacing-2 | h-10 w-10 p-2 |

### Interactive States

| State | Part | Property | Tailwind class |
|---|---|---|---|
| hover (primary) | Container | background | hover:bg-brand-primary-hover |
| hover (ghost) | Container | background | hover:bg-surface-muted |
| hover (destructive) | Container | opacity | hover:opacity-90 |
| focus-visible | Container | ring | focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 |
| active (primary) | Container | scale | active:scale-[0.98] |
| disabled | Container | opacity + cursor | disabled:opacity-50 disabled:cursor-not-allowed |

### Interaction Design Notes

**Action representation:** Primary and secondary buttons always use text labels. Ghost icon-only buttons are reserved for repeated row/card actions. A primary button should never be icon-only — the neon accent demands a label to justify its visual weight.

**Action hierarchy:** At most one primary (filled neon) button per visible surface. If two actions compete, the less important one is secondary or ghost. Destructive buttons use the destructive variant — never primary, because the neon accent must not be associated with danger.

### Editorial Text CTA (non-button action pattern)

In editorial contexts (feed, building detail, profile, architect profile), actions are represented as uppercase tracked text links with a `→` arrow — never as filled or outlined buttons. This is the primary CTA pattern for all in-page navigation and action links on content surfaces.

| Part | Property | Tailwind class |
|---|---|---|
| Text | — | `text-xs font-medium uppercase tracking-widest text-text-primary hover:text-brand-primary transition-colors` |
| Arrow | — | `→` character (inline after the label text) |

Examples: `VIEW BUILDING →`, `WRITE REVIEW →`, `CLAIM PROFILE →`, `ADD FAVOURITES →`, `DIRECTIONS →`, `EDIT →`.

**When to use text CTAs vs. filled buttons:**
- **Text CTA:** any action that appears in-page on a content/feed surface — navigation links, profile actions, section-level management, secondary operations
- **Filled button (primary):** form submissions, modal confirmations, primary actions inside dialogs — contexts where a button's visual weight is semantically appropriate

### Constraints

**Always:** `brand-primary-foreground` (dark, `#171717`) is used for text on `brand-primary` buttons. The neon is a light colour — white text on it fails contrast. This is a WCAG violation if reversed.

**Always:** Focus ring uses `brand-primary` at 2px offset across all button variants. No exceptions.

**Default:** Button size is `md`. Use `sm` for table row actions and tight toolbar contexts. Use `lg` for page-level hero CTAs. Legitimate exception: a landing page may use a custom larger size, but it must still use `radius-sm`.

---

## 4. Form Field

### Purpose
A single input, textarea, or select element in isolation — the raw interactive control before it is composed with a label and helper text (see Form Structure).

### Layout Composition
Inputs are block-level: `flex w-full`. Textareas add `min-h-[120px] resize-y`. Selects use the same styling as inputs with a trailing `ChevronDown` icon.

### Token Assembly

| Part | Property | Token | Tailwind class |
|---|---|---|---|
| Input | background | surface-muted | bg-surface-muted |
| Input | border | border-default | border border-border-default |
| Input | border-radius | radius-sm | rounded-sm |
| Input | shadow | shadow-none | shadow-none |
| Input | padding-x | spacing-3 | px-3 |
| Input | padding-y | spacing-2 | py-2 |
| Input | height (single-line) | spacing-10 | h-10 |

### Interactive States

| State | Part | Property | Tailwind class |
|---|---|---|---|
| hover | Input | shadow | hover:shadow-sm |
| hover | Input | border | hover:border-border-strong |
| focus-visible | Input | border | focus-visible:border-brand-primary |
| focus-visible | Input | ring | focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-0 |
| disabled | Input | opacity + cursor | disabled:opacity-50 disabled:cursor-not-allowed |
| error | Input | border | border-feedback-destructive |
| error + focus | Input | ring | focus-visible:ring-2 focus-visible:ring-feedback-destructive |

### Interaction Design Notes

**Width constraints:** Inputs must never stretch to full viewport width. Apply `max-w-*` based on expected content (see Principle 3). A building name input uses `max-w-md`; a year input uses `max-w-[8rem]`. The Form Structure component (section 5) is responsible for enforcing this in context — but if a Form Field is ever used standalone, it must still be width-constrained.

**Progressive disclosure:** None — inputs are always fully visible.

### Constraints

**Always:** Inputs use `surface-muted` background, not `surface-card`. This creates a subtle inset that differentiates the editable area from the card surface it sits on. An input with `surface-card` background on a `surface-card` panel is invisible.

**Always:** Error state replaces the border colour with `feedback-destructive` and the focus ring with `feedback-destructive`. The error state must never rely on colour alone — pair it with an error message (see Form Structure).

**Default:** Single-line inputs use `h-10`. Legitimate exception: compact table-inline editing inputs may use `h-8`.

---

## 5. Form Structure

### Purpose
The composition wrapper that assembles a label, a form field, helper text, and an error message into a single form group. This component governs vertical rhythm within forms.

### Layout Composition
Each form group is `flex flex-col gap-1.5`. The label sits above the input. Helper text sits below the input. Error text replaces helper text when validation fails — they never appear simultaneously.

A form itself is `flex flex-col gap-6` — `spacing-6` between field groups. Logical sections within a form (e.g. "Location Details" vs "Building Metadata") are separated by `spacing-12` and a `border-t border-border-default pt-8` divider.

Form-level actions (Submit, Cancel) sit at the bottom in `flex items-center justify-end gap-3 pt-6 border-t border-border-default`.

For constrained-width forms (settings, single-record editing), the entire form wrapper uses `max-w-2xl`.

### Token Assembly

| Part | Property | Token | Tailwind class |
|---|---|---|---|
| Field group | gap (label → input → helper) | spacing-1.5 | gap-1.5 |
| Form | gap (between field groups) | spacing-6 | gap-6 |
| Section divider | border-top | border-default | border-t border-border-default |
| Section divider | padding-top | spacing-8 | pt-8 |
| Section divider | margin-top | spacing-12 | mt-12 |
| Action row | padding-top | spacing-6 | pt-6 |
| Action row | border-top | border-default | border-t border-border-default |
| Action row | gap | spacing-3 | gap-3 |

### Interaction Design Notes

**Width constraints:** The form wrapper itself is constrained (`max-w-2xl` for full-page forms). Individual inputs within the form are further constrained by content type (see Principle 3). A form containing a "Building Name" field and a "Year Built" field should not make both inputs the same width — the name field is `max-w-md`, the year field is `max-w-[8rem]`.

**Edit model:** Forms on dedicated pages (Create Building, Edit Profile) use inline editing — the page is the edit surface. Forms triggered from a list row or card (edit a review, change a building's collection assignment) use modal editing — the data returns to the list on save.

### Constraints

**Always:** Error text replaces helper text — they never coexist. Showing both creates ambiguity about which message applies.

**Always:** The form action row uses `justify-end` — primary action (Save/Submit) is the rightmost button. This is a spatial convention that must not vary across pages.

**Default:** Form section gap is `spacing-12` with a border divider. Legitimate exception: a very short form (2–3 fields, single section) omits section dividers entirely.

---

## 6. Badge

### Purpose
A small inline label communicating status (Published, Draft), category (Residential, Commercial), or count (3 reviews). Badges are read-only — they do not trigger actions.

### Layout Composition
Badges use `inline-flex items-center gap-1`. When badges appear as a set (e.g. building categories), the containing element uses `flex flex-wrap gap-2`.

### Token Assembly (default/neutral variant)

| Part | Property | Token | Tailwind class |
|---|---|---|---|
| Container | background | surface-muted | bg-surface-muted |
| Container | border | border-default | border border-border-default |
| Container | border-radius | radius-sm | rounded-sm |
| Container | padding-x | spacing-2 | px-2 |
| Container | padding-y | spacing-0.5 | py-0.5 |

### Variants

| Variant | Part | Property | Token | Tailwind class |
|---|---|---|---|---|
| brand | Container | background | brand-secondary | bg-brand-secondary |
| brand | Text | colour | brand-secondary-foreground | text-brand-secondary-foreground |
| success | Container | background | feedback-success/10 | bg-feedback-success/10 |
| success | Text | colour | feedback-success | text-feedback-success |
| warning | Container | background | feedback-warning/10 | bg-feedback-warning/10 |
| warning | Text | colour | feedback-warning | text-feedback-warning |
| destructive | Container | background | feedback-destructive/10 | bg-feedback-destructive/10 |
| destructive | Text | colour | feedback-destructive | text-feedback-destructive |

### Constraints

**Always:** Badges use `radius-sm` (2px), not `radius-full`. Pill-shaped badges contradict Plano's sharp aesthetic. Only avatars use `radius-full`.

**Always:** Badge text uses `uppercase tracking-wide` (letter-spacing-wide). This is an intentional architectural convention — small-caps labels echo drafting notation. See the Typography Matrix for exact size and weight.

**Default:** Use the neutral variant unless the badge communicates a specific system status (success, warning, destructive) or brand association. Legitimate exception: none — decorative colour on badges undermines the grayscale discipline.

---

## 7. Table

### Purpose
Presents structured, multi-column data — building lists, review tables, collection inventories. The table is the primary data-browsing surface in Plano.

### Layout Composition
The table sits inside a container: `w-full overflow-x-auto border border-border-default rounded-sm`. The `<table>` element uses `w-full border-collapse`. Header cells use `text-left`. Body rows are full-width. Cells use `px-4 py-3` padding.

For tables with row actions, the last column is right-aligned (`text-right`) and contains the action buttons.

### Token Assembly

| Part | Property | Token | Tailwind class |
|---|---|---|---|
| Container | background | surface-card | bg-surface-card |
| Container | border | border-default | border border-border-default |
| Container | border-radius | radius-sm | rounded-sm |
| Container | shadow | shadow-none | shadow-none |
| Header row | background | surface-muted | bg-surface-muted |
| Header row | border-bottom | border-default | border-b border-border-default |
| Header cell | padding | spacing-4 x, spacing-3 y | px-4 py-3 |
| Body row | border-bottom | border-default | border-b border-border-default |
| Body cell | padding | spacing-4 x, spacing-3 y | px-4 py-3 |

### Interactive States

| State | Part | Property | Tailwind class |
|---|---|---|---|
| hover | Body row | background | hover:bg-brand-secondary |
| selected | Body row | background | bg-brand-secondary |

### Interaction Design Notes

**Progressive disclosure:** Row actions (Edit, Delete, View) are hover-revealed. The `<tr>` carries `group`. The action cell contains buttons wrapped in a container with `opacity-0 group-hover:opacity-100 transition-opacity duration-150`. Exception: if the table has a single primary action per row (e.g. "View Building"), that action may be persistently visible as a text link.

**Action representation:** Row actions use icon-only ghost buttons (`Pencil`, `Trash2`, `ArrowUpRight`), each `h-8 w-8`. They sit in a `flex items-center justify-end gap-1` container within the action cell.

**Edit model:** Clicking a table row (outside the action cell) navigates to the detail view. Inline editing is not used in tables — the data model is too complex. Edit actions open the record in a modal or navigate to an edit page.

**Empty state:** When the table has zero rows, render the Empty State component (section 10) inside the table container, replacing the `<table>` element entirely.

### Constraints

**Always:** Table header text uses `uppercase tracking-wide text-xs font-medium text-text-secondary`. This is the architectural drafting convention — column headers are labelling, not content.

**Always:** Row hover uses `brand-secondary` (the barely-there neon tint), not `surface-muted`. This is the only place the brand accent appears in the table — it must be consistent.

**Default:** Tables use `shadow-none` and rely on the border for containment. Legitimate exception: a table that sits on `surface-muted` (e.g. inside a sidebar panel) may use `shadow-md` to lift it from the muted surface.

---

## 8. Modal / Dialog

### Purpose
A floating overlay that captures focus for a self-contained task — creating a building, editing a review, confirming a destructive action. Modals interrupt the current flow and must be resolved before returning.

### Layout Composition
The backdrop is `fixed inset-0 bg-black/50 z-50 flex items-center justify-center`. The modal container is `flex flex-col w-full max-w-lg mx-4`. Internal structure: header (`flex items-center justify-between p-6 border-b border-border-default`), body (`p-6 overflow-y-auto`), footer (`flex items-center justify-end gap-3 p-6 border-t border-border-default`).

For modals containing forms, the body scrolls independently if content exceeds `max-h-[70vh]`.

### Token Assembly

| Part | Property | Token | Tailwind class |
|---|---|---|---|
| Backdrop | background | — | bg-black/50 |
| Container | background | surface-overlay | bg-surface-overlay |
| Container | border | border-default | border border-border-default |
| Container | border-radius | radius-lg | rounded-lg |
| Container | shadow | shadow-lg | shadow-lg |
| Header | padding | spacing-6 | p-6 |
| Header | border-bottom | border-default | border-b border-border-default |
| Body | padding | spacing-6 | p-6 |
| Footer | padding | spacing-6 | p-6 |
| Footer | border-top | border-default | border-t border-border-default |
| Footer | gap | spacing-3 | gap-3 |

### Interactive States

| State | Part | Property | Tailwind class |
|---|---|---|---|
| — | Close button | — | See Button (ghost, icon-sm) |

### Interaction Design Notes

**Action representation:** The close affordance is an `X` icon button (ghost, icon-sm size) in the top-right of the header. The footer contains text-label buttons: primary action (rightmost, primary variant) and Cancel (ghost variant, leftmost).

**Width constraints:** Default modal width is `max-w-lg` (32rem). For modals containing wide content (a data table, a building comparison view), use `max-w-2xl`. For narrow confirmation dialogs, use `max-w-sm`.

**Edit model:** Modals are used for multi-field editing initiated from list views. Single-value edits (renaming inline) do not warrant a modal.

### Constraints

**Always:** Modals use `shadow-lg` — they float above all page content. Using `shadow-md` or `shadow-none` misrepresents the elevation and makes the backdrop feel disconnected from the modal.

**Always:** Modals use `radius-lg` (6px). This is the one context where a slightly softer radius is permitted — the modal needs to feel like a distinct floating surface, not a sharp cut from the page. This does not extend to the buttons or inputs inside the modal, which remain `radius-sm`.

**Always:** Focus is trapped within the modal. Pressing Escape closes it. These are WCAG requirements, not style choices.

**Default:** Modal width is `max-w-lg`. Legitimate exception: modals displaying tabular data or side-by-side comparisons may use `max-w-2xl`.

---

## 9. Sidebar Navigation

### Purpose
The persistent vertical navigation panel on the left side of the layout. It provides access to all top-level sections of the application.

### Layout Composition
The sidebar is `flex flex-col h-full`. It contains a logo/brand area at the top (`p-6`), a navigation list in the middle (`flex-1 flex flex-col gap-1 px-3 py-4 overflow-y-auto`), and an optional footer area at the bottom (`p-4 border-t border-border-default`).

Each nav item is `flex items-center gap-3 px-3 py-2 rounded-sm w-full text-left`. Items contain an icon (20×20, from lucide-react) and a text label.

### Token Assembly

| Part | Property | Token | Tailwind class |
|---|---|---|---|
| Sidebar container | background | surface-muted | bg-surface-muted |
| Sidebar container | border-right | border-default | border-r border-border-default |
| Nav item (default) | background | transparent | bg-transparent |
| Nav item (default) | border-radius | radius-sm | rounded-sm |
| Nav item (default) | padding | spacing-3 x, spacing-2 y | px-3 py-2 |
| Nav item (active) | background | surface-card | bg-surface-card |
| Nav item (active) | border | border-default | border border-border-default |
| Active indicator | border-left | text-primary | border-l-2 border-text-primary |
| Footer | border-top | border-default | border-t border-border-default |
| Footer | padding | spacing-4 | p-4 |

### Interactive States

| State | Part | Property | Tailwind class |
|---|---|---|---|
| hover | Nav item | background | hover:bg-surface-card |
| focus-visible | Nav item | ring | focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 |
| active | Nav item | background + border | bg-surface-card border border-border-default |

### Interaction Design Notes

**Action representation:** Nav items always use icon + text label. The icon aids scannability; the text label is required for accessibility and for distinguishing sections with similar iconography. Icon-only collapsed sidebar is not part of Plano's design — the spacious density directive allocates room for the full sidebar.

**Progressive disclosure:** All navigation items are visible at rest. No hover-revealed nav items — the sidebar is the primary wayfinding mechanism and must not hide destinations.

### Constraints

**Always:** The active nav item uses a `text-primary` (`#171717`) left border accent (2px) — monochromatic, not neon. The sidebar is a structural element, not a brand expression surface. Neon does not appear in navigation.

**Always:** Nav item text uses `text-primary` for all states (default and active). Active vs default is distinguished by background surface and the left border accent, not by text colour. See the Typography Matrix for weight distinction (`font-weight-medium` default, `font-weight-semibold` active).

**Default:** The sidebar is 256px wide (`w-64`). Legitimate exception: none — varying sidebar width across pages creates layout instability.

---

## 10. Empty State

### Purpose
Fills a content area when there is no data to display — an empty building list, a collection with no entries, a table with zero results. The empty state provides orientation and an optional CTA to resolve the emptiness.

### Layout Composition
The empty state is centred within its parent container: `flex flex-col items-center justify-center text-center py-16 px-8`. It contains an icon area (48×48, lucide-react icon in `text-text-disabled`), a heading, a description, and an optional primary button.

Internal gap: `gap-4` between all children. The icon sits above the heading with `gap-3` between them.

### Token Assembly

| Part | Property | Token | Tailwind class |
|---|---|---|---|
| Container | padding-y | spacing-16 | py-16 |
| Container | padding-x | spacing-8 | px-8 |
| Container | gap | spacing-4 | gap-4 |
| Icon | size | 48px | h-12 w-12 |
| Icon | colour | text-disabled | text-text-disabled |
| Description | max-width | — | max-w-sm |

### Constraints

**Always:** The description text is constrained to `max-w-sm` so it does not stretch across wide containers. Centred text wider than ~45 characters becomes difficult to read.

**Default:** The CTA button uses the primary variant. Legitimate exception: if the empty state is inside a secondary context (e.g. a sidebar panel), the CTA may use the secondary variant to avoid neon accent overuse.

---

## 11. Loading Skeleton

### Purpose
Animated placeholder blocks that mirror the dimensions of real content, shown while data is being fetched. Skeletons prevent layout shift and communicate that content is loading.

### Layout Composition
Skeletons replicate the layout of the component they replace. A card skeleton matches the card's `flex flex-col gap-4 p-6` structure. A table skeleton uses the same column widths and row heights.

Each skeleton block is a `div` with `animate-pulse rounded-sm`. Heights match the content they replace: heading blocks are `h-6`, body text blocks are `h-4`, image areas are `aspect-[4/3] w-full`.

### Token Assembly

| Part | Property | Token | Tailwind class |
|---|---|---|---|
| Skeleton block | background | surface-muted | bg-surface-muted |
| Skeleton block | border-radius | radius-sm | rounded-sm |
| Skeleton block | animation | — | animate-pulse |

### Constraints

**Always:** Skeleton blocks use `surface-muted`, not `border-default` or a custom grey. The muted surface is the designated "quiet/supporting" token — skeletons are a supporting visual element.

**Always:** Skeleton blocks use `rounded-sm` to match the sharp aesthetic. Do not use `rounded-full` for skeleton lines — that creates a visual inconsistency with the sharp corners of the actual content that replaces them.

**Default:** Use `animate-pulse` (Tailwind's built-in opacity animation). Legitimate exception: none — custom shimmer animations add implementation complexity without design benefit in Plano's minimal system.

---

## 12. Toast / Alert

### Purpose
A transient notification that communicates the result of a system action — a successful save, a validation warning, a destructive error, an informational update. Toasts appear briefly and dismiss automatically or on user action.

### Layout Composition
Toasts are positioned `fixed bottom-6 right-6 z-50` (or in a toast stack container). Each toast is `flex items-start gap-3 w-full max-w-sm p-4`. It contains a status icon (20×20), a text block (title + description in `flex flex-col gap-1`), and an optional dismiss button (`X`, ghost, icon-sm) on the right.

### Token Assembly (info variant — base)

| Part | Property | Token | Tailwind class |
|---|---|---|---|
| Container | background | surface-card | bg-surface-card |
| Container | border | border-default | border border-border-default |
| Container | border-radius | radius-md | rounded-md |
| Container | shadow | shadow-lg | shadow-lg |
| Container | padding | spacing-4 | p-4 |
| Container | gap | spacing-3 | gap-3 |
| Container | max-width | — | max-w-sm |

### Variants

| Variant | Part | Property | Token | Tailwind class |
|---|---|---|---|---|
| success | Left border | border-left | feedback-success | border-l-4 border-feedback-success |
| success | Icon | colour | feedback-success | text-feedback-success |
| warning | Left border | border-left | feedback-warning | border-l-4 border-feedback-warning |
| warning | Icon | colour | feedback-warning | text-feedback-warning |
| destructive | Left border | border-left | feedback-destructive | border-l-4 border-feedback-destructive |
| destructive | Icon | colour | feedback-destructive | text-feedback-destructive |
| info | Left border | border-left | brand-primary | border-l-4 border-brand-primary |
| info | Icon | colour | text-secondary | text-text-secondary |

### Interactive States

| State | Part | Property | Tailwind class |
|---|---|---|---|
| hover (dismiss) | Button | background | hover:bg-surface-muted |
| focus-visible (dismiss) | Button | ring | focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 |

### Interaction Design Notes

**Action representation:** The dismiss button is an `X` icon (ghost, icon-sm). For toasts with an undo action (e.g. after a deletion), add a text button labelled "Undo" between the text block and the dismiss button.

**Progressive disclosure:** All toast content is visible immediately — no hover-reveal. Toasts are transient and must communicate their message within the brief time they are visible.

### Constraints

**Always:** Toasts use `shadow-lg` — they float above all page content, same elevation as modals. Using a lesser shadow makes the toast appear embedded in the page rather than overlaid.

**Always:** Each semantic variant has a 4px left border in the corresponding feedback colour. This coloured accent is the primary differentiator between variants — do not rely on icon alone. The left-border pattern echoes the sidebar's active indicator, creating a consistent "attention here" signal.

**Always:** Toast text uses `text-primary` for the title and `text-secondary` for the description. Do not use feedback colours for toast text — the left border and icon already communicate severity. Coloured text on a white surface at `font-size-sm` can fail contrast checks.

**Default:** Toasts auto-dismiss after 5 seconds. Destructive toasts with an Undo action auto-dismiss after 8 seconds to give the user time to react. Legitimate exception: error toasts that require user acknowledgment (e.g. a failed save with data loss) should persist until manually dismissed.

---

## 13. Feed Editorial Components

### Design Philosophy

The feed follows an editorial magazine aesthetic inspired by A24 Films. The defining characteristics are:

1. **No card containers.** Feed items have no background, border, or shadow. Content sits directly on the white page surface.
2. **Typography is structure.** The contrast between tiny uppercase category labels and massive bold building names creates all the hierarchy needed.
3. **Whitespace is intentional.** Large vertical gaps between feed items create editorial rhythm — each item is a self-contained composition, not a row in a list.
4. **Images are raw.** No border-radius, no borders, no overlays. Sharp edges, like a printed photograph.
5. **CTAs are text, not buttons.** Feed actions use uppercase tracked text with a `→` arrow, never filled buttons.
6. **Monochromatic in the feed.** Black text, gray metadata, white surface. Colour comes only from photography and sparingly from the brand accent on interactive states.

---

### 13a. Feed Hero Card

#### Purpose
The primary editorial unit — a full-width magazine-spread layout showcasing a building review with photography. This is the most visually impactful feed item and sets the editorial tone.

#### Layout Composition
Two-column layout on desktop: text block on one side, image on the other. The text block contains (top to bottom): category label, building name (massive), architect name, review excerpt, user attribution, and CTA link. The image fills its column edge-to-edge with no padding, border, or radius.

On mobile, the layout stacks vertically: image first (full-width, edge-to-edge), text block below.

The text-image position alternates between feed items (text-left/image-right, then text-right/image-left) to create visual rhythm, like magazine page spreads.

Desktop structure: `grid grid-cols-2 gap-0 items-stretch`. Mobile: `flex flex-col`.

#### Token Assembly

| Part | Property | Token | Tailwind class |
|---|---|---|---|
| Container | background | none | — (transparent, sits on page surface) |
| Container | border | none | — |
| Container | margin-bottom | spacing-16 to spacing-20 | mb-16 / mb-20 |
| Category label | — | — | text-2xs font-medium uppercase tracking-widest text-text-secondary |
| Building name | — | — | text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-text-primary |
| Architect name | — | — | text-sm font-normal text-text-secondary |
| Review excerpt | — | — | text-base font-normal leading-relaxed text-text-secondary max-w-md |
| User attribution | — | — | text-sm font-medium text-text-primary |
| CTA link | — | — | text-xs font-medium uppercase tracking-widest text-text-primary hover:text-brand-primary transition-colors |
| CTA arrow | — | — | `→` character or ArrowRight icon, inline |
| Image | border-radius | radius-none | rounded-none |
| Image | object-fit | — | object-cover w-full h-full |

#### Interaction Design Notes

**CTA pattern:** The primary CTA is a text link reading `VIEW BUILDING →` — uppercase, tracked, with an arrow. On hover, the text or arrow shifts to `brand-primary`. This replaces any filled button in the feed context.

**Image interaction:** Clicking the image navigates to the building detail page. No hover overlay or zoom effect — the editorial aesthetic is static and composed, not animated.

**Like/save actions:** Positioned subtly beneath the review excerpt or in the user attribution row. Icon-only, small (`h-6 w-6`), using `text-text-secondary` at rest, `text-text-primary` on hover, `brand-primary` when active.

#### Constraints

**Always:** Hero cards have no background, border, or shadow. They are open compositions.

**Always:** Building names use `font-size-5xl` minimum on desktop, `font-size-3xl` minimum on mobile. The editorial impact depends on scale — do not shrink the headline to fit.

**Always:** Images use `rounded-none`. Sharp edges are non-negotiable in the editorial feed.

**Default:** Vertical spacing between hero cards and the next feed item is `spacing-16` (64px) minimum. This editorial pause separates compositions.

---

### 13b. Feed Activity Card

#### Purpose
A compact feed item representing a status-only action (visited / wants to visit) without review content or images. Multiple activity cards can sit side-by-side in a grid row.

#### Layout Composition
Horizontal layout: small building thumbnail on the left, text on the right. Text contains: user name + action verb + building name, with timestamp below. When multiple activity cards appear together, they sit in a `grid grid-cols-2 gap-8` row on desktop, single column on mobile.

#### Token Assembly

| Part | Property | Token | Tailwind class |
|---|---|---|---|
| Container | background | none | — |
| Container | border | none | — |
| Container | padding-bottom | spacing-8 | pb-8 |
| Container | border-bottom | border-default | border-b border-border-default (subtle divider between activity rows only) |
| Building thumbnail | size | hero: 112px, compact: 96px | w-28 h-28 (hero) / w-24 h-24 (compact) |
| Building thumbnail | border-radius | radius-none | rounded-none |
| Building thumbnail | object-fit | — | object-cover |
| User name | — | — | text-sm font-medium text-text-primary |
| Action verb | — | — | text-sm font-normal text-text-secondary |
| Building name | — | — | text-sm font-semibold text-text-primary |

#### Constraints

**Always:** Activity cards use no timestamp — dates are removed from the feed in the editorial aesthetic. Metadata is reduced to the essential: who did what to which building.

**Always:** Activity cards are the smallest editorial unit. They use a subtle `border-b` divider between rows — this is the one place a border appears in the feed, to separate adjacent compact items that would otherwise merge visually.

**Default:** Activity cards group in pairs. A single activity card still takes half the grid width on desktop, preserving visual rhythm.

---

### 13c. Feed Compact Card

#### Purpose
A compact review card with a building thumbnail and text — displays building image, building name, review excerpt, and user attribution.

#### Layout Composition
Horizontal layout: building thumbnail on the left (`w-24 h-24`, sharp edges), text on the right. Text contains: category label, building name, review excerpt, user attribution row with bookmark icon. When compact cards appear together, they sit in a `grid grid-cols-2 gap-8` row, similar to activity cards.

#### Token Assembly

| Part | Property | Token | Tailwind class |
|---|---|---|---|
| Container | background | none | — |
| Container | border | none | — |
| Container | padding-bottom | spacing-12 | pb-12 |
| Building thumbnail | size | 96px | w-24 h-24 |
| Building thumbnail | border-radius | radius-none | rounded-none |
| Building thumbnail | object-fit | — | object-cover shrink-0 |
| Category label | — | — | text-2xs font-medium uppercase tracking-widest text-text-secondary |
| Building name | — | — | text-2xl font-semibold tracking-tight leading-tight text-text-primary |
| Review excerpt | — | — | text-base font-normal leading-relaxed text-text-secondary |
| User name | — | — | text-sm font-medium text-text-primary |
| Bookmark icon | — | — | Bookmark icon, text-text-secondary; fill-text-primary when saved |

#### Constraints

**Always:** Compact cards have no border or background. Structure comes from the building name's typographic weight.

**Always:** No timestamp. Dates are removed from the editorial feed.

**Default:** Review text is truncated at 3 lines with `line-clamp-3`.

---

### 13d. Feed Collection Card

#### Purpose
A horizontal editorial strip showcasing a user's curated collection of buildings.

#### Layout Composition
Full-width horizontal layout: a row of 4–6 building thumbnails on top (edge-to-edge, tight mosaic), with collection title, owner, and building count below.

#### Token Assembly

| Part | Property | Token | Tailwind class |
|---|---|---|---|
| Container | background | none | — |
| Container | margin-bottom | spacing-16 | mb-16 |
| Mosaic row | gap | mosaic-gap | gap-mosaic-gap |
| Mosaic row | layout | — | flex overflow-hidden |
| Mosaic image | height | 240px | h-[240px] |
| Mosaic image | border-radius | radius-none | rounded-none |
| Mosaic image | object-fit | — | object-cover flex-1 min-w-0 |
| Collection title | — | — | text-2xl font-semibold tracking-tight text-text-primary mt-4 |
| Owner name | — | — | text-sm font-normal text-text-secondary |
| Building count | — | — | text-xs font-normal text-text-disabled |
| CTA link | — | — | text-xs font-medium uppercase tracking-widest text-text-primary hover:text-brand-primary |

#### Constraints

**Always:** Mosaic images use `rounded-none` and `gap-mosaic-gap` (1.5px hairline). The tight mosaic reads as a single photographic strip, not as individual cards.

---

### 13e. Feed Section Divider

#### Purpose
A typographic separator between feed sections (e.g., between social feed and community discovery content).

#### Layout Composition
A single line of uppercase tracked text with an optional `→` arrow linking to a discovery page. Centred or left-aligned depending on context. May include a subtle `border-t` above.

#### Token Assembly

| Part | Property | Token | Tailwind class |
|---|---|---|---|
| Container | padding-y | spacing-8 | py-8 |
| Container | border-top | border-default | border-t border-border-default |
| Label | — | — | text-2xs font-medium uppercase tracking-widest text-text-secondary |
| Arrow/link | — | — | text-2xs font-medium uppercase tracking-widest text-text-primary hover:text-brand-primary ml-2 |

#### Constraints

**Always:** Section dividers use the tiny uppercase tracked label style. They are architectural marginalia — labelling, not headings.

---

### 13f. Feed Hero Card — Actions

The only persistent in-feed action is **bookmark** (save building). All other actions (like, comment, visit, rate, hide) are removed from the feed surface. Users engage more deeply by navigating into the building or review detail page.

**Bookmark token assembly:**

| Part | Property | Tailwind class |
|---|---|---|
| Icon at rest | — | `Bookmark`, `text-text-secondary`, `h-5 w-5` |
| Icon (saved) | — | `fill-text-primary text-text-primary` (monochromatic fill) |

No other action icons appear in the feed. No date or timestamp is shown on any feed card type.

---

## 14. Content Detail Pages (Building / Profile / Architect)

### Design Philosophy

Content detail pages — building detail, user profile, architect profile — follow the same editorial principles as the feed. They are a continuation of the magazine aesthetic into deep-dive territory. The page is a single-column canvas, not a dashboard.

### Layout

**Max-width:** `max-w-4xl mx-auto` — all content detail pages are single-column and centred at this width. No right sidebar. The sidebar layout (two-column with a 320px right panel) is prohibited on content pages.

**Hero image:** Flush to the layout edge, no border-radius, no scrim/gradient overlay. Image height: `h-[clamp(200px,40vh,520px)]` (building), shorter for profile headers. Fallback: `bg-surface-muted`.

**Page title:** Appears below the image (not overlaid on it). Size: `text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight`. No subtitle card or header box.

### Section Pattern

Every named section on a content detail page follows this exact structure:

```
<div class="border-t border-border-default pt-8 mt-12">
  <span class="text-2xs font-medium tracking-widest uppercase text-text-secondary">Section Name</span>
  <!-- section content -->
</div>
```

The uppercase tracked label *is* the section heading. No `<h2>` or `<h3>` tags at large size. The label is marginalia — structural, not dominant.

### Tab Strip (Profile / Architect pages)

| Part | Property | Tailwind class |
|---|---|---|
| Tab list | border-bottom | `border-b border-border-default` |
| Tab item | typography | `text-xs font-medium uppercase tracking-widest` |
| Tab item (active) | indicator | `border-b-2 border-text-primary text-text-primary` |
| Tab item (inactive) | colour | `text-text-disabled` |
| Tab item gap | — | `gap-6` or `gap-8` |

No `brand-primary` in tab indicators. Active state is monochromatic `border-text-primary`.

### Portfolio Grid (Architect)

The architect portfolio grid uses a flush tile layout:

| Part | Property | Tailwind class |
|---|---|---|
| Grid | structure | `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border-default` |
| Tile | background | `bg-surface-default` |
| Tile image | border-radius | `rounded-none` |
| Tile image | aspect | `aspect-[4/3]` |
| Tile caption | padding | `px-1 py-3` |
| Tile title | — | `text-sm font-semibold text-text-primary` |
| Tile meta | — | `text-2xs text-text-secondary` |
| Save action | — | text CTA pattern: `text-xs font-medium uppercase tracking-widest` |

The `gap-px bg-border-default` pattern produces 1px hairline dividers between tiles — the grid reads as a single photographic array, not as individual cards.

### Profile Highlights & Favourites

| Pattern | Tailwind class |
|---|---|
| Section header | `border-t border-border-default pt-4` + uppercase tracked label |
| Edit/Manage CTA | text CTA: `text-xs font-medium uppercase tracking-widest text-text-secondary hover:text-text-primary` |
| Style tags | Plain text, no pill borders: `px-3 py-1 text-sm font-medium text-text-secondary` |
| Quote blockquote | `border-l-[3px] border-text-primary pl-4 py-2` (monochromatic) |
| Architect avatar (people section) | Square `h-20 w-20 rounded-none` — not circular |
| Favourite poster | `aspect-square rounded-none` sharp image, text below |

### Constraints

**Always:** Content detail pages use a single-column `max-w-4xl` layout. No right sidebar.

**Always:** Page titles appear below the hero image, never overlaid on it. No gradient scrim on the hero.

**Always:** Section labels use the `text-2xs uppercase tracking-widest text-text-secondary` pattern — not `<h2>` or `<h3>` at heading scale.

**Always:** All interactive text links on content detail pages use the text CTA pattern (`uppercase tracking-widest text-xs font-medium`). No filled buttons in content page body sections.

**Always:** No `brand-primary` appears on content detail pages outside of focus rings and modal CTAs.

---

## Appendix A — Typography Application Matrix

When a component entry does not specify typography for an element, this
matrix takes precedence. Override it in a specific entry only with a
documented reason.

| Context | Size | Weight | Colour | Letter-spacing | Line-height |
|---|---|---|---|---|---|
| Page title (h1) | font-size-4xl | font-weight-bold | text-primary | letter-spacing-tight | line-height-tight |
| Section heading (h2) | font-size-3xl | font-weight-semibold | text-primary | letter-spacing-tight | line-height-tight |
| Card title (h3) | font-size-xl | font-weight-semibold | text-primary | letter-spacing-normal | line-height-tight |
| Subsection heading (h4) | font-size-base | font-weight-semibold | text-primary | letter-spacing-normal | line-height-tight |
| Body copy | font-size-base | font-weight-normal | text-primary | letter-spacing-normal | line-height-normal |
| Supporting / secondary text | font-size-sm | font-weight-normal | text-secondary | letter-spacing-normal | line-height-normal |
| Table header | font-size-xs | font-weight-medium | text-secondary | letter-spacing-wide | line-height-normal |
| Table cell | font-size-sm | font-weight-normal | text-primary | letter-spacing-normal | line-height-normal |
| Form label | font-size-sm | font-weight-medium | text-primary | letter-spacing-normal | line-height-normal |
| Input placeholder | font-size-sm | font-weight-normal | text-disabled | letter-spacing-normal | line-height-normal |
| Helper / hint text | font-size-xs | font-weight-normal | text-secondary | letter-spacing-normal | line-height-normal |
| Error text | font-size-xs | font-weight-normal | feedback-destructive | letter-spacing-normal | line-height-normal |
| Button label | font-size-sm | font-weight-medium | [variant-foreground] | letter-spacing-normal | line-height-tight |
| Badge / tag | font-size-xs | font-weight-medium | [variant-foreground] | letter-spacing-wide | line-height-tight |
| Nav item (default) | font-size-sm | font-weight-medium | text-primary | letter-spacing-normal | line-height-normal |
| Nav item (active) | font-size-sm | font-weight-semibold | text-primary | letter-spacing-normal | line-height-normal |
| Caption / timestamp | font-size-xs | font-weight-normal | text-secondary | letter-spacing-normal | line-height-normal |
| Code / monospace | font-size-sm (font-mono) | font-weight-normal | text-primary | letter-spacing-normal | line-height-normal |
| Building ID / short_id | font-size-xs (font-mono) | font-weight-normal | text-secondary | letter-spacing-wide | line-height-normal |
| Empty state heading | font-size-lg | font-weight-semibold | text-primary | letter-spacing-normal | line-height-tight |
| Empty state description | font-size-sm | font-weight-normal | text-secondary | letter-spacing-normal | line-height-normal |
| Modal title | font-size-lg | font-weight-semibold | text-primary | letter-spacing-normal | line-height-tight |
| Toast title | font-size-sm | font-weight-semibold | text-primary | letter-spacing-normal | line-height-tight |
| Toast description | font-size-sm | font-weight-normal | text-secondary | letter-spacing-normal | line-height-normal |
| Map pin label | font-size-xs | font-weight-medium | text-primary | letter-spacing-normal | line-height-tight |
| | | | | | |
| **Feed editorial** | | | | | |
| Feed category label | font-size-2xs | font-weight-medium | text-secondary | letter-spacing-wide | line-height-normal |
| Feed building name (hero) | font-size-5xl / 6xl | font-weight-bold | text-primary | letter-spacing-tight | line-height-tight |
| Feed building name (compact) | font-size-2xl | font-weight-semibold | text-primary | letter-spacing-tight | line-height-tight |
| Feed review excerpt | font-size-base | font-weight-normal | text-secondary | letter-spacing-normal | line-height-relaxed |
| Feed user name | font-size-sm | font-weight-medium | text-primary | letter-spacing-normal | line-height-normal |
| Feed timestamp | font-size-xs | font-weight-normal | text-disabled | letter-spacing-normal | line-height-normal |
| Feed CTA link | font-size-xs | font-weight-medium | text-primary | letter-spacing-wide | line-height-tight |
| Feed section divider | font-size-2xs | font-weight-medium | text-secondary | letter-spacing-wide | line-height-normal |
| Feed sidebar widget title | font-size-xs | font-weight-medium | text-secondary | letter-spacing-wide | line-height-normal |
| Feed sidebar item name | font-size-base | font-weight-semibold | text-primary | letter-spacing-normal | line-height-tight |
| Feed sidebar item meta | font-size-xs | font-weight-normal | text-secondary | letter-spacing-normal | line-height-normal |
| | | | | | |
| **Content detail pages** | | | | | |
| Page hero title | font-size-4xl / 5xl / 6xl | font-weight-bold | text-primary | letter-spacing-tight | line-height-tight |
| Page section label | font-size-2xs | font-weight-medium | text-secondary | letter-spacing-wide | line-height-normal |
| Tier / rank label | font-size-2xs | font-weight-medium | text-secondary | letter-spacing-wide | line-height-normal |
| Inline CTA (text link + arrow) | font-size-xs | font-weight-medium | text-primary | letter-spacing-wide | line-height-tight |
| Tab item (active) | font-size-xs | font-weight-medium | text-primary | letter-spacing-wide | line-height-normal |
| Tab item (inactive) | font-size-xs | font-weight-medium | text-disabled | letter-spacing-wide | line-height-normal |
| Profile stat value | font-size-2xl | font-weight-bold | text-primary | letter-spacing-tight | line-height-tight |
| Profile stat label | font-size-2xs | font-weight-medium | text-secondary | letter-spacing-wide | line-height-normal |
| Portfolio tile title | font-size-sm | font-weight-semibold | text-primary | letter-spacing-normal | line-height-tight |
| Portfolio tile meta | font-size-2xs | font-weight-normal | text-secondary | letter-spacing-normal | line-height-normal |
| Highlights sub-label | font-size-2xs | font-weight-medium | text-disabled | letter-spacing-wide | line-height-normal |
| Quote blockquote | font-size-sm | font-weight-medium | text-secondary | letter-spacing-normal | line-height-relaxed |

---

## Appendix B — Semantic Colour Usage Guide

A reasoning guide, not a prohibition list. When choosing tokens for a
component not explicitly covered above, match the component's role to
the descriptions below. The surface hierarchy creates depth; the text
hierarchy creates emphasis. A token that misrepresents either hierarchy
— even subtly — makes the UI feel flat or incoherent, even when
individual components look correct in isolation.

**Surface tokens**

`surface-default` is the page canvas, applied once to the root layout.
A component that shares this token with the page background becomes
invisible against it.

`surface-card` is for any contained block that groups content and sits
on the page background: building cards, data panels, stat blocks,
review cards, collection tiles, table containers, and modal bodies.
In non-editorial contexts, `surface-card` is always paired with
`border-default` — shadow is optional and discouraged (prefer
border-only cards; use `shadow-md` only when explicit lift is needed).
A card with `surface-card` and no border is invisible in light mode.

**Editorial feed exception:** Feed components (section 13) do not use
`surface-card` or `border-default`. Content sits directly on the page
surface with no container. Structure comes from typographic scale
contrast, generous vertical spacing, and content grouping.

`surface-muted` signals reduced visual prominence. Use it for areas
that support the primary content: the sidebar background, input field
backgrounds, table header rows, badge backgrounds, skeleton shimmer
areas, code blocks, and filter panels. If a nested element should read
as quieter than its parent card, `surface-muted` is the right choice.
Never use it on action-bearing components (buttons, primary CTAs).

`surface-overlay` is for modals and popovers — elements that float
above all page content. It must always be accompanied by a `bg-black/50`
backdrop and `shadow-lg`.

**Border tokens**

`border-default` provides structure without drawing the eye. It is the
standard border for all components at rest: cards, inputs, table cells,
dividers, section separators. In Plano's minimal system, borders are
the primary hierarchy mechanism — they replace shadows in most contexts.
When uncertain, start here.

`border-strong` communicates that something is active, focused, or
selected. Use it for: a focused input, a selected sidebar item, a
highlighted table row. These three contexts and no others. Do not use
for decorative emphasis.

**Text tokens**

`text-primary` is for content the user must read to complete a task:
headings, body copy, form labels, table cell values, modal headings,
nav items. Near-black, maximum contrast. Default to this when uncertain.

`text-secondary` provides context but is not the primary action target:
timestamps, helper text, column headers, metadata, empty-state
descriptions. Never for interactive labels or required form labels.

`text-disabled` is exclusively for placeholder text and disabled element
labels. Not for de-emphasised content — use `text-secondary` for that.

`text-inverse` is for text on dark or brand-coloured surfaces. Never
place `text-primary` on a dark background.

**Brand accent usage**

`brand-primary` is the single neon accent (`#BEFF00`). In **app UI contexts** (admin, settings, forms, modals) use it for: primary button backgrounds, focus rings, and progress bars. In **editorial content pages** (building detail, profile, architect profile) and the **feed**, it is essentially absent — these are monochromatic surfaces. Do not use `brand-primary` for: section accent bars, verified badges, rating dots, active tab underlines, bookmark fills, filter toggle backgrounds, or avatar borders. All of those use `text-primary` (`#171717`) monochromatic instead. If `brand-primary` appears on any content or feed page outside of a focus ring or modal CTA, it is an error.

`brand-primary-foreground` is always dark (`#171717`). The neon is a
light colour — it requires dark foreground, not white. Using
`text-inverse` on `brand-primary` is a contrast failure.

`brand-secondary` is a barely-there neon tint (`#F7FFE0`). Use for
hovered table rows and selected filter chips in **app UI contexts only**.
It must not appear on content detail pages or the feed.

**Feedback tokens**

`feedback-success` (true green), `feedback-warning` (amber), and
`feedback-destructive` (red) are for system-generated status only:
toasts, validation, badges, alerts. Not for decorative colour. Each
has a `*-foreground` token — always pair them. `feedback-success` is
intentionally differentiated from `brand-primary` by hue so that
"success" and "brand" are never conflated.
