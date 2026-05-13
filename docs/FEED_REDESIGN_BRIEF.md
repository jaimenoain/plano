# Feed Redesign — Design Brief

> **Audience.** Product owner (non-technical), and the autonomous coding agent that will scope and implement the rebuild. This is a **design brief**, not an implementation plan: it defines what we are building and why, and constrains the design space. Implementation phasing is sketched at the end so the agent can plan in vertical slices; the detailed technical roadmap will be a follow-up document.

> **Status.** Draft, May 2026. Owner: Jaime. Supersedes nothing yet; the current feed continues to ship until Phase 1 lands.

---

## TL;DR

The current feed is a strict reverse-chronological list of posts from people you follow, with no algorithmic ranking, no second-degree graph, no trending signal, and a separate "cold-start" page for users with zero follows. It works for power users with rich networks and silently fails everyone else. This brief proposes replacing it with a **single ranked, media-first mosaic surface** sourced from three concentric rings of the social graph (direct → extended → open), and a small set of always-fresh editorial slots that guarantee the top of the feed changes every visit. The same surface serves a user with zero contacts and a user with five hundred; only the *mix* of sources changes.

---

## 1. Background

### 1.1 What exists today

The feed page is implemented in [src/features/feed/pages/Index.tsx](src/features/feed/pages/Index.tsx) and stitched together from three independent data sources:

| Source | RPC | Role |
|---|---|---|
| Social feed | `get_feed` | Reverse-chrono posts from `follows` + own posts |
| Collections feed | `get_collections_feed` | Curated lists, injected every ~4 social cards |
| Discovery feed | `get_discovery_feed` / `get_suggested_posts` | Cold-start fallback for users with <1 followings |

Cards are resolved into three layout types — text-only, text+media, media-only ([resolveCardType.ts](src/features/feed/utils/resolveCardType.ts)) — but they all occupy a similar footprint in the list. A separate [ColdStartFeed.tsx](src/features/feed/components/ColdStartFeed.tsx) page is rendered for users without a graph, with a different two-column layout for "people to follow" + "buildings to discover."

Engagement metrics are tracked (`likes_count`, `comments_count`, `views_count`, plus per-image likes on `review_images`) but they do not influence ordering. Ranking is `ORDER BY created_at DESC` everywhere.

### 1.2 The four problems this brief addresses

1. **The feed is not visual enough for an architecture product.** Photos and videos of buildings are the most compelling content Plano has, and they are forced to share visual real estate equally with short text reviews. The product looks like a microblog when it should look like a gallery.
2. **The feed is dead between visits.** With no algorithmic refresh, a user who returns three times in a day sees the same top items each time unless the people they follow happen to have posted. There is no mechanism for the surface to feel alive on its own.
3. **The feed does not work for users with sparse graphs.** A "cold-start" experience is bolted on top of an empty social feed, and "few but not zero" follows is a no-man's-land — too few to fill the screen, too many to qualify for cold-start. The surface visibly degrades as graph size shrinks.
4. **Second-degree signal is unused.** "What buildings did the friends of my friends visit" is one of the strongest discovery primitives on a social travel product, and it is currently invisible.

### 1.3 What stays

This brief is a redesign of the *ranking and surface*, not the *content model*. Specifically:

- `building_posts` and `review_images` remain the atomic post unit.
- The follow graph (`follows` table) remains the primary social structure; we do not introduce mutual-friend, group, or DM mechanics.
- Cards continue to link to building detail pages, profile pages, and reviews as today.
- The existing engagement actions (like, comment, view-tracking via `track_note_views`) remain unchanged.

---

## 2. Goals & non-goals

### 2.1 Goals

1. **Visual-first.** Media (photo, video, multi-photo posts) is the default content unit; text-only content survives in a denser secondary form.
2. **Always fresh.** The top of the feed changes meaningfully between visits, even when no one in the user's graph has posted.
3. **Graph-graceful.** The same surface serves users with 0, 5, and 500 contacts. Sparse-graph users see more open-ring content; rich-graph users see more direct-ring content. No separate cold-start page.
4. **Direct contacts win.** When ring-1 content exists, it surfaces near the top. Second-degree content is present but weighted lower. Open content is the floor.
5. **Buildings are first-class.** A building can be the subject of a feed card ("Casa da Música is trending this week"), not only the *object* of a user's post.
6. **Explainable.** Every card carries a one-line attribution that says why it is in the feed ("Liked by Anna, who you follow" / "Trending in Lisbon this week"). No black-box magic.

### 2.2 Non-goals

- **Algorithmic feed personalisation beyond the ranker described in §4.** No ML, no embedding-based recommendations, no behaviour-derived interest model in v1. The ranking is rule-based and tunable by hand.
- **Reshares, quote-posts, or stitched content.** Out of scope.
- **Real-time presence ("X is viewing this now").** Mentioned in analysis as a dynamism lever; deferred to v2.
- **A separate "for you" vs "following" tab.** The single ranked surface replaces both implicitly.
- **Mobile-app-specific design.** This brief covers the web surface. Mobile is downstream; the data model and ranking apply there equally.
- **Migration of historical engagement signals.** The ranker operates on whatever signals are available at the time it ships; we do not backfill.

---

## 3. Users & scenarios

The five PRD personas map onto three feed-relevant scenarios:

| Scenario | Persona fit | What the feed must do |
|---|---|---|
| **Sparse graph, high curiosity** | The Enthusiast in week 1; the Student | Show beautiful, popular, geographically diverse content. Hint at people worth following without forcing a separate page. |
| **Mid graph, mixed sessions** | The Social Explorer; the Curator | Surface direct-contact activity when it exists; fill the rest with high-quality 2nd-degree and trending content so the feed is never "empty after three cards." |
| **Rich graph, high frequency** | The Practising Architect; long-tenured Enthusiasts | Direct-contact content dominates but is diversified — no single hyper-active user takes over the surface. Trending content provides a "what else is happening" tier. |

The single ranker (§4) handles all three by varying the mix, not the surface.

---

## 4. The model — three rings, one ranker

### 4.1 Concentric rings

Every candidate item belongs to exactly one ring based on its relationship to the viewer:

| Ring | Definition | Examples |
|---|---|---|
| **1 — Direct** | The viewer's first-degree graph and explicit signals | Posts by followed users; activity on saved buildings or favourited localities; events the viewer is attending |
| **2 — Extended** | Inferred second-degree signal | Posts liked or saved by ring-1 users; posts in localities ring-1 users have been active in; posts by users with high follow overlap |
| **3 — Open** | Globally trending and editorial | Posts with high engagement velocity regardless of graph; trending buildings; award winners; "this week on Plano" |

A post is assigned to its **highest** ring (a post by someone you follow that is also globally trending is ring 1, not 3). The ring label drives both the ranking weight and the attribution string shown on the card.

### 4.2 Ranking signals

The score per candidate is a multiplicative combination of:

| Signal | Source | Rationale |
|---|---|---|
| `freshness_decay` | `created_at` | Half-life of ~36h for ring 1, ~7d for ring 2, ~30d for ring 3 (editorial content ages slowly) |
| `graph_proximity` | Ring assignment | Boost direct ring heavily; modest boost for extended; floor weight for open |
| `engagement_velocity` | `likes_count + comments_count` over time since posting | "Per hour since posted" — what makes content feel alive, not just absolutely popular |
| `media_quality_prior` | Media type and count | Video > multi-photo > single photo > text-only; uses per-image like counts from `review_images` |
| `diversity_penalty` | Per-author and per-building cap per page | Prevents one super-active user or one viral building from dominating |
| `seen_penalty` | `note_views` tracking | Items the viewer has already seen drop sharply but not to zero |

All weights are constants in code (or a small config table), not learned. The agent picks initial values; the product owner tunes by inspection.

### 4.3 The ranker output

A single, paginated, ranked list of items. Items can be:

- A **post** (building review with media, or text-only — see §5.2)
- A **moment** (cluster of related posts — multi-friend visit to a city, multi-photo upload to one building)
- A **building card** (a trending or notable building, surfaced on its own merit)
- An **editorial slot** (photo of the day, award spotlight, on-this-day) — see §6
- A **prompt** (follow these people, complete your profile, log your first visit) — inline, not a separate page

Collections continue to be injected but as one card type among many, governed by the same ranker. The current "every ~4 cards" hard-coded interleave is retired.

---

## 5. Surface design

### 5.1 Layout — masonry mosaic

The list-of-equal-cards layout is replaced with a **bento/masonry grid**:

- **Tile size is proportional to score.** The top-ranked item per page occupies a 2×2 tile (or full-width on narrow viewports); subsequent items step down to 2×1, 1×1.
- **Three-column desktop, two-column tablet, single-column mobile.** The single-column case degrades gracefully to a stacked feed where tile size becomes vertical height variation.
- **Video gets the largest tile by default** regardless of score (it is the rarest and most engaging content; it earns the bandwidth).
- **Diversity is enforced visually.** Adjacent tiles should not be from the same author or building; the ranker's diversity penalty exists partly to guarantee this.

### 5.2 Content units

| Unit | Default tile size | Notes |
|---|---|---|
| Video post | 2×2 | Auto-play on hover (desktop) / muted-loop on viewport (mobile) |
| Multi-photo post (3+ images) | 2×2 or 2×1 | Hero image + small "+N" overlay; carousel on tap |
| Single-photo post | 2×1 or 1×1 | Standard card |
| Text-only review | 1×1 (compressed) | Pull-quote treatment with rating and building name; visually distinct from media cards |
| Moment cluster | 2×1 | "3 people you follow visited Lisbon this week" with stacked thumbnails |
| Building spotlight | 2×1 | "Casa da Música — 14 new photos this week, 4 from people you follow" |
| Editorial slot | 2×2 | Photo of the day, award winner, on-this-day |
| Inline prompt | 1×1 (low frequency) | "Follow these 5 architects" / "Log your first visit" |

### 5.3 Attribution

Every card carries a single-line attribution above or below the media, in a muted style:

- Ring 1: `Anna · 2h ago`
- Ring 2: `Liked by Anna, who you follow`
- Ring 3: `Trending in Lisbon this week` / `Photo of the day`

This is non-negotiable: it is the explainability mechanism that makes a ranked feed feel honest instead of mysterious.

### 5.4 Right rail

Retain the existing right-rail sidebar for low-signal activity (silent visits, recent follows) and for contextual widgets (bucket list, suggested follows). The mosaic is the focal surface; the rail is the secondary stream. On narrow viewports the rail collapses below the main column.

---

## 6. Dynamism

The feed must feel different at 9am and 9pm even with no new posts. Three mechanisms:

1. **Rotation tiers.** A small number of slots per page (1–2 above the fold) are reserved for content that refreshes on a clock:
   - **Photo of the day** — globally curated or community-voted, refreshes at midnight UTC
   - **Trending this hour** — highest engagement velocity in the last 60–120 min
   - **On this day** — a building the viewer visited 1y / 5y / 10y ago, or an award anniversary
2. **Velocity signals on cards.** Surface "+47 photos this week" or "12 likes in the last hour" on building spotlights and viral posts. Total counts are dead; velocity is alive.
3. **Personal hooks.** Bucket-list nudges (already exist as [BucketListWidget.tsx](src/features/feed/components/BucketListWidget.tsx)), unvisited buildings near the viewer's location, awards in a city they've saved. Cheap, infinite, and uniquely per-user.

The combined effect is that even a user with zero follows opens the feed and sees a different top tile every visit.

