# Awards Administration — Implementation Roadmap

**Version:** 1.0 — May 2026
**Scope:** Single phase. Award bodies can claim official ownership of an award; admins review claims; award admins get privileged write access to their award data and can review community suggestions.
**Depends on:** `20270876000000_awards_foundation.sql`, `20270878000000_awards_community.sql`

---

## Overview

Awards are currently admin-only write surfaces. This phase adds a lightweight ownership layer so that awarding institutions (RIBA, the Pritzker Foundation, etc.) can claim their award on Plano, edit its data, and moderate community suggestions — without any action by Plano admins on the day-to-day.

**What award admins can do:**
- Edit award metadata (name, description, website, country, frequency, awarding body)
- Create and edit editions and categories
- Add, edit and delete recipients directly
- Approve or reject community suggestions for their award

**Claim flow (admin-approved, no email token for this phase):**
- Any authenticated user clicks "Claim this award" on an unclaimed award
- They submit a short reason (e.g. "I work for RIBA")
- A Plano admin reviews and approves or rejects via `/admin/awards/claims`
- On approval an `award_admins` row is inserted (`role = owner`) and `awards.claim_status` becomes `'claimed'`
- Future phase: email-domain verification against `companies.verified_domain` for self-serve claims

**Ghost-admin protection (documented for future phase):**
- `unclaimed` awards: community edits apply directly (current behaviour, unchanged)
- `claimed` awards, admin active: suggestions held for review
- `claimed` awards, admin inactive > 60 days: suggestions auto-approve after 30 days (pg_cron job — Phase 2)
- `verified` awards (Plano-granted): held indefinitely; Plano admin SLA

---

## Source-of-truth additions

| Entity | Table | Notes |
|---|---|---|
| Award ownership | `award_admins` | Mirrors `company_stewards` |
| Claim requests | `award_claim_requests` | Mirrors `company_claim_disputes` (admin-reviewed) |
| Claim status | `awards.claim_status` | Reuses `person_claim_status` enum |

---

## Tasks

### A.1 — Migration: `award_admins` + `claim_status` + RLS updates

**File:** `supabase/migrations/20270900000000_award_admins.sql`

**Schema changes:**

1. Add column to `awards`:
   ```sql
   ALTER TABLE public.awards
     ADD COLUMN claim_status public.person_claim_status NOT NULL DEFAULT 'unclaimed';
   ```

2. Create `award_admins` table (mirrors `company_stewards`):
   ```sql
   CREATE TABLE public.award_admins (
     id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     award_id   UUID NOT NULL REFERENCES public.awards(id) ON DELETE CASCADE,
     user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
     role       TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'editor')),
     invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     CONSTRAINT award_admins_award_user_key UNIQUE (award_id, user_id)
   );
   CREATE INDEX award_admins_award_id_idx ON public.award_admins(award_id);
   CREATE INDEX award_admins_user_id_idx  ON public.award_admins(user_id);
   ALTER TABLE public.award_admins ENABLE ROW LEVEL SECURITY;
   ```

3. Create `plano_auth_is_award_admin(p_award_id uuid)` — SECURITY DEFINER helper to avoid RLS recursion (mirrors `plano_auth_is_company_steward`):
   ```sql
   CREATE OR REPLACE FUNCTION public.plano_auth_is_award_admin(p_award_id uuid)
   RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
   SET search_path = public, pg_temp AS $$
     SELECT EXISTS (
       SELECT 1 FROM public.award_admins
       WHERE award_id = p_award_id AND user_id = (SELECT auth.uid())
     );
   $$;
   REVOKE ALL ON FUNCTION public.plano_auth_is_award_admin(uuid) FROM PUBLIC;
   GRANT  EXECUTE ON FUNCTION public.plano_auth_is_award_admin(uuid) TO authenticated;
   ```

