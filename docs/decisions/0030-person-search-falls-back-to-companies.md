# 0030 — The credits Person box offers company records when no person matches

**Status:** accepted (2026-08-05) — expected to be retired by Roadmap Task 7.4

## Context

Roadmap Task 2.1 (CSV ref #21) reports that the person dropdown in the "Add credits" drawer finds
nobody when you type a name, and asks for the "query, RPC, or filtering bug".

There is no such bug. Verified against production (`www.plano.app`, 2026-08-05):

- `foster`, `renzo`, `zaha`, `john`, `maria` — every query returns **People (0)** alongside a full
  page of company hits.
- On [Centre Pompidou](https://www.plano.app/architecture/fr/paris/14713) the credited humans
  Renzo Piano, Richard Rogers, Peter Rice, Su Rogers, Mike Davies and Gianfranco Franchini all link
  to `/company/…`, never `/person/…`.
- "Norman Foster" exists with 28 credits — as a **company**.

`search_people_v2`
([`20270904000000_search_people_companies_v2.sql`](../../supabase/migrations/20270904000000_search_people_companies_v2.sql))
and `CreditEntityPicker` are both correct. The bulk architect/firm import wrote every entry —
individual humans included — into `public.companies`, so `public.people` is effectively empty and
the person search has nothing to return.

That leaves the drawer with a worse failure than "no results": its only remaining affordance is
**Create new person**, which mints a second Norman Foster next to the company record that already
carries his 28 credits.

## Decision

When the picker is restricted to people (`allowedKinds={["person"]}`) it also searches companies for
the same query. If — and only if — the person search comes back empty, the company matches render in
their own `Listed as companies` group, above **Create new person**, each row explicitly marked
`Company`. Choosing one emits a `{ kind: "company" }` selection, and `AddCreditForm` routes it into
the row's Company slot; `personId` stays null and the credit is stored exactly as a company credit
always was.

The same widened search feeds the existing "Did you mean an existing record?" guard, so typing a
name that already exists as a company and pressing **Create person** now warns instead of
duplicating.

Two consequences are deliberate:

- **The group is conditional on zero person hits.** Once Task 7.4 moves real humans into `people`,
  those searches start returning rows and the fallback stops rendering on its own. No flag to
  remember, no second migration.
- **Nothing is relabelled.** A firm is never presented as a person. The user is told where the
  record actually lives and picks it knowingly.

## Alternatives rejected

**Run the reclassification first (Task 7.4).** It is the real cure, and it stays scheduled — but it
is an AI-assisted review of ~16k company rows plus a production data change, and the Credits phase
should not be blocked behind it. Owner decision, 2026-08-05.

**Merge Person and Company into one "Who?" field.** Cleanest end state and the picker already
supports both kinds, but it is a form redesign — that is Task 2.3's scope, not a search fix.

**Leave it and let users create duplicate people.** Every duplicate created now becomes a merge
conflict for Task 7.4 later.

## Scope note

`CreditedEntitiesSelect` (the Add/Edit building form) searches the same empty `people` table and has
the same dead end. It is untouched here: Task 2.1 names the Add-credits dropdown, and Task 2.5
brings this flow to the Edit building page.