---

## 7. Sparse-graph handling

The cold-start page goes away. The same mosaic renders, with the source mix shifting automatically:

| Graph size | Ring 1 share | Ring 2 share | Ring 3 + editorial share | Inline follow prompts |
|---|---|---|---|---|
| 0 follows | 0% | 0% | ~85% | ~15% (1 per 6–8 cards) |
| 1–10 follows | ~25% | ~15% | ~55% | ~5% (1 per 20 cards) |
| 11–50 follows | ~50% | ~20% | ~30% | rare |
| 50+ follows | ~65% | ~15% | ~20% (kept as a floor for variety) | none |

These percentages are starting weights, not hard quotas; the ranker scores items independently and the mix emerges. The point of stating them: a 0-follow user should never see "your feed is empty" — the surface is full from the first session.

---

## 8. Data dependencies

The brief is intentionally non-prescriptive about implementation, but the following data must be available for the ranker to work. The agent decides RPC structure during the implementation roadmap.

| Data | Status today | Gap |
|---|---|---|
| Ring 1 candidates | Exists (`get_feed`) | Returns chronologically; needs to return scoring inputs (engagement counts already present) |
| Ring 2 candidates | Does not exist | New: "posts liked or saved by users I follow" — single join on `review_likes` × `follows` |
| Ring 3 candidates | Partial (`get_discovery_feed`, `get_suggested_posts`) | Needs trending signal — engagement velocity over a rolling window, materialised view candidate |
| Building spotlight data | Partial | Needs per-building rolling activity (new photos / posts in window N); materialised view |
| Editorial slots | Does not exist | Needs admin surface and a small table (`feed_editorial_slots`) — out of scope for v1 if Photo of the Day is computed instead of curated |
| `seen_penalty` | `track_note_views` exists | Reusable as-is |
| Diversity caps | Not modeled | Enforced in application code over the ranked list, not in SQL |

The agent will produce a separate data-roadmap document during Phase 0 of implementation.

---

## 9. Phasing

The implementation roadmap is the agent's deliverable, but the brief commits to this sequencing because it concentrates user-visible value early.

### Phase 1 — Single ranked mosaic (the biggest visual + dynamism win)

Replace chronological ordering with the §4.2 ranker over the existing three data sources (`get_feed`, `get_collections_feed`, `get_discovery_feed`). Merge into one mosaic surface. Retire the cold-start fork — the same surface renders for everyone. Add per-card attribution. No new ring-2 source yet; ring 3 is the existing discovery feed.

**Ships when:** the mosaic renders correctly across viewport sizes, every card has an attribution line, and a 0-follow user lands on the same page as a 50-follow user with no UI fork.

### Phase 2 — Second-degree and building spotlights

Add the ring-2 "liked by your follows" source. Introduce the building spotlight card type with rolling-activity computation. Tighten the ranker weights based on whatever signal the team has from Phase 1.

**Ships when:** a sparse-graph user sees ring-2 content distinguishable from open content; building spotlights appear at a sane frequency without dominating.

### Phase 3 — Rotation tiers and moments

Add Photo of the Day, On This Day, and Trending This Hour as editorial slot logic. Implement moments clustering (multi-user → same locality, multi-photo → same building). Velocity signals on cards.

**Ships when:** the top tile changes meaningfully between morning and evening visits with no new posts in the graph.

### Out-of-band: video tile sizing and auto-play

Lift into whichever phase is most convenient — it is a small, isolated piece of work, and visually it is the single biggest "this feels like a different product" moment.

---

## 10. Success metrics

Tracked from Phase 1 onward. The agent and the product owner should agree on baselines before Phase 1 ships.