**RLS policies — `award_admins`:**
- SELECT: `is_admin()` OR `user_id = auth.uid()` OR `plano_auth_is_award_admin(award_id)`
- INSERT: `is_admin()` only (owners added via RPC; editors invited via RPC in future phase)
- UPDATE: `is_admin()` only
- DELETE: `is_admin()` only

**RLS policy updates — `awards`:**

Drop and recreate `awards_update` to also allow owners:
```sql
DROP POLICY "awards_update" ON public.awards;
CREATE POLICY "awards_update" ON public.awards
  FOR UPDATE
  USING  (public.is_admin() OR public.plano_auth_is_award_admin(id))
  WITH CHECK (public.is_admin() OR public.plano_auth_is_award_admin(id));
```
> Owners cannot change `claim_status`, `slug`, or `id` — enforce in the API layer / a BEFORE UPDATE trigger that raises if those columns change for non-admins.

**RLS policy updates — `award_editions`, `award_categories`, `award_recipients`:**

For each table, drop and recreate the INSERT/UPDATE/DELETE policies:
```sql
-- Pattern (repeat for each table, replacing <table> and <fk_col>):
DROP POLICY "<table>_insert" ON public.<table>;
CREATE POLICY "<table>_insert" ON public.<table>
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR public.plano_auth_is_award_admin(<fk_col>)  -- award_id column
  );
-- Same pattern for _update and _delete.
```
- `award_editions`: `award_id` is the FK column
- `award_categories`: `award_id`
- `award_recipients`: resolved via subquery `(SELECT award_id FROM public.award_editions WHERE id = edition_id)`

**RLS policy updates — `award_recipient_suggestions`:**

Drop and recreate `suggestions_select` and `suggestions_update`:
```sql
DROP POLICY "suggestions_select" ON public.award_recipient_suggestions;
CREATE POLICY "suggestions_select" ON public.award_recipient_suggestions
  FOR SELECT USING (
    submitted_by = auth.uid()
    OR public.is_admin()
    OR public.plano_auth_is_award_admin(award_id)
  );

DROP POLICY "suggestions_update" ON public.award_recipient_suggestions;
CREATE POLICY "suggestions_update" ON public.award_recipient_suggestions
  FOR UPDATE
  USING  (public.is_admin() OR public.plano_auth_is_award_admin(award_id))
  WITH CHECK (public.is_admin() OR public.plano_auth_is_award_admin(award_id));
```

**Update `approve_award_suggestion` RPC** to allow award admins (not just platform admins):
- Add caller check: `IF NOT (public.is_admin() OR public.plano_auth_is_award_admin(v_suggestion.award_id)) THEN RAISE EXCEPTION 'forbidden'; END IF;`

---

### A.2 — Migration: claim request flow

**File:** `supabase/migrations/20270900000001_award_claim_requests.sql`

**Schema:**
```sql
CREATE TABLE public.award_claim_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id          UUID NOT NULL REFERENCES public.awards(id) ON DELETE CASCADE,
  requester_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason            TEXT NOT NULL CHECK (length(trim(reason)) >= 20),
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewer_note     TEXT,
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX award_claim_requests_award_id_idx     ON public.award_claim_requests(award_id);
CREATE INDEX award_claim_requests_status_idx        ON public.award_claim_requests(status);
-- At most one pending request per user per award:
CREATE UNIQUE INDEX award_claim_requests_one_pending_per_user_award
  ON public.award_claim_requests(award_id, requester_user_id)
  WHERE status = 'pending';

ALTER TABLE public.award_claim_requests ENABLE ROW LEVEL SECURITY;
```

**RLS — `award_claim_requests`:**
- SELECT: `requester_user_id = auth.uid()` OR `is_admin()`
- INSERT: `authenticated`; `requester_user_id = auth.uid()`; `award.claim_status = 'unclaimed'`; no existing pending row for this user+award (enforced by unique index)
- UPDATE: `is_admin()` only (approve/reject go through RPCs)
- DELETE: `is_admin()` only

