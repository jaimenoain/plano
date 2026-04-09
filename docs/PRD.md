# Plano — Product Requirements Document

**Product:** Plano
**Tagline:** The world's architecture, cataloged.
**Document type:** Product Requirements Document (PRD)
**Last updated:** March 2026

---

## 1. Product Overview

### 1.1 Vision

Plano is the definitive platform for discovering, documenting, and sharing the world's architecture. It gives architecture enthusiasts — from casual admirers to practising professionals — a single place to track every building they visit, rate and review what they see, discover new architecture through maps and social feeds, organise curated collections with smart itineraries, and connect with a global community that shares their passion.

### 1.2 Target Users

| Persona | Description |
|---|---|
| **The Enthusiast** | Travels to see notable buildings, keeps a personal log of visits, rates what they see. Wants a "Letterboxd for architecture." |
| **The Student / Researcher** | Studying architecture; needs a rich, browsable catalogue with taxonomy, styles, and materials data. Values completeness and accuracy. |
| **The Practising Architect** | Wants to claim their professional profile, manage their portfolio on the platform, and post architect statements on their own buildings. |
| **The Curator** | Organises themed collections ("Brutalist Gems of London"), builds multi-day itineraries, and shares them publicly. |
| **The Social Explorer** | Follows friends and architects, discovers buildings through the feed and map, values recommendations and social context. |

### 1.3 Core Value Propositions

1. **Catalogue** — The most comprehensive, community-maintained database of notable architecture worldwide, with rich metadata (taxonomy, access info, construction status, location precision).
2. **Personal library** — A personal record of every building visited, rated, and reviewed, with Kanban and list views for at-a-glance organisation.
3. **Discovery** — An interactive global map with server-side clustering, deep faceted filtering, and popularity-tiered pins that surface the best architecture.
4. **Social** — A follow-based social graph, building recommendations, contact-filtered maps, and a feed that shows what friends are visiting.
5. **Collections & itineraries** — Curated lists of buildings with AI-powered multi-day itinerary generation and route planning.
6. **Architect identity** — Verified architect profiles with portfolio pages, official statements, and privileged editing of their own buildings.

### 1.4 Platform & Architecture

| Layer | Technology |
|---|---|
| Frontend | React 18 SPA, TypeScript, Vite, React Router v6, TanStack Query |
| UI framework | shadcn/ui (Radix UI primitives + Tailwind CSS) |
| Maps | MapLibre GL JS with OpenFreeMap positron tiles; Mapbox Directions API for routing |
| Backend | Supabase (PostgreSQL with PostGIS, Auth, Storage, Edge Functions, Realtime) |
| Email | React Email templates via Supabase Edge Functions |
| Analytics | Google Analytics |
| Deployment | GitHub Actions (edge functions); Vite build for frontend |
| PWA | Service worker, manifest, platform-specific install prompts |

---

## 2. Landing & Onboarding

### 2.1 Landing Page

**Purpose:** Convert visitors into registered users by communicating Plano's core value in seconds.

#### Requirements

**FR-2.1.1 Hero Section**
The landing page shall display a hero section containing:
- A headline: "The world's architecture, cataloged."
- A subheading: "Track visits, rate buildings, and follow friends."
- Animated floating building cards (e.g., The Shard, Fallingwater, Guggenheim) with star ratings, using staggered entrance animations and gentle floating motion loops.
- An integrated search bar (reusing the discovery search input) that accepts city, building, or architect queries and navigates to `/search` on submit.
- A "Trending near you" badge that navigates to `/search` for location-based discovery.

