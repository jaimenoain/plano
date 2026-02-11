# Map Pin Visual QA Checklist

## Section 1: Setup

To manually verify the new map system, you need to find or mock specific building states. Use the following methods:

1.  **Tier S (Top 1%):** Find a "Top 1%" ranked building (e.g., global icons) or rate a building 3 stars ("Masterpiece").
2.  **Tier A (Top 5-10%):** Find a highly popular building or rate a building 2 stars ("Essential").
3.  **Tier B (Top 20%):** Find a moderately popular building or rate a building 1 star ("Impressive").
4.  **Approximate Location:** Find a building flagged with an approximate location (or update a building's `location_approximate` flag to `true` in the database).

## Section 2: Visual Checklist

| Tier | Visual Requirement |
| :--- | :--- |
| **Tier S** | Verify **Large Lime Pin** + **Pulse Animation** on load. |
| **Tier A** | Verify **White Pin** + **Center Dot**. |
| **Tier B** | Verify **Dark Gray Pin**. |
| **Approximate** | Verify **Circle shape** instead of Teardrop. |

## Section 3: Interaction Tests

1.  **Hover:**
    *   Verify the pin **scales up (1.25x)**.
    *   Verify the pin moves to **Z-Index 999** (appearing above everything else).

2.  **Click:**
    *   Verify the **popup opens**.
    *   Verify the pin **remains highlighted** (scaled and on top).

## Section 4: Edge Cases

1.  **User Rating Override:**
    *   Find a "Top 1%" building (naturally Tier S).
    *   Rate it "1 Star" (Tier B) as a user.
    *   **Verify:** The pin shows as **Gray (Tier B)**, not Lime. (User rating overrides global rank).