**RPC: `submit_award_claim_request(p_award_id uuid, p_reason text)`**
- SECURITY DEFINER, GRANT to `authenticated`
- Validates: caller authenticated; award exists and `claim_status = 'unclaimed'`; `length(trim(p_reason)) >= 20`
- Inserts `award_claim_requests` row
- Inserts `notifications` row of type `award_claim_request_received` for each platform admin (or use existing admin-notification pattern)
- Returns `jsonb { ok: true, request_id }` or `{ ok: false, error }` — errors: `not_authenticated` | `award_not_found` | `already_claimed` | `already_pending` | `reason_too_short`

**RPC: `review_award_claim_request(p_request_id uuid, p_approve boolean, p_reviewer_note text DEFAULT NULL)`**
- SECURITY DEFINER, GRANT to `authenticated` (caller must be `is_admin()`)
- If approve: requires `awards.claim_status = 'unclaimed'`; inserts `award_admins` (`role = owner`, `invited_by = NULL`); sets `awards.claim_status = 'claimed'`; marks request `approved`; writes `entity_audit_logs` row (`action_type = 'award_claimed'`)
- If reject: marks request `rejected`; sets `reviewer_note`
- Both paths: set `reviewed_by`, `reviewed_at`

---

### A.3 — TypeScript types

**File:** `src/features/awards/types/awards.ts`

Add:
```ts
export type AwardClaimStatus = 'unclaimed' | 'claimed' | 'verified';
export type AwardAdminRole = 'owner' | 'editor';

export interface AwardAdminDTO {
  id: string;
  awardId: string;
  userId: string;
  role: AwardAdminRole;
  invitedBy: string | null;
  createdAt: string;
  // Joined:
  profile?: { username: string; avatarUrl: string | null };
}

export interface AwardClaimRequestDTO {
  id: string;
  awardId: string;
  requesterUserId: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewerNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  // Joined:
  award?: { name: string; slug: string };
  requesterProfile?: { username: string; avatarUrl: string | null };
}
```

Extend `AwardDTO`:
```ts
claimStatus: AwardClaimStatus;  // add to existing interface
```

---

### A.4 — API layer

**File:** `src/features/awards/api/awards.ts`

Add functions (use `db` alias, no raw types until `gen-types` re-run):

| Function | Description |
|---|---|
| `getAwardAdmins(awardId)` | SELECT from `award_admins` joined to `profiles` (username, avatar_url); returns `AwardAdminDTO[]` |
| `getMyAwardClaimRequest(awardId)` | SELECT own pending/latest request for this award; returns `AwardClaimRequestDTO \| null` |
| `submitAwardClaimRequest(awardId, reason)` | Calls RPC `submit_award_claim_request`; returns `{ ok, error? }` |
| `isCurrentUserAwardAdmin(awardId)` | Calls `plano_auth_is_award_admin` via RPC or derives from `getAwardAdmins` |

**File:** `src/features/admin/api/awards-admin.ts` (new, or add to existing admin API file)

| Function | Description |
|---|---|
| `getAwardClaimRequests(status?)` | SELECT from `award_claim_requests` joined to `awards` + `profiles`; filtered by status |
| `reviewAwardClaimRequest(requestId, approve, reviewerNote?)` | Calls RPC `review_award_claim_request` |

---

### A.5 — React Query hooks

**File:** `src/features/awards/hooks/useAwards.ts`

Add:
- `useAwardAdmins(awardId)` — `queryKey: ['award-admins', awardId]`, 5-min stale time
- `useMyAwardClaimRequest(awardId)` — `queryKey: ['award-claim-request', awardId, userId]`
- `useSubmitAwardClaimRequest()` — mutation; invalidates `['award-claim-request', awardId]` and `['award', slug]` on success
- `useReviewAwardClaimRequest()` — mutation; admin only; invalidates `['award-claim-requests']` and `['award', slug]`

---

### A.6 — UI: Claim CTA on `AwardPage`

**File:** `src/features/awards/pages/AwardPage.tsx`