**FR-2.1.2 Feature Grid**
Below the hero, a three-column grid shall present the platform's key features:
- "Log Your Journey" — a miniature visited-building list with checkmarks (Unité d'Habitation, Barbican Centre, Villa Savoye).
- "Curate Lists" — a stacked-card visual showing a collection called "Brutalist Gems" with "12 items" and a user facepile.
- "Follow Architects" — an architect profile card (Le Corbusier) with a follow button and a blurred second row hinting at more.

**FR-2.1.3 Community Marquee**
A horizontally-scrolling animated marquee of user avatars shall appear between the hero and feature grid, conveying community activity and social proof.

### 2.2 Onboarding

**Purpose:** Guide new users through initial profile setup to reduce time-to-first-action.

#### Requirements

**FR-2.2.1 Onboarding Flow**
After account creation, the system shall present a guided onboarding page where the user can set their username, upload an avatar, and configure initial preferences before entering the main app.

---

## 3. Authentication & Account Management

### 3.1 Authentication

#### Requirements

**FR-3.1.1 Email Authentication**
The system shall support email-based sign up, sign in, and password reset via Supabase Auth.

**FR-3.1.2 Password Reset**
The system shall send a password reset email using a branded React Email template. Clicking the link shall navigate to a dedicated password update page.

**FR-3.1.3 Welcome Email**
On successful registration, the system shall send a welcome email via the `send-welcome-email` edge function using the `WelcomeEmail` React Email template.

**FR-3.1.4 Profile Auto-Creation**
A database trigger (`handle_new_user`) shall automatically create a `profiles` row for every new user upon registration.

### 3.2 User Settings

#### Requirements

**FR-3.2.1 Profile Editing**
The settings page shall allow users to edit: username (sanitised), bio (free text), country (dropdown), location (Google Places autocomplete), and avatar (image upload to `avatars` storage bucket).

**FR-3.2.2 Email & Password Change**
Users shall be able to update their email address (with confirmation link sent to the new address) and password from the settings page.

**FR-3.2.3 Favourites Management**
Users shall be able to manage a list of pinned favourite buildings that appear prominently on their profile, via a dedicated management dialog.

**FR-3.2.4 Highlights Management**
Users shall be able to select and manage highlighted reviews or buildings for profile showcase, via a dedicated management dialog.

**FR-3.2.5 Architect Identity Disconnect**
Users with a verified architect identity linked to their profile shall be able to disconnect it via a confirmation dialog.

**FR-3.2.6 Data Export**
Users shall be able to export their personal data (ratings, reviews, buildings visited, bucket list) as a downloadable CSV file.

**FR-3.2.7 PWA Install Prompt**
The settings page shall display an install-to-homescreen prompt when the app is installable as a PWA, with platform-specific instructions for iOS.

**FR-3.2.8 Unsaved Changes Guard**
If the user has unsaved modifications to the settings form, the system shall block navigation and display a confirmation prompt before discarding changes.

---

## 4. Building Catalogue

### 4.1 Building Data Model

#### Requirements

**FR-4.1.1 Core Fields**
Each building record shall contain: `name` (required), `alt_name` (optional alternative name), `aliases[]` (array of additional known names), `year_completed`, `city`, `country`, `address`, `location` (PostGIS geography point), `location_precision` (enum: `exact` | `approximate`).

**FR-4.1.2 Classification Fields**
Each building shall link to: one functional category, zero or more functional typologies (via junction table), and zero or more attributes from the materiality, context, and style groups (via junction table).

**FR-4.1.3 Construction Status**
Each building shall have a `status` field with values: Built, Under Construction, Unbuilt, Lost, Temporary.

**FR-4.1.4 Access Dimensions**
Each building shall have three independent access fields:
- `access_level`: public | private | restricted | commercial
- `access_logistics`: walk-in | booking_required | tour_only | exterior_only
- `access_cost`: free | paid | customers_only
- `access_notes`: free-text field for additional access details

The system shall synthesise these three dimensions into a single human-readable label with a contextual icon (e.g., "Restricted (Booking Required)" with a Ticket icon) for display purposes.

**FR-4.1.5 Identity & SEO**
Each building shall have a unique `slug` (URL-friendly identifier verified via `check_slug_availability` RPC) and an auto-incrementing `short_id`. Clean URLs shall follow the pattern `/building/:id/:slug`.

**FR-4.1.6 Hero Image**
Each building shall support designation of a hero image via `hero_image_id`, with a resolved `hero_image_url`. A `community_preview_url` auto-generated thumbnail shall serve as fallback.

**FR-4.1.7 Popularity & Tier Ranking**
The system shall compute a `popularity_score` for each building based on visit count, rating count, and photo count. Buildings shall be assigned a `tier_rank` (Top 1%, Top 5%, Top 10%, Top 20%, Standard) via a periodic scoring function with enforced tier distribution limits.

**FR-4.1.8 Building credits (people & companies)**
Buildings shall link to one or more credited entities via `building_credits`: each row references either a `people` row or a `companies` row (exactly one), with a role from the credit taxonomy, tier, optional years and notes, and moderation status. The `architect_statement` text field on the building shall be editable by users who are authorized as a verified credited party for that building (claimed person or company steward with a non-hidden credit), in addition to the building creator and admins.

**FR-4.1.9 Soft Delete & Merge**
Buildings shall support soft deletion (`is_deleted` flag) and merge tracking (`merged_into_id` referencing the target building).

### 4.2 Building Detail Page

#### Requirements

**FR-4.2.1 Hero Display**
The building detail page shall display a full-width hero image (or video) with fallback to community preview thumbnail.

**FR-4.2.2 Header**
The header shall show: building name, alt name (if set), city/country, year completed, primary credited people and companies (as navigable links to `/person/:slug` and `/company/:slug`), and a construction status badge.

**FR-4.2.3 Popularity Badge**
If the building has a tier rank above Standard, a popularity badge shall be displayed (e.g., "Top 1%").

**FR-4.2.4 Attributes Display**
The page shall display the building's taxonomy data: functional category, typologies, materials, styles, and context.

**FR-4.2.5 Access Information**
The page shall display a synthesised access badge combining level, logistics, and cost into one label with an appropriate icon, plus any access notes.

**FR-4.2.6 Professional statement**
If an `architect_statement` exists, it shall be displayed in a dedicated section. Users who may edit official building fields per FR-4.3.2 (including verified credited parties via `building_credits`) shall see an edit control for this field.

**FR-4.2.7 Image Gallery**
The page shall display a scrollable gallery of all images associated with the building (user uploads and community images). Each image card shall show its like count. Clicking an image shall open a full-screen detail dialog with prev/next navigation, uploader info, timestamp, and the ability to like the image.

**FR-4.2.8 Image Upload**
Authenticated users shall be able to upload images to a building via drag-and-drop or file picker. Images shall be client-side compressed before upload. Users shall be able to flag an uploaded image as "generated" (AI-rendered).

**FR-4.2.9 Video Support**
Reviews shall support a single video attachment. Video files shall be client-side compressed before upload. A custom video player shall be used for playback.

**FR-4.2.10 Location Map**
An embedded map shall show the building's location with an appropriate pin (standard pin for exact, circle for approximate). The map shall support expand-to-fullscreen toggle and provide a directions link to external map applications. Escape key shall exit fullscreen.

**FR-4.2.11 Nearby Buildings**
A "Nearby" section shall show buildings within geographic proximity via the `find_nearby_buildings` RPC, with image thumbnails and names.

**FR-4.2.12 Social Context**
The page shall display which of the current user's contacts have visited or saved this building, with avatar facepiles.

**FR-4.2.13 Links**
Users shall be able to contribute external links (URL + title) to a building page. Links shall support community voting (likes). The most-voted links shall surface at the top.

**FR-4.2.14 Review Feed**
The page shall display a chronological feed of user reviews for this building, showing user avatar/name, rating, text content, images, like count, and comment count.

### 4.3 Building Creation & Editing

#### Requirements

**FR-4.3.1 Add Building Form**
Authenticated users shall be able to create new building entries via a full form containing all fields defined in FR-4.1.1 through FR-4.1.8 (including credit linkage via the entity picker in FR-4.3.5 where the form collects credits).

**FR-4.3.2 Edit Building**
Building editing shall be available to: the building creator, admin users, or (for official data fields: name, year, city, country, architect statement) users who are a verified credited party for that building via `building_credits` (claimed `people` row or `company_stewards` membership on a credited company, with a non-hidden credit). If such a verified credited party exists, the original creator loses official data editing rights for those fields.

**FR-4.3.3 Location Picker**
The building form shall include a map-based location picker with search functionality for setting geographic coordinates.

**FR-4.3.4 Slug Preview**
The form shall display a live preview of the generated slug and check availability in real-time via the `check_slug_availability` RPC.

**FR-4.3.5 Credit entity picker**
The form shall include a searchable **`CreditEntityPicker`** (or equivalent) for linking existing **people** and **companies** to the building as `building_credits` rows, with role, tier, and optional notes per the credits data model.

### 4.4 Building Administration

#### Requirements

**FR-4.4.1 Building Merge**
All authenticated users shall be able to merge duplicate building entries via a side-by-side comparison view. Merging shall transfer all reviews, images, links, and collection references from the source building to the target building, then set `merged_into_id` on the source.

**FR-4.4.2 Building Audit**
Admin users shall be able to view a complete change history for any building via `admin_audit_logs`, with the ability to revert changes.

**FR-4.4.3 Soft Delete**
Admin users shall be able to soft-delete buildings by setting `is_deleted = true`. Soft-deleted buildings shall be excluded from search, map, and feed results.

---

## 5. Taxonomy & Classification System

### 5.1 Functional Classification

#### Requirements

**FR-5.1.1 Category–Typology Hierarchy**
The system shall maintain a two-level classification hierarchy:
- **Functional categories:** top-level building functions (e.g., Residential, Cultural, Commercial, Industrial, Institutional, Infrastructure, Religious).
- **Functional typologies:** sub-types within a category (e.g., Museum, Gallery, Theatre under Cultural). Buildings link to typologies via a many-to-many junction table.

### 5.2 Attribute System

#### Requirements

**FR-5.2.1 Attribute Groups**
The system shall maintain three attribute groups, each containing multiple selectable attributes:
- **Materiality:** construction materials (e.g., Concrete, Glass, Steel, Wood, Brick, Stone).
- **Context:** urban/environmental setting (e.g., Urban, Suburban, Rural, Waterfront, Mountainous).
- **Style:** architectural movement or aesthetic (e.g., Brutalism, Modernism, Art Deco, Gothic, Deconstructivism, High-Tech).

Buildings link to attributes via a many-to-many junction table.

**FR-5.2.2 Taxonomy Data Loading**
A shared `useTaxonomy` hook shall load all categories, typologies, attribute groups, and attributes with a 1-hour stale time. It shall expose pre-filtered arrays for materiality, context, and style attributes for convenience.

**FR-5.2.3 Usage in Filters**
All taxonomy dimensions shall be available as filter options in the map filter drawer and search filters.

---

## 6. Personal Library

### 6.1 Status Tracking

#### Requirements

**FR-6.1.1 Building Status**
Each user shall be able to set a personal status on any building:
- `visited` — the user has been to this building.
- `pending` — the building is on the user's bucket list.
- `ignored` — the building is hidden from the user's library and filtered out of map results.
- `null` — no relationship (default).

### 6.2 Rating System

#### Requirements

**FR-6.2.1 Three-Point Rating Scale**
Users shall rate buildings on a 1–3 scale:
- 1 = Impressive
- 2 = Essential
- 3 = Masterpiece

Rating a building ≥ 2 shall display a feedback toast: "You just boosted this building's rank!" Ratings contribute to the building's `popularity_score`.

**FR-6.2.2 Rating from Multiple Surfaces**
Users shall be able to rate buildings from: the building detail page, the recommend dialog, and inline on profile/feed cards.

### 6.3 Personal Review Data

#### Requirements

**FR-6.3.1 Review Fields**
Each user–building relationship shall support: `content` (free-text review), `tags[]` (deprecated, retained for legacy data), `video_url` (video attachment), `visited_at` (optional visit date), and `visibility` (review visibility control).

### 6.4 Collection Assignment

#### Requirements

**FR-6.4.1 Assign to Collections**
From the building detail page, users shall be able to assign the building to one or more of their personal collections via a collection selector overlay, without leaving the page.

---

## 7. Reviews & Media

### 7.1 Review Writing

#### Requirements

**FR-7.1.1 Write Review Page**
The system shall provide a full-page review writing form with: text content area, 1–3 rating selector, multi-image upload, single video upload, and tags input.

**FR-7.1.2 Review Detail Page**
Each review shall have a dedicated permalink page (`/review/:id`) displaying the full review content, all images, comments, and likes.

**FR-7.1.3 Inline Editing**
Users shall be able to edit their review text and rating directly from their profile view without navigating to a separate page.

### 7.2 Review Media

#### Requirements

**FR-7.2.1 Image Uploads**
Users shall be able to upload multiple images per review. Images shall be client-side compressed before upload. Users shall be able to mark individual images as "generated" (AI-rendered) via a flag.

**FR-7.2.2 Image Likes**
Each review image shall support individual likes. The image detail dialog shall display the current like count and the user's liked/not-liked state.

**FR-7.2.3 Image Comments**
Users shall be able to post threaded comments on individual review images.

**FR-7.2.4 Video**
Each review shall support a single video attachment. Videos shall be client-side compressed before upload. Playback shall use a custom video player component.

### 7.3 Review Links

#### Requirements

**FR-7.3.1 External Links**
Users shall be able to attach external URLs with titles to building pages as supplementary resources (articles, videos, guides).

**FR-7.3.2 Link Voting**
Users shall be able to upvote links. Links shall be displayed in descending order of votes on the building detail page.

---

## 8. Map & Geospatial Features

### 8.1 Map Engine

#### Requirements

**FR-8.1.1 Base Map**
The map shall render using MapLibre GL JS with OpenFreeMap positron tiles as the default style. An optional Esri satellite layer shall be available.

**FR-8.1.2 URL State Persistence**
Map center (lat/lng), zoom level, mode, and all active filters shall be serialised to URL query parameters, enabling shareable map views.

**FR-8.1.3 Local State Persistence**
The last map position shall be saved to localStorage for session continuity when returning to the map.

**FR-8.1.4 Error Boundary**
The map shall be wrapped in an error boundary that catches rendering failures and displays a graceful recovery UI.

### 8.2 Map Modes

#### Requirements

**FR-8.2.1 Discover Mode**
In discover mode, the map shall display all buildings globally, subject to active filters. This is the default mode.

**FR-8.2.2 Library Mode**
In library mode, the map shall display only buildings in the current user's personal library (status = visited or pending).

**FR-8.2.3 Mode Switching**
Switching modes shall reset status and hide filters to sensible defaults for the target mode.

### 8.3 Server-Side Clustering

#### Requirements

**FR-8.3.1 Cluster RPC**
The map shall fetch data via the `get_map_clusters_v2` RPC, which returns either cluster points (aggregated by geographic proximity) or individual building points depending on the viewport bounds and zoom level.

**FR-8.3.2 Cluster Display**
Cluster markers shall display the count of buildings they contain. Their size and colour shall reflect the highest-tier building within the cluster (`max_tier`).

**FR-8.3.3 Cluster Expansion**
Clicking a cluster marker shall zoom the map to that cluster's expansion zoom level, revealing the individual buildings or sub-clusters within.

### 8.4 Pin Styling

#### Requirements

**FR-8.4.1 Tier-Based Styling**
Building pins shall be visually differentiated by tier rank with distinct colours and sizes for Top 1% through Standard.

**FR-8.4.2 Library Mode Styling**
In library mode, pin colour shall reflect the user's personal rating of the building instead of global tier.

**FR-8.4.3 Approximate Location**
Buildings with `location_precision = approximate` shall use a circle shape instead of a standard pin to communicate uncertainty.

**FR-8.4.4 Collection Categorisation**
When viewing a collection on the map, pin colours may reflect custom categorisation colours defined by the collection owner.

### 8.5 Map Filters

#### Requirements

**FR-8.5.1 Filter Drawer**
The map shall include a slide-out filter drawer (accordion-style) containing all filter categories. All filters shall be passed server-side to the clustering RPC.

**FR-8.5.2 Filter Categories**
The following filter categories shall be available:

| Filter | Description |
|---|---|
| Taxonomy | Category, typologies, materials, styles, contexts, attributes, credited people & companies |
| Construction status | Built, Under Construction, Unbuilt, Lost, Temporary |
| Global rating | Minimum Michelin-style rating (0–3) |
| Personal rating | Minimum personal rating |
| Contact rating | Minimum rating by contacts |
| Contacts | Filter to buildings rated by specific contacts |
| Collections | Filter to buildings in specific collections |
| Folders | Filter to buildings in specific folders |
| Access | Access level, logistics, and cost filters |
| Hide toggles | Hide visited, hide saved, hide hidden, hide without images |
| Quality | Global quality/tier threshold |

### 8.6 Building Sidebar

#### Requirements

**FR-8.6.1 Sidebar List**
A scrollable sidebar shall display a list of buildings visible in the current map viewport, showing each building's name, image, primary credited entities (people/companies), and tier badge, with sorting options.

### 8.7 Collection Map

#### Requirements

**FR-8.7.1 Collection Map View**
Collections shall have a dedicated map view displaying all buildings and markers in the collection, with itinerary route overlays and the standard filter/sidebar functionality.

---

## 9. Search & Discovery

### 9.1 Multi-Entity Search

#### Requirements

**FR-9.1.1 Omni Search Bar**
The search page shall provide a unified search input that accepts queries across buildings, people, companies, and users. The search bar shall support location-aware queries via Google Places integration.

**FR-9.1.2 Building Search**
Building search shall use the `search_buildings` RPC supporting full-text and fuzzy matching against building name, alt name, aliases, city, country, and names of credited people and companies (via `building_credits`).

**FR-9.1.3 People & company search**
Users shall be able to search for **people** and **companies** by name via `searchPeople` and `searchCompanies` (see `docs/DATA_CONTRACT.md`), not a removed `architects` catalog table.

**FR-9.1.4 User Search**
Users shall be able to search for other users by username.

**FR-9.1.5 Mode Toggle**
The search page shall include a mode toggle to switch result display between buildings, people, companies, and users.

### 9.2 Search Filters

#### Requirements

**FR-9.2.1 Filter Criteria**
Building search shall support filtering by: category, typologies, attributes (materials, styles, contexts), credited people and companies (including map URL filters for credit company and roles where implemented), collections, folders, personal minimum rating, access dimensions (level, logistics, cost), and construction status.

### 9.3 Building Leaderboard

#### Requirements

**FR-9.3.1 Leaderboard**
The system shall provide a building leaderboard ranking buildings by popularity score / tier, accessible via a leaderboard dialog. Data shall be fetched via the `get_building_leaderboards` RPC.

### 9.4 Discovery Cards

#### Requirements

**FR-9.4.1 Building Cards**
Search and discovery results shall display rich building cards showing: image, name, primary credited people/companies, city/country, year completed, tier badge, user's personal rating (if any), and social context (friends who visited).

### 9.5 Search Nudges

#### Requirements

**FR-9.5.1 Cross-Entity Nudges**
When building search results are sparse, the system shall display contextual nudges suggesting the user try searching for people, companies, or users instead.

---

## 10. Feed System

### 10.1 Feed Types

#### Requirements

**FR-10.1.1 Home Feed**
The home feed (index page) shall display reviews from the user's contacts plus their own reviews, in reverse chronological order, via the `get_feed` RPC.

**FR-10.1.2 Discovery Feed**
The Explore page shall display a location-filterable feed of community activity (reviews from all users) via the `get_discovery_feed` RPC.

**FR-10.1.3 Suggested Content**
The system shall algorithmically surface content from non-contacts via the `get_suggested_posts` RPC and display it as inline suggestion blocks within the home feed.

In addition to review-based cards, the home feed surfaces non-review activity from the people the user follows (for example, visited and bucket-list status changes on buildings with no review body) and public collection updates from those accounts, using dedicated card types (`FeedActivityCard` and `FeedCollectionCard`) interleaved with the existing review cards.

### 10.2 Feed Aggregation

#### Requirements

**FR-10.2.1 Card Types**
The feed aggregation engine shall process reviews into three display types:
- **Hero card:** Reviews with images or video; displayed prominently with full media.
- **Compact card:** Text-only reviews without media; displayed in a compact layout.
- **Cluster card:** Multiple reviews by the same user within a time window (optionally in the same city) shall be collapsed into a single card showing the count and representative data.

### 10.3 Feed UX

#### Requirements

**FR-10.3.1 All Caught Up**
The feed shall display a visual divider when the user has scrolled past all new content since their last visit.

**FR-10.3.2 Suggested Content Blocks**
Inline content blocks shall be interspersed in the feed promoting discovery of new buildings, users, or the Explore feature.

**FR-10.3.3 People You May Know**
The feed shall include inline social suggestions showing users the current user might want to follow.

**FR-10.3.4 Contact Facepile**
Feed items shall display an avatar row showing which of the user's contacts have interacted with the reviewed building.

**FR-10.3.5 Infinite Scroll**
The feed shall use intersection-observer–based pagination to load additional content as the user scrolls.

### 10.4 Discovery Feed (Explore)

#### Requirements

**FR-10.4.1 Location Filter**
The Explore page shall allow users to filter the discovery feed by city, country, or region via a Google Places autocomplete drawer.

**FR-10.4.2 First-Time Tutorial**
On first visit to the Explore page, a tutorial overlay shall explain how the discovery feed works. The tutorial shall be dismissable and not shown again (tracked via localStorage).

**FR-10.4.3 Discovery Cards**
The discovery feed shall display building-centric cards with image, architectural metadata, and social context.

---

## 11. Social & Networking

### 11.1 Follow System

#### Requirements

**FR-11.1.1 Follow / Unfollow**
Users shall be able to follow and unfollow other users. Following a user causes their reviews to appear in the follower's home feed.

**FR-11.1.2 Mutual Followers**
Profile pages shall display a facepile of mutual followers (users both the viewer and the profile owner follow).

**FR-11.1.3 Close Friends**
Users shall be able to designate specific followed users as "close friends" for a tighter social circle.

### 11.2 People Discovery

#### Requirements

**FR-11.2.1 People You May Know**
The Connect page shall display algorithm-driven user suggestions based on mutual follows and taste overlap, via the `get_people_you_may_know` RPC.

**FR-11.2.2 Your Contacts**
The Connect page shall display a list of the user's currently followed users with their activity status.

**FR-11.2.3 Inviter Facepile**
When a user arrives via a referral link (`?invited_by=username`), the system shall display a facepile of who invited them via the `get_inviter_facepile` RPC.

### 11.3 Building Recommendations

#### Requirements

**FR-11.3.1 Recommend Building**
Users shall be able to send a building recommendation to one or more friends via a dialog. The dialog shall include inline rating capability for the sender.

**FR-11.3.2 Visit-With Invite**
Users shall be able to invite friends to visit a building together. This creates a recommendation with `visit_with` status and triggers a `visit_request` notification.

**FR-11.3.3 Share Link**
The recommend dialog shall provide a "copy link" action that generates a shareable URL with an `?invited_by=username` tracking parameter.

### 11.4 Safety & Moderation

#### Requirements

**FR-11.4.1 Block User**
Users shall be able to block other users, preventing the blocked user from seeing the blocker's profile and reviews.

**FR-11.4.2 Report User**
Users shall be able to report problematic users or content for admin review.

### 11.5 Social Context

#### Requirements

**FR-11.5.1 Profile Comparison**
Users shall be able to view a taste-overlap comparison between themselves and another user.

**FR-11.5.2 Mutual Affinity**
The system shall compute and display a combined affinity score between users based on shared building ratings.

---

## 12. User Profile

### 12.1 Profile Display

#### Requirements

**FR-12.1.1 Profile Page**
Each user shall have a public profile page displaying: username, avatar, bio, location, stats (buildings visited, reviews written, etc.), and their building library.

**FR-12.1.2 Kanban View**
The profile shall support a Kanban (board) view of the user's building library with drag-and-drop cards organised by status columns (Visited, Want to Visit, etc.).

**FR-12.1.3 List View**
The profile shall support a sortable list view of the user's building library.

**FR-12.1.4 Favourites Section**
The profile shall display the user's pinned favourite buildings prominently (configurable via Settings).

**FR-12.1.5 Highlights**
The profile shall display user-selected highlighted reviews or buildings as a showcase section (configurable via Settings).

**FR-12.1.6 Status Badges**
Building cards on the profile shall display visual status badges (visited, pending).

**FR-12.1.7 Photo Gallery**
Each user shall have a dedicated photo gallery page (`/profile/:username/photos`) showing all images they have uploaded across all reviews.

### 12.2 Collections Grid

#### Requirements

**FR-12.2.1 Collections Display**
The profile shall display a grid of the user's collections with preview images, item counts, and public/private visibility indicators.

### 12.3 User Card

#### Requirements

**FR-12.3.1 Compact User Card**
A compact user card component shall be used throughout the app (search results, social contexts) displaying avatar, username, and key stats.

---

## 13. Collections & Itineraries

### 13.1 Collection Model

#### Requirements

**FR-13.1.1 Collection Fields**
Each collection shall have: `name`, `description`, `slug` (SEO-friendly URL), `is_public` (visibility toggle), `external_link` (optional URL for related content), and `show_community_images` (toggle to include community-uploaded images).

**FR-13.1.2 Categorisation Methods**
Collections shall support five categorisation methods for organising items:
- `default` — no grouping.
- `custom` — user-defined categories with `{id, label, color}` objects.
- `status` — grouped by building status.
- `rating_member` — grouped by ratings from selected members.
- `uniform` — all items treated equally.

### 13.2 Collection Management

#### Requirements

**FR-13.2.1 Create Collection**
Users shall be able to create collections via a dialog specifying name, description, and visibility.

**FR-13.2.2 Manage Collection**
Collection owners shall be able to edit settings, categorisation method, and custom categories.

**FR-13.2.3 Add Buildings**
Users shall be able to add buildings to a collection via a multi-select dialog with building search.

**FR-13.2.4 Collection Items**
Each item in a collection shall support: an optional note, custom category assignment, and a hidden flag.

**FR-13.2.5 Collection Contributors**
Collection owners shall be able to invite other users as editors (contributors) with permission to add/remove items.

**FR-13.2.6 Favourite Collections**
Users shall be able to favourite other users' public collections for quick access.

**FR-13.2.7 Building Detail Panel**
Clicking a building within a collection view shall open a side panel showing building details within the collection context.

### 13.3 Collection Markers (Non-Building POIs)

#### Requirements

**FR-13.3.1 Marker Categories**
Users shall be able to add non-building points of interest to collections with the following categories: accommodation, dining, transport, attraction, other.

**FR-13.3.2 Marker Fields**
Each marker shall have: `name`, `google_place_id` (optional), `lat/lng`, `address`, `notes`, `website`.

### 13.4 Itinerary System

#### Requirements

**FR-13.4.1 AI Itinerary Generation**
Users shall be able to generate a multi-day itinerary from a collection. The system shall:
1. Accept the number of days and a transport mode (walking, driving, cycling).
2. Use k-means clustering to group the collection's buildings into day clusters.
3. Generate optimised routes per day via the Mapbox Directions API.
4. Save the resulting itinerary to the collection record.

**FR-13.4.2 Route Planning Dialog**
Before generation, a dialog shall allow users to set the number of days and preferred transport mode.

**FR-13.4.3 Generation Overlay**
During itinerary computation, a loading overlay shall be displayed.

**FR-13.4.4 Itinerary List**
The generated itinerary shall be displayed as an ordered, sortable list of stops per day, with transit details between stops.

**FR-13.4.5 Route Visualisation**
Generated routes shall be rendered as GeoJSON line overlays on the collection map.

**FR-13.4.6 Multi-Day Structure**
Each day in an itinerary shall have: day number, title (optional), description (optional), ordered stops, default transport mode, and route geometry.

**FR-13.4.7 Transit Between Stops**
Each stop shall support per-stop transit configuration: transport mode, custom instructions, and estimated minutes.

### 13.5 Collection Map View

#### Requirements

**FR-13.5.1 Map Display**
Collections shall have a map view displaying all buildings and markers with itinerary route overlays, filter drawer, and building sidebar.

---

## 14. Folders

#### Requirements

**FR-14.1 Folder Model**
Folders shall have: `name`, `slug`, `description`, `is_public`, `owner_id`. Folders contain references to collections via a junction table.

**FR-14.2 Folder Management**
Users shall be able to create, rename, and delete folders, and add/remove collections from them.

**FR-14.3 Folder Card**
Folders shall be displayed as preview cards showing name, item count, and preview images from contained collections.

**FR-14.4 Folder View**
Each folder shall have a dedicated page (`/:username/folders/:slug`) displaying its contained collections.

**FR-14.5 Filter Integration**
Folders shall be available as a filter criterion in the map filter drawer and search filters, filtering to buildings contained in any collection within the folder.

---

## 15. Professional entities (people, companies & credits)

### 15.1 Public profiles & catalog

#### Requirements

**FR-15.1.1 People and companies**
Individual practitioners shall be stored in **`people`**; practices and studios in **`companies`**. Buildings shall link to them only through **`building_credits`** (role taxonomy, tier, status, optional years and notes) as specified in FR-4.1.8.

**FR-15.1.2 Public detail pages**
Each person shall have a public page at **`/person/:slug`** and each company at **`/company/:slug`**, showing credits (with building summaries), claim state, and entity metadata.

**FR-15.1.3 Portfolios**
Claimed individuals shall use **`/portfolio`** (person portfolio). Company stewards shall use **`/company-portfolio`**. Both surfaces shall be driven by **`building_credits`** for the claimed person or stewarded companies.

**FR-15.1.4 Edit entity profile**
Admins, the claimed person (for **`people`**), or company stewards (for **`companies`**, per RLS) shall be able to edit entity fields (bio, imagery, slug-governed URLs, etc.) within policy limits.

### 15.2 Claims, verification & legacy queue

#### Requirements

**FR-15.2.1 Claim flows**
Unclaimed **`people`** shall be claimable via **`ClaimPersonDialog`** (self / representative). Unclaimed **`companies`** shall use the work-email verification flow (Edge Function + redemption RPC). Steward access requests and company claim disputes shall follow the flows documented in the data contract (§9b).

**FR-15.2.2 Claim status (legacy + current)**
The system shall expose **`get_architect_claim_status`** for the residual admin queue table **`architect_claims`**. Person and company claim state shall be reflected on **`people`** / **`companies`** and related RPCs (`claim_person`, `redeem_company_claim_token`, etc.).

**FR-15.2.3 Admin actions**
Admins shall review historical rows in **`architect_claims`** via **`handle_architect_claim_approval`**. Person/company directory management, merges, and company claim disputes shall use the admin credits surfaces (`EntityClaims`, **`AdminPeople`**, **`AdminCompanies`**) as implemented.

**FR-15.2.4 Verified badge**
Where **`claim_status`** (or equivalent) is **`verified`**, the UI shall show a **`BadgeCheck`** (or equivalent) on the entity profile and other surfaces defined in the design system.

**FR-15.2.5 Dashboards and redirects**
**`/architect/dashboard`** shall redirect to **`/portfolio`**. **`/architect/:uuid`** shall **301** to **`/person/:slug`** or **`/company/:slug`** when a catalog row exists with that UUID (legacy URL compatibility).

**FR-15.2.6 Profile linkage**
**`people.claimed_by_user_id`** and **`company_stewards`** shall be the authoritative links from users to entities. **`profiles.verified_architect_id`** may remain as an optional legacy column without a catalog foreign key; **`sync_verified_architect_id`** may still run for historical consistency.

**FR-15.2.7 Official data privileges**
Users who are a verified credited party for a building via **`building_credits`** (per FR-4.3.2) shall be able to edit the same official building fields as specified there (name, year, city, country, architect statement).

---

## 16. Notifications

### 16.1 Notification Types

#### Requirements

**FR-16.1.1 Supported Types**
The system shall support the following notification types:

| Category | Type | Trigger |
|---|---|---|
| Social | `follow` | Another user follows the recipient. |
| Social | `friend_joined` | A friend joins Plano. |
| Social | `suggest_follow` | System suggests a user to follow. |
| Social | `recommendation` | Someone recommends a building to the recipient. |
| Engagement | `like` | Someone likes the recipient's review. |
| Engagement | `comment` | Someone comments on the recipient's review. |
| Special | `visit_request` | Someone invites the recipient to visit a building together. |

### 16.2 Notification Settings

#### Requirements

**FR-16.2.1 Per-Type Toggle**
Users shall be able to enable or disable each notification type individually via toggle switches in a notification settings dialog.

**FR-16.2.2 Preference Storage**
Notification preferences shall be stored as a JSON object on the `profiles.notification_preferences` field. Missing keys shall default to enabled. The notification trigger shall check for explicit `false` values to suppress delivery.

**FR-16.2.3 Notification Page**
A dedicated notifications page (`/notifications`) shall display all received notifications in reverse chronological order.

---

## 17. Admin Panel

### 17.1 Access Control

#### Requirements

**FR-17.1.1 Admin Guard**
All admin routes (`/admin/*`) shall be protected by an `AdminGuard` that verifies the user's role is `admin` or `app_admin`. Unauthorised users shall be redirected to `/admin/unauthorized`.

### 17.2 Dashboard

#### Requirements

**FR-17.2.1 Dashboard Zones**
The admin dashboard shall display the following analytics zones:

| Zone | Metrics |
|---|---|
| Pulse | Total users, new users (24h/30d), active users (24h/30d), network density, total buildings, total reviews, total photos, pending reports. |
| Activity Trends | Daily actions (logs, comments, likes, votes, follows), daily logins, DAU by feature (logs, comments, likes, votes, visitors). |
| Content Intelligence | Trending buildings by visit count. |
| User Leaderboard | Top users ranked by: reviews, ratings, likes, comments, votes, recently online, follows given, followers gained. |
| Retention Analysis | User activity distribution (active 30d / active 90d / inactive), days-since-active breakdown, recent user list. |
| Notification Intelligence | Total notifications, read rate, active users never reading %, active ignoring %, unread distribution buckets. |
| Photo Heatmap | Geographic heatmap of photo upload density via `get_photo_heatmap_data` RPC. |

**FR-17.2.2 Split RPCs**
Dashboard data shall be fetched via separate RPCs for performance: `get_admin_pulse`, `get_admin_trends`, `get_admin_leaderboards`, `get_admin_content_stats`, `get_admin_retention`, `get_admin_notifications`.

### 17.3 Content Management

#### Requirements

**FR-17.3.1 Building Management**
Admins shall be able to browse, search, filter, edit, and soft-delete buildings.

**FR-17.3.2 Building Audit**
Admins shall be able to view the full change history for any building via audit logs, with revert capability.

**FR-17.3.3 Building Merge**
Admins shall have access to a side-by-side merge comparison view for deduplicating buildings.

**FR-17.3.4 User Management**
Admins shall be able to browse users, view activity, and assign roles.

**FR-17.3.5 Moderation**
Admins shall be able to review user reports, take action on blocks, and moderate content.

**FR-17.3.6 Image Wall**
Admins shall have access to a grid view of all uploaded images for visual content moderation.

**FR-17.3.7 Photo Analytics**
Admins shall be able to view photo upload trends and geographic distribution.

**FR-17.3.8 Storage Jobs**
Admins shall be able to monitor and manage background storage cleanup tasks.

**FR-17.3.9 Architect Claims**
Admins shall be able to review, approve, and reject architect verification claims.

**FR-17.3.10 No-Photos Map**
Admins shall have access to a map overlay highlighting buildings that have no uploaded photos.

---

## 18. Infrastructure & Platform

### 18.1 Edge Functions

#### Requirements

**FR-18.1.1 Route Calculation**
The `calculate-route` edge function shall accept an array of coordinates and a transport mode (walking, driving, cycling) and return an optimised route via the Mapbox Directions API v5.

**FR-18.1.2 Itinerary Generation**
The `generate-itinerary` edge function shall accept a collection ID, number of days, and transport mode. It shall authenticate the user, verify collection ownership/contributor access, fetch collection buildings, apply k-means clustering, generate routes per cluster, and save the itinerary to the collection.

**FR-18.1.3 Upload URL Generation**
The `generate-upload-url` edge function shall generate presigned upload URLs with manual JWT verification (`verify_jwt = false` pattern).

**FR-18.1.4 File Deletion**
The `delete-file` and `delete-storage-recursive` edge functions shall handle individual file and recursive directory deletion from Supabase Storage.

**FR-18.1.5 URL Metadata**
The `fetch-url-metadata` edge function shall fetch OpenGraph and meta tag data from a given URL for link preview display.

**FR-18.1.6 Welcome Email**
The `send-welcome-email` edge function shall send a branded welcome email using the React Email template.

### 18.2 Security

#### Requirements

**NFR-18.2.1 Row Level Security**
All database tables shall have Row Level Security (RLS) policies enforcing data access rules at the database level.

**NFR-18.2.2 Edge Function Auth**
Edge functions handling storage operations shall use manual JWT verification (`verify_jwt = false` + explicit `getUser()` call) rather than relying on the default auth middleware.

**NFR-18.2.3 Input Sanitisation**
User-provided inputs (especially usernames) shall be sanitised via a shared security utility before storage.

**NFR-18.2.4 Route-Level Protection**
Admin routes shall be protected by a client-side guard component that checks user role before rendering.

**NFR-18.2.5 Privacy Rules**
Strict privacy policies shall control data visibility across users, enforced at the database level.

### 18.3 PWA Support

#### Requirements

**NFR-18.3.1 Progressive Web App**
The application shall be installable as a Progressive Web App with: service worker for offline capabilities, web app manifest, app icons (Android Chrome 192×192 / 512×512, Apple Touch), and platform-specific install prompts (with iOS-specific guidance).

### 18.4 Observability

#### Requirements

**NFR-18.4.1 Login Tracking**
The system shall record user login events for analytics purposes.

**NFR-18.4.2 Presence Tracking**
The system shall track the active/online status of authenticated users.

**NFR-18.4.3 Error Diagnostics**
A global error handler shall catch uncaught errors and unhandled promise rejections, logging them via `logDiagnosticError` for debugging.

**NFR-18.4.4 Google Analytics**
Page-level analytics shall be tracked via Google Analytics.

### 18.5 SEO

#### Requirements

**NFR-18.5.1 Clean URLs**
Building pages shall use clean URLs with slugs (`/building/:id/:slug`).

**NFR-18.5.2 Meta Tags**
Dynamic meta tags (title, description, Open Graph) shall be set per page via a `MetaHead` component.

**NFR-18.5.3 Robots**
A `robots.txt` file shall be served from the public directory.

### 18.6 Performance

#### Requirements

**NFR-18.6.1 Code Splitting**
Routes shall be lazily loaded with automatic retry on chunk load failure.

**NFR-18.6.2 Query Caching**
TanStack Query shall be configured with a 5-minute stale time and no refetch on window focus or reconnect.

**NFR-18.6.3 Image Compression**
Images shall be client-side compressed before upload to reduce bandwidth and storage costs.

**NFR-18.6.4 Video Compression**
Videos shall be client-side compressed before upload via a dedicated compression service.

**NFR-18.6.5 Infinite Scroll**
Feed and list views shall use intersection-observer–driven infinite scroll for progressive data loading.

**NFR-18.6.6 Server-Side Clustering**
Map clustering shall be computed server-side to minimise data transferred to the client.

---

## 19. Database RPC Inventory

The following remote procedure calls (RPCs) shall be implemented as PostgreSQL functions accessible via the Supabase client:

| Domain | Function | Purpose |
|---|---|---|
| Map | `get_map_clusters` | Legacy map clustering. |
| Map | `get_map_clusters_v2` | Current map clustering with full filter support. |
| Map | `get_map_pins` | Individual map pin data. |
| Map | `get_buildings_list` | Paginated building list for sidebar. |
| Map | `find_nearby_buildings` | Geographic proximity search. |
| Search | `search_buildings` | Full-text + fuzzy building search with filters. |
| Search | `get_discovery_filters` | Available filter options for current dataset. |
| Feed | `get_feed` | Home feed (contacts + self). |
| Feed | `get_discovery_feed` | Explore page feed with location filters. |
| Feed | `get_suggested_posts` | Algorithmically suggested content. |
| Buildings | `calculate_building_score` | Compute popularity score. |
| Buildings | `update_building_tiers` | Assign tier ranks based on score distribution. |
| Buildings | `check_slug_availability` | Verify slug uniqueness. |
| Buildings | `merge_buildings` | Merge duplicate building records. |
| Collections | `get_collection_stats` | Collection analytics. |
| Collections | `get_collection_buildings` | Buildings in a collection with coordinates. |
| Collections | `get_collections_feed` | Paginated public collections from accounts the user follows (home feed). |
| Social | `get_people_you_may_know` | User suggestions algorithm. |
| Social | `get_inviter_facepile` | Referral attribution display. |
| Admin | `get_admin_pulse` | Dashboard pulse metrics. |
| Admin | `get_admin_trends` | Activity trend data. |
| Admin | `get_admin_leaderboards` | User leaderboard data. |
| Admin | `get_admin_content_stats` | Content analytics. |
| Admin | `get_admin_retention` | Retention analysis data. |
| Admin | `get_admin_notifications` | Notification analytics. |
| Admin | `get_photo_heatmap_data` | Photo geographic density. |
| People & claims | `get_architect_claim_status` | Legacy-named RPC: claim review status on `architect_claims`. |
| People & credits | `is_verified_architect_for_building` | Legacy-named RPC: whether the caller may edit official building fields via `building_credits` + claimed `people` / `company_stewards`. |
| People & claims | `handle_architect_claim_approval` | Legacy-named RPC: process claim approval. |
| Profiles | `sync_verified_architect_id` | Legacy-named RPC: sync profile column ↔ historical claim linkage (no `architects` catalog table). |
| Leaderboards | `get_building_leaderboards` | Ranked building lists. |
| Maintenance | `fix_orphaned_user_buildings` | Data integrity repair. |
| Maintenance | `handle_new_user` | Auto-create profile on signup. |
| Audit | `log_building_changes` | Record building edit history. |
| Audit | `revert_building_change` | Undo a building edit. |
| Storage | `trigger_delete_storage_recursive` | Trigger recursive storage cleanup. |
| Storage | `invoke_delete_storage_recursive` | Execute recursive storage cleanup. |