| Metric | Why | Direction |
|---|---|---|
| Median session length on `/feed` | Core engagement | Up |
| Sessions per week per active user | Return frequency, captures "dynamism" goal | Up |
| % of sessions with a card interaction (like / open / save) | Surface quality | Up |
| % of sessions by 0–5-follow users that end in a follow action | Sparse-graph onboarding works | Up |
| % of sessions where the user scrolls past the first viewport | Top of feed quality | Up |
| Cards-per-session viewed | Depth | Neutral or up (not down) |

We do not target engagement-per-card; that can be gamed by surfacing fewer better cards, which is fine.

---

## 11. Open questions

These are deliberately left for the product owner to resolve before Phase 2; the agent should call them out in the implementation roadmap.

1. **Photo of the Day — curated or computed?** Curated has higher quality but requires an admin surface and ongoing operational cost. Computed (top engagement-velocity photo in the last 24h) is free but lower ceiling.
2. **Is there a notion of "close contacts" within ring 1?** Some products distinguish strong ties (frequent interactions) from weak ties (follows but no engagement). The brief does not assume this; it can be added as a sub-weight inside ring 1.
3. **Should architects' own posts on their own buildings get a special ring or boost?** They are intrinsically authoritative and visually rich. Probably yes, but the brief defers this to Phase 2 tuning.
4. **Do we surface awards content in the feed, and how?** The awards system is a strong editorial signal. Likely a ring-3 / editorial card type, but the precise treatment is deferred.
5. **What is the policy on the same building appearing twice in one session?** The diversity penalty handles this within a page; cross-page behaviour needs a decision.

---

## 12. Risks & tradeoffs

| Risk | Mitigation |
|---|---|
| **Ranker becomes a permanent product-management surface.** Every "why isn't my post showing up" question becomes a ranking question. | Aggressive use of attribution lines; keep the ranker rule-based and inspectable; expose a "see what's new" reset that reverts to chronological for the current page. |
| **Mosaic layouts are harder to virtualise** than uniform lists; expect a non-trivial perf engineering pass. | Phase 1 can ship with a simpler 2-column variable-height grid before the full masonry; full bento is a Phase 2 polish item. |
| **Building-anchored cards risk feeling impersonal** if overused. | Cap them at roughly 1 in 5 surface units; require recent activity to qualify (it's not a building directory). |
| **Second-degree-via-likes can leak intent.** "Why is this in my feed?" → "Because Anna liked it" may feel surveillance-y. | Explicit, friendly attribution; respect existing privacy settings (`visibility = 'contacts'` posts never escape the direct ring). |
| **The ranker over-fits to power users.** Engagement-velocity weights skew towards content that already has likes, which is content seen by high-volume users. | The diversity penalty and the editorial slots are the counterweight; tune by sampling sparse-graph users in QA. |
| **"Trending" can become repetitive across visits.** | Apply `seen_penalty` to editorial and trending content, not just to social posts. |

---

## 13. What this brief does not decide

- The RPC names, signatures, and materialised view structures (agent decides during implementation roadmap).
- The exact CSS / tile breakpoints (design pass after Phase 1 wireframes).
- The right-rail content (out of scope; treated as orthogonal).
- The mobile-app feed (downstream; same model, different shell).
- Monetisation, paid promotion, sponsored slots (explicitly not considered in v1).

---

## Appendix A — Glossary

- **Ring 1 / Direct.** Content surfaced because the viewer has an explicit relationship with the actor (follow) or subject (saved building, attended event).
- **Ring 2 / Extended.** Content surfaced because someone in ring 1 has engaged with it.
- **Ring 3 / Open.** Content surfaced on its own merit (engagement velocity, editorial selection) without any graph proximity to the viewer.
- **Moment.** A cluster of related posts presented as a single feed unit (e.g., three friends visiting the same city in the same week).
- **Spotlight.** A feed card whose primary subject is a building, not a post — surfaced because of recent activity on that building.
- **Editorial slot.** A feed card whose content is selected by clock-driven logic (Photo of the Day, On This Day, Trending This Hour), not by the ranker.
- **Attribution.** The one-line label on each card that explains why it is in the feed.