In the award header, after the website link:

| `claim_status` | User state | Render |
|---|---|---|
| `unclaimed` | Logged out | Nothing |
| `unclaimed` | Logged in, no pending request | "Claim this award" button → opens `ClaimAwardDialog` |
| `unclaimed` | Logged in, pending request | Muted badge "Claim under review" |
| `claimed` or `verified` | Any | Admin badge showing admin count; "Managed by [admin name]" link if `role = owner` profile is public |

**New file:** `src/features/awards/components/ClaimAwardDialog.tsx`
- Textarea: "Why are you the right person to manage this award?" (min 20 chars)
- Submit calls `useSubmitAwardClaimRequest()`
- Success state: "Your claim request has been submitted. We'll review it and get back to you."
- Error states: `already_claimed`, `already_pending`, network error

Load `claim_status` and user's existing claim request in `AwardPage.loader.ts` (server-side, so SSR renders the correct CTA without a client flash).

---

### A.7 — UI: Award Admin Portal

**New route:** `/award/:slug/admin`

Gate: redirect to `/award/:slug` if `plano_auth_is_award_admin` returns false (check in loader).

**File:** `src/features/awards/pages/AwardAdminPage.tsx`

Tabs:

| Tab | Content |
|---|---|
| **Award Info** | Edit form: name, description, website, country, frequency, awarding body. Save calls `supabase.from('awards').update(...)`. |
| **Editions** | List of editions; "Add edition" opens inline form; click to edit year, date, ceremony location, notes. |
| **Categories** | List with archive toggle; "Add category" inline. |
| **Recipients** | Picker: select edition → list recipients by category with add/edit/remove. Reuses `AddRecipientDialog` from admin. |
| **Suggestions** | Pending `award_recipient_suggestions` for this award. Approve (calls `approve_award_suggestion` RPC) or reject (updates row directly). Shows source URL and submitter. |
| **Team** | List `award_admins` for this award. Phase 2: invite editor by email. |

Add "Manage award" link in the award page header, visible only to award admins.

Add a route to `app/routes.ts`:
```
/award/:slug/admin   →  AwardAdminPage.tsx
```

---

### A.8 — Admin panel: claim queue

**Existing route:** `/admin/awards` — add `claim_status` badge column and a link to pending claims count.

**New route:** `/admin/awards/claims`
**New file:** `src/features/admin/pages/AwardClaimRequests.tsx`

Table columns: Award name (link), Requester (username + avatar), Reason (truncated, expandable), Submitted, Actions (Approve / Reject with optional note).

Approve calls `reviewAwardClaimRequest(id, true)` → success toast → row removed from pending list.
Reject opens a popover for an optional reviewer note, then calls `reviewAwardClaimRequest(id, false, note)`.

Add sidebar link under the Awards group: `{ title: "Claim Requests", url: "/admin/awards/claims" }`.

---

## Definition of done

- [ ] `plano_auth_is_award_admin` function deployed; RLS on all six award tables updated
- [ ] `award_claim_requests` table live; RPCs `submit_award_claim_request` and `review_award_claim_request` callable
- [ ] Award admins can edit award info, editions, categories, and recipients directly
- [ ] Award admins can see and act on community suggestions for their award
- [ ] "Claim this award" CTA renders correctly for all three states (unclaimed, pending, claimed)
- [ ] `/award/:slug/admin` portal is accessible to award owners only; all six tabs functional
- [ ] `/admin/awards/claims` queue renders pending requests; approve/reject works end-to-end
- [ ] `claim_status` visible in `/admin/awards` table

## Out of scope (Phase 2)

- Email-domain verification for self-serve claiming (like `company_claim_verification_tokens`)
- Inviting additional editors to an award (`role = editor`)
- Ghost-admin auto-approval cron job (60-day inactivity → suggestions auto-approve after 30 days)
- `verified` claim status granted by Plano admins
- Dispute flow for contested claims
