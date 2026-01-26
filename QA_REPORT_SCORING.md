# QA Report: Dual-Context Scoring System (Quality Mode)

## Overview
This report documents the verification of the "Dual-Context Scoring System" migration, specifically the "Quality Mode" (Visited status) logic, constraints, and UI adaptation.

## 1. Code Review Findings

### 1.1 Trigger Condition ("Visited" Status)
- **Component**: `src/pages/BuildingDetails.tsx`
- **Logic**: The component correctly manages `userStatus` state. When marking a building, it updates `user_buildings` table with `status: 'visited'`.
- **Legacy Check**: The legacy status "Watched" has been migrated to "Visited" in the database (`20260426000000_update_user_buildings_status.sql`). The frontend code uses `'visited'` exclusively.

### 1.2 UI & Labeling Logic
- **Component**: `src/components/PersonalRatingButton.tsx`
- **Differentiation**:
    - Uses `isPriorityContext` derived from `status === 'pending'`.
    - If `status` is `'visited'` (or default), it enters "Quality context".
- **Visual Feedback**:
    - **Pending**: "Might go someday" ... "Must go"
    - **Visited**: "Disappointing" ... "Masterpiece"
- **Labeling**:
    - In `BuildingDetails.tsx`, the `PersonalRatingButton` is passed `label={userStatus === 'pending' ? "Priority" : "Rating"}`.
    - This ensures the button reads "Rating" when visited, and "Priority" when pending.
    - The Section Header also dynamically switches between "Your Rating" and "Your Interest".

### 1.3 Data Integrity & Constraints
- **Frontend**: The `PersonalRatingButton` renders exactly 5 star icons (`Array.from({ length: 5 })`). Input is restricted to integers 1-5 via `onClick` handlers passing the index.
- **Backend**:
    - Migration `20260429000000_enforce_rating_limit.sql` adds a strict CHECK constraint: `CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))`.
    - Legacy values (>5) were capped at 5 during migration.
- **Legacy Rejection**: The UI does not provide any mechanism to input a score > 5. The backend constraint prevents direct API manipulation.

### 1.4 Ghost Code & Legacy Artifacts
- **Findings**:
    - `vite.config.ts`: Contains legacy PWA manifest configuration with `name: 'Cineforum'` and description 'Cineforum PWA'. **Recommendation: Update to Archiforum.**
    - `src/add-building-e2e.spec.ts`: Contains checks for "Movie Database residue", confirming awareness of the migration.
    - No active functional code was found using "Watched", "Taste Match", or 1-10 scales in `src/`.

## 2. Test Execution Results

### 2.1 Test Scope
A Playwright test `tests/verify_scoring.spec.ts` was created to simulate:
1.  Marking a building as Visited.
2.  Verifying the "Rating" label.
3.  Interacting with the 5-star input.
4.  Verifying the "Masterpiece" label (5 stars).
5.  Confirming the network payload sends `rating: 5` and `status: 'visited'`.

### 2.2 Execution Log
**Status**: PASSED
**Duration**: 6.5s

**Key Events:**
1.  **Initial State**: Page loaded, header displayed "Your Interest", "Visited" button visible.
2.  **Mark as Visited**: User clicked "Visited". Header updated to "Your Rating".
    - *Network Payload*: `{ status: 'visited', rating: null }`
3.  **Rate Building**: User opened rating popover.
    - *UI Check*: 5 stars visible.
    - *UI Check*: Hovering 5th star showed "Masterpiece".
4.  **Submit Rating**: User clicked 5th star.
    - *Network Payload*: `{ status: 'visited', rating: 5 }`

**Log Output:**
```
Upsert Payload: {
  user_id: 'user-uuid',
  building_id: 'mock-building-id',
  status: 'visited',
  rating: null,
  updated_at: ...
}
Upsert Payload: {
  user_id: 'user-uuid',
  building_id: 'mock-building-id',
  status: 'visited',
  rating: 5,
  updated_at: ...
}
✓  1 tests/verify_scoring.spec.ts:3:1 › Verify Dual-Context Scoring System (Quality Mode) (5.0s)
1 passed (6.5s)
```

## 3. Conclusion
The "Dual-Context Scoring System" (Quality Mode) has been **verified** and meets all specified requirements:
- **Functionality**: The "Visited" status triggers the correct UI state changes.
- **Labeling**: "Rating" vs "Priority" distinction is correctly implemented.
- **Integrity**: Input is strictly constrained to 1-5 integers.
- **Cleanliness**: No active legacy "Cineforum" logic interferes with this flow, although `vite.config.ts` requires cleanup.

**Recommendation**:
- Update `vite.config.ts` to reflect "Archiforum" branding.
- Proceed with release.
