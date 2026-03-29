# QA Checklist: Building DNA Matrix (BuildingAttributes)

This checklist is designed to verify the robustness and responsiveness of the newly implemented "Building DNA Matrix" component (`BuildingAttributes.tsx`) and its integration into the Building Details page.

## 1. Small Device Overflow

**Objective:** Verify the grid layout adapts correctly to narrow screens without breaking the layout.

- [ ] **Simulate Mobile Device:** Open the application in Chrome DevTools and switch to device emulation mode. Select "iPhone SE" (375px width) or a custom responsive width of 320px.
- [ ] **Navigate to Building Details:** Go to a building page that has a rich set of attributes (e.g., Typology, Materials, Style, Context, etc.).
- [ ] **Inspect the Grid:** Verify that the attributes are displayed in a 2-column grid (`grid-cols-2`).
- [ ] **Check for Overflow:** Ensure there is no horizontal scrolling caused by the grid items. The cards should shrink or wrap text appropriately.
- [ ] **Verify Text wrapping:** Ensure long attribute values (e.g., "Post-Modernism") wrap or truncate gracefully within their cards without pushing the layout.

## 2. Empty State Validation

**Objective:** Ensure the component handles missing or empty data gracefully without leaving visual artifacts.

- [ ] **Find/Create Empty Building:** Navigate to or create a building that has **no** optional attributes set (no typology, materials, style, context, intervention, category, year, status). Only the name and required fields should be present.
- [ ] **Verify Visibility:** The "Building DNA" section should be completely hidden.
- [ ] **Check Spacing:** Verify there is no awkward empty whitespace, margins, or padding where the component would usually be.
- [ ] **Partial Data:** Add just *one* attribute (e.g., "Access: Public"). Verify that only this single card is displayed, and the "Show all details" button is **not** visible (since threshold < 4).

## 3. Animation Smoothness

**Objective:** Verify the progressive disclosure interaction is smooth and performant.

- [ ] **Find Rich Building:** Navigate to a building with more than 4 attributes.
- [ ] **Initial State:** Confirm only the first 4 attributes are visible.
- [ ] **Toggle Expansion:** Click "Show all details".
- [ ] **Observe Transition:** Verify the new cards fade/slide in smoothly. The layout should expand vertically without a jarring "jump".
- [ ] **Toggle Collapse:** Click "Show less".
- [ ] **Observe Retraction:** Verify the layout collapses back to the initial state smoothly.
- [ ] **Repeat:** Toggle it a few times to ensuring no jankiness or layout shifts that affect surrounding elements (like the map or footer).
