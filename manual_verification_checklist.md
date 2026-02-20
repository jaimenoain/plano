# Manual Verification Checklist for Hybrid Feed

This checklist covers the manual verification steps for the new hybrid feed features, including the Empty Feed state, Hybrid Feed transition, and Inline Follow interactions.

## 1. Cold Start (Empty Feed)

- [ ] **Pre-requisite:** Create a new user account or log in with a user who follows no one and has no activity.
- [ ] **Verify Empty Feed State:**
  - [ ] Navigate to the home feed (`/`).
  - [ ] Ensure the "Welcome to Plano!" message is displayed.
  - [ ] Verify that suggested posts are displayed below the welcome message.
  - [ ] Verify that the "People you may know" carousel is inserted after the 3rd suggested post.
  - [ ] **Edge Case:** If fewer than 3 suggested posts exist, verify "People you may know" appears at the end or not at all (depending on implementation logic).
- [ ] **Verify Navigation:**
  - [ ] Click on a suggested building image/name. Ensure it navigates to the building details page.
  - [ ] Click on a suggested user avatar/name. Ensure it navigates to the user profile.

## 2. Hybrid Feed Transition

- [ ] **Pre-requisite:** Log in with a user who follows a few people (e.g., 3-5 posts in their social feed).
- [ ] **Verify Social Feed:**
  - [ ] Navigate to the home feed (`/`).
  - [ ] Verify that posts from followed users appear first.
  - [ ] Scroll down to the end of the social posts.
- [ ] **Verify Divider:**
  - [ ] Confirm that the "You're all caught up!" divider appears after the last social post.
  - [ ] Verify the animation of the divider (fade in / slide up).
- [ ] **Verify Suggested Content:**
  - [ ] Continue scrolling past the divider.
  - [ ] Verify that suggested posts (Discovery Feed) start loading and displaying.
  - [ ] **Edge Case:** Scroll rapidly to trigger multiple page loads. Ensure no duplicate posts or crashes.

## 3. Inline Follow Interaction

- [ ] **Pre-requisite:** Find a suggested post in the feed (either in Empty Feed or Hybrid Feed) from a user you do NOT follow.
- [ ] **Verify Follow Button:**
  - [ ] Locate the "Follow" button in the post header (next to the username).
  - [ ] Click the "Follow" button.
- [ ] **Verify Interaction:**
  - [ ] Ensure the button immediately changes state (disappears or changes to "Following") without a page reload.
  - [ ] **Verify Persistence:** Refresh the page. The user's posts should now theoretically appear in your social feed (or at least the button should remain in the "Following" state if visible elsewhere).
  - [ ] **Edge Case:** Quickly click "Follow" and then navigate away. Verify the follow action persisted.

## 4. Error Handling & Edge Cases

- [ ] **Network Error:**
  - [ ] Simulate offline mode (Network tab -> Offline).
  - [ ] Try to load the feed. Verify appropriate error message or retry button is shown.
  - [ ] Try to "Follow" a user while offline. Verify optimistic update reverts or error toast appears.
- [ ] **Empty Suggestions:**
  - [ ] If possible, mock an empty response for suggested posts.
  - [ ] Verify that the feed handles it gracefully (e.g., shows just the "Welcome" message or a "No suggestions" state).

## 5. Layout & Responsiveness

- [ ] **Mobile View:**
  - [ ] Open the app on a mobile device or simulator.
  - [ ] Verify that the "People you may know" carousel is swipeable and fits the screen.
  - [ ] Verify that feed cards (Compact/Hero) render correctly without horizontal overflow.
- [ ] **Desktop View:**
  - [ ] Verify the sidebar is visible and sticky.
  - [ ] Verify the layout of the feed column vs sidebar.
