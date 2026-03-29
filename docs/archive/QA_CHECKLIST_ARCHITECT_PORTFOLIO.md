# QA Checklist: Architect Portfolio

This checklist is designed to verify the correct functionality, rendering, and responsiveness of the newly implemented "Architect Portfolio" component (`ArchitectPortfolio.tsx`) and its integration on the user Profile page.

## 1. Verified Architect Profile
**Objective:** Verify that the portfolio renders properly when a user is a verified architect.
- [ ] Navigate to a profile of a user who is a **verified architect**.
- [ ] Ensure that the "Portfolio" section is visible on the profile page.
- [ ] Verify that building cards are displayed within the portfolio section.
- [ ] Ensure the correct skeleton loading state is shown initially before data is fetched.
- [ ] Verify the "empty state" displays a friendly "No buildings added to portfolio yet." message if the architect has no associated buildings.

## 2. Standard User Profile (Regression)
**Objective:** Assert that standard users who are NOT verified architects do not see the portfolio component.
- [ ] Navigate to a profile of a **standard user** (not a verified architect).
- [ ] Ensure that the "Portfolio" section is **NOT** visible anywhere on the profile page.
- [ ] Verify that the page layout remains completely unaffected by the hidden component (no unexpected padding, margins, or layout shifts).

## 3. Responsive Grid Layout
**Objective:** Verify the portfolio grid structure responds appropriately to window size changes.
- [ ] Navigate to the profile of a verified architect with multiple buildings (at least 3-4).
- [ ] Start with a wide desktop browser window. Ensure the grid shows **3 or 4 columns** based on the screen width.
- [ ] Slowly resize the window smaller to simulate a **tablet** view. Verify the grid gracefully adjusts to **2 columns**.
- [ ] Resize the window to simulate a **mobile** view (e.g., iPhone size). Verify the grid adjusts to a single **1 column** stack.
- [ ] Ensure cards and their inner content (text, images) do not break, overlap, or cause horizontal scrolling at any size.

## 4. Hover Micro-Interactions
**Objective:** Ensure the individual portfolio building cards respond appropriately to user interactions.
- [ ] Hover your mouse over one of the building cards in the portfolio grid.
- [ ] Verify that the expected micro-interactions occur (e.g., subtle scaling, shadow change, or overlay depending on the exact `SmartBuildingCard` implementation).
- [ ] Click on the building card and verify it navigates successfully to the corresponding Building Details page.