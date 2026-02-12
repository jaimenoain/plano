# QA: Smart Clusters Verification

This document outlines the verification steps for the "Smart Clusters" feature, ensuring clusters inherit the color of the highest-priority building inside them.

## 1. Visual Validation Scenarios

### Scenario A: The "Hidden Gem" (Tier 1 Mix)
*   **Setup:** Find an area with many Standard buildings and at least one Tier 1 (Lime) building. Zoom out until they cluster.
*   **Expected Result:**
    *   The cluster bubble must be **Lime (`#eeff41`)**.
    *   It must have **20% opacity** (tinted).
    *   It must have a **Solid Lime border**.
    *   Text must be **Black**.

### Scenario B: The "High Standard" (Tier 2 Mix)
*   **Setup:** Find an area with Standard buildings and at least one Tier 2 (White) building (but NO Tier 1).
*   **Expected Result:**
    *   The cluster bubble must be **White**.
    *   It must have **20% opacity** (tinted).
    *   It must have a **Solid White border**.
    *   Text must be **Black**.

### Scenario C: The Standard Crowd (Tier 3 Only)
*   **Setup:** Find an area with only Standard buildings.
*   **Expected Result:**
    *   The cluster bubble must contain **NO transparency**.
    *   It should look exactly like a "fat" Standard Pin (Solid Light Gray fill, Dark border).

### Scenario D: Transition Fluidity
*   **Action:** Zoom in and out rapidly on a "Lime" cluster.
*   **Check:** Ensure the transition feels cohesive—the "Lime" cluster should visually feel like it "contains" the Lime pin.

## 2. Regression Checklist

### Single Pins
*   Verify that un-clustered single pins still display their correct colors and are not affected by the cluster styling logic.

### Interactions
*   Verify that clicking a "Tinted" cluster still triggers the default zoom-in behavior (ensure the transparent fill captures pointer events).

### Performance
*   Pan around the map to ensure the new `max_tier` calculation expressions aren't causing frame drops.

## 3. Troubleshooting

*   If clusters appear black or invisible, check the `max_tier` property in the Mapbox source data using the console.
