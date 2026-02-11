# Map Pin Visual QA Checklist

## Section 1: Setup

To verify the visual states of the map pins, you will need to find or create specific data conditions. Use the following methods:

1.  **Tier S (Top 1% / Masterpiece):**
    *   **Discovery Mode:** Search for iconic buildings (e.g., "Guggenheim Bilbao", "Fallingwater") which likely have a 'Top 1%' rank.
    *   **Library Mode:** Rate any building as "Masterpiece" (3 stars).

2.  **Tier A (Top 5-10% / Essential):**
    *   **Discovery Mode:** Search for highly popular buildings that are not in the top 1%.
    *   **Library Mode:** Rate any building as "Essential" (2 stars).

3.  **Tier B (Top 20% / Impressive):**
    *   **Discovery Mode:** Search for notable buildings with lower popularity.
    *   **Library Mode:** Rate any building as "Impressive" (1 star).

4.  **Approximate Location:**
    *   This state occurs when a building's location is flagged as approximate in the database.
    *   *Dev Note:* You may need to manually update a building's `location_approximate` flag to `true` in the database to test this.

## Section 2: Visual Checklist

| Tier | Visual Requirement | Notes |
| :--- | :--- | :--- |
| **Tier S** | **Large Lime Pin + Pulse Animation** | Verify the pin is significantly larger (44px), Lime color (`#eeff41`), and has a pulsing "ping" animation on load. |
| **Tier A** | **White Pin + Center Dot** | Verify the pin is White, medium size (36px), and contains a small visible dot in the center. |
| **Tier B** | **Dark Gray Pin** | Verify the pin is Dark Gray (`muted-foreground`), smaller size (28px), and has no center dot. |
| **Approximate** | **Circle Shape** | Verify the marker renders as a simple **Circle** instead of the standard teardrop "Pin" shape. |

## Section 3: Interaction Tests

Perform the following interactions on any pin:

1.  **Hover:**
    *   **Scale:** Verify the pin scales up (approx 1.25x) immediately upon hover.
    *   **Z-Index:** Verify the hovered pin moves to the **top** (Z-Index 999), covering all other adjacent pins.

2.  **Click:**
    *   **Popup:** Verify the building information popup opens.
    *   **Highlight:** Verify the pin remains in its "Hovered" state (scaled up and on top) while the popup is open.
    *   **Navigation (Second Click):** Click the *same* pin again (or the link inside the popup if applicable) to verify it navigates to the building details page.

## Section 4: Edge Cases

1.  **User Rating Override:**
    *   Find a building that is naturally **Tier S** (Top 1%) in Discovery.
    *   Rate this building as **1 Star** ("Impressive").
    *   **Expected Result:** The pin should visually change to **Tier B** (Dark Gray).
    *   *Reasoning:* User ratings (Library context) should take precedence over Global Rank (Discovery context).
