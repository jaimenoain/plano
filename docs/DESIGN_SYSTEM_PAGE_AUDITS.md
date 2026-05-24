# Design System Page Audits

Per-page audit log for the design-system rollout ([docs/ROADMAP.md](ROADMAP.md)). Each entry records intent, deltas, and rationale.

## Audit template

| Field | Description |
|---|---|
| **Page** | Route + primary file |
| **Intent** | User goal on this surface |
| **Kit reference** | `design-system/ui_kits/website/*` or N/A |
| **Deltas** | Token/typography/layout changes applied |
| **States** | idle / loading / error / empty / success verified |
| **Phase** | Rollout phase batch |

---

## Phase 0 — Governance

| Page | Intent | Kit reference | Deltas | States | Phase |
|---|---|---|---|---|---|
| Inventory | Execution baseline | N/A | Verified routes in `app/routes.ts`; added missing `/admin/events`, `/accept-company-steward`, `/company/:slug/dispute`, portfolio redirects | — | 0 |

---

## Phase 1 — Shell

| Page | Intent | Kit reference | Deltas | States | Phase |
|---|---|---|---|---|---|
| App shell | Global navigation | `AppTopNav.jsx` | Centralized `navigation.ts`; semantic tokens on sidebar | idle | 1 |

---

## Phases 2–7

Audits for remaining route families are recorded as each phase batch completes. See completion tracker in [DESIGN_SYSTEM_SCREEN_INVENTORY.md](DESIGN_SYSTEM_SCREEN_INVENTORY.md).
