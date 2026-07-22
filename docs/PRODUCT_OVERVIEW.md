# Plano — Product Overview

**Purpose of this document.** A complete, business-readable description of what Plano actually is today, written from a full read of the working product rather than from marketing material or older planning documents. It is intended as the shared factual base for business model, go-to-market, pricing, and investor work.

**Method and honesty rules.** Every claim below is grounded in what the product actually does. Where the product's own planning documents describe something that the built product does not do, this document follows the product and says so. Statements that are inferences — reading intent from what was built — are marked **[Inference]**. Statements about things that do not exist are stated plainly rather than softened.

**Last verified:** 17 July 2026, against the live codebase.

---

## 1. One-paragraph summary

Plano is a community-built global catalogue of notable architecture, combined with a personal record-keeping tool for the people who go and see it. Its own tagline is "The world's architecture, cataloged," and the product it most resembles is Letterboxd — but for buildings instead of films. A user can find buildings on a global interactive map, mark them as visited or as somewhere they want to go, rate them on a three-point scale, write reviews, upload photographs, and build shareable themed collections that can be turned into multi-day walking or driving itineraries. Around that consumer core sits a substantially larger and less obvious machine: a structured professional-credit system that links every building to the individual people and the architecture practices that made it, which those professionals can then claim and control; an awards database recording who won what and when; an events directory for architecture talks, tours, and exhibitions; and a formally structured global volunteer network — the "Embassy" — of city and national chapters whose members are given AI-assisted tools, task queues, moderation powers, personal goals, and leaderboards to systematically fill gaps in the catalogue. The core job the product does is to turn scattered, unstructured architectural knowledge into a single structured, verified, geolocated dataset — and to get a distributed community to do that work.

---

## 2. The problem

**What is explicit in the product.** Plano's own stated vision is that architecture enthusiasts, students, professionals, and curators have no single place to track the buildings they visit, discover new ones, and connect with others who care. That is the surface problem, and the personal-library and social features address it directly.

**What the built product reveals as the real problem. [Inference]** The proportion of engineering invested tells a different and more interesting story than the tagline does. The consumer-facing "log your visits" features are comparatively small. The largest, most elaborate, most actively developed parts of the product are the professional credits system, the ambassador programme, and the admin console. Read from the code, the problem Plano is actually solving is:

**Structured, trustworthy data about the world's architecture does not exist in one place, and there is no economically viable way to create it.** The information is scattered across practice websites, Wikipedia, municipal records, awards archives, and press coverage. It is unstructured, inconsistent, frequently wrong about attribution, and nobody's job to maintain. Existing sources each fail differently: Wikipedia has no taxonomy of materials or access rules and no notion of a verified credit; Google Maps knows a building exists but not who designed it or what style it is; practice portfolios are marketing, not records, and cover only their own work.

The specific sub-problems the product is visibly built to solve:

1. **Attribution is genuinely hard and genuinely contested.** Who "designed" a building is not one fact. There is a design architect, an architect of record, engineers, landscape architects, and consultants — and there are firms as well as individuals, firms that merge and dissolve, and people who move between them. The credits model handles all of this explicitly, including disputes over who is entitled to claim a firm.
2. **Data collection at world scale does not pay for itself.** The ambassador programme is an answer to this: recruit volunteers, organise them geographically, give them tooling and status, measure them, and rank them.
3. **Coverage is uneven and the gaps are invisible.** Multiple tools exist purely to surface *what is missing* — buildings with no photos, buildings with no completion year, cities with many buildings and no chapter.
4. **Professionals have no canonical, controllable record of their own work.** The claim-and-steward system gives an architect or a practice an owned, verified page.

**[Inference]** The consumer social product plausibly functions as the acquisition and engagement mechanism that produces the data, rather than being the end in itself. The data — and the professional/institutional relationships built on it — is where the durable value accumulates.

---

## 3. Who uses it

Plano supports a notably large number of distinct user types for a product with no billing system. Roles are not a simple ladder; several are orthogonal and stack on the same account.

### 3.1 Anonymous visitor

**Can do:** view the marketing landing page, browse public building pages, city and country pages, collections, events, awards, and public profiles. Search. Use the map. Join a waiting list by leaving an email and optional name.

**Value:** evaluation and discovery. **[Inference]** The presence of a waiting-list capture on the landing page alongside fully open self-service signup suggests either a deliberate pre-launch posture, a demand-measurement device, or a vestige of an earlier invite-only phase.

### 3.2 Registered user (default)

The default role on every new account. Signs up with email and password; a profile is created automatically; a welcome email is sent.

**Can do:** everything an anonymous visitor can, plus set a personal status on any building (visited, want to visit, or hidden), rate on the three-point scale, write reviews with photos and one video, upload photos to any building, contribute and vote on external links, create collections and folders, generate itineraries, follow other users, designate close friends, recommend buildings to friends, invite friends to visit somewhere together, block and report users, add entirely new buildings to the catalogue, edit buildings they created, merge duplicate buildings, and export their own data.

**Value:** a permanent personal record of architecture seen and wanted, plus discovery and social context.

**Notably:** any authenticated user can create a building and can merge duplicates. There is no contribution gate, no reputation threshold, and no approval step before a new building goes live. Moderation is entirely after the fact.

### 3.3 Credited professional — claimed person

An individual practitioner who has claimed their entry in the people catalogue, either as themselves or via a representative. Claims move through unclaimed → claimed → verified.

**Can do:** everything a registered user can, plus control their own public page (biography, imagery, website), see a portfolio dashboard of every building they are credited on, and — critically — edit the *official* data fields on any building they hold a non-hidden credit for: name, year, city, country, and the professional statement. When a verified credited party exists for a building, the building's original creator **loses** the right to edit those official fields. Authority transfers to the professional.

**Value:** a canonical, controlled, verified record of their own work, with editorial authority over how it is described.

### 3.4 Credited professional — company steward

A person with a stewardship relationship to a practice, at one of two levels: **owner** or **steward**. Access is proven via work-email domain verification — a company carries a verified domain, and a token sent to an address at that domain redeems into stewardship. Stewards can also be invited by an existing steward, or can request access with an approval flow.

**Can do:** everything a claimed person can, but for the practice — edit the company page, manage the company portfolio including the ordering of projects in it, and edit official fields on every building the practice is credited on.

**Contested claims are a first-class concept.** There is a formal dispute mechanism: a dispute page, an admin notification, and open/resolved states. **[Inference]** This exists because someone did in fact try to claim a firm they were not entitled to, or because the founders anticipated it — either way it signals that firm identity is understood to be commercially valuable enough to fight over.

### 3.5 Ambassador (volunteer contributor)

A member of a geographic chapter. Chapters are either **local** (tied to a city) or **national** (tied to a country), and local chapters roll up to their national parent. A user may belong to exactly one chapter globally. Chapters carry a member cap, default 20, and a status of active, forming, or inactive.

Membership is applied for with a written motivation of at least 100 characters, and reviewed by chapter leadership or admins. Applications are limited to one pending at a time.

**Can do:** everything a registered user can, plus reach the Embassy workspace with its six contribution tools, moderate other people's contributions within their chapter's geography, set personal goals, appear on the chapter leaderboard, create and assign chapter tasks, propose chapter projects, and log outreach to architecture firms.

**Value:** status, community, structured purpose, and measured recognition. **[Inference]** This is a well-understood volunteer-motivation design — role titles, visible metrics, leaderboards, onboarding checklists, and a defined scope of authority.

**A subtle and important mechanism:** ambassador membership is tied to real geography. If a member changes the country or location on their profile, the system re-checks whether they still match their chapter. If not, their membership is automatically flagged for review and their chapter's leadership is notified. Their portal access continues during review rather than being cut off.

### 3.6 Chapter ExCo

An ambassador with an executive responsibility in one of five named portfolios: content, marketing, architect relations, data quality, or community.

**Can do:** everything an ambassador can, plus review applications to their chapter, see leadership-only tasks, view chapter metrics and the member directory, and force an AI event search rather than waiting for the automatic cadence.

### 3.7 Chapter president

The leader of a chapter.

**Can do:** everything ExCo can, plus directly invite new ambassadors and ExCo members, and change any member's role or status within the chapter — with one guard: a president cannot change their own role. A president of a *national* chapter additionally gets read-only oversight across every local chapter beneath them, including member counts, edit and photo counts, and last activity.

**Presidents are onboarded deliberately.** A five-step checklist tracks a new president through their first sixty days — complete your profile, get the chapter active, invite a first member, review a first application, make a first edit — and platform admins can watch progress across every new president.

### 3.8 Global ambassador roles

Two roles — **global team** and **global leaders** — sit above chapter geography and carry leadership authority programme-wide. Global team behaves as ExCo, global leaders as president.

### 3.9 Award administrator

A person with administrative rights over a specific award in the awards database, with a dedicated admin page per award.

**Can do:** manage the award's editions, categories, and recipients, and review requests from people or firms claiming they won something.

**[Inference]** This is the seed of a relationship with awarding bodies as institutional partners — letting a prize's own organisation maintain its record on Plano.

### 3.10 Collection contributor

A user invited to co-edit someone else's collection. Can add and remove items. A lightweight, per-object sharing permission — not a team or workspace concept.

### 3.11 Platform admin

Two levels exist, `admin` and `app_admin`, which the product currently treats identically.

**Can do:** an unusually broad console — roughly forty distinct admin screens. Platform analytics; building management, audit history, and reversion of any edit; user management and role assignment; moderation of reports; an image wall for visual review; photo analytics with a geographic heatmap; storage cleanup jobs; entity claims; flagged credits; the people and companies directories; merge tools for buildings, people, companies, and localities; an API request log with cost accounting; the feedback inbox; events; awards content management; editorial updates; and the entire ambassador programme console.

### 3.12 Superadmin

Gated by an environment-configured list of email addresses rather than by a database role. Currently exposes a single component playground. **[Inference]** A developer-facing hatch, not a product role.

### 3.13 Roles that are *not* present

There is **no** organisation, workspace, team, or tenant concept. The data model is explicitly not multi-tenant. There is no seat model, no billing role, no customer-account structure. Every permission is either global, personal, geographic (chapter), or per-object (collection contributor, company steward, award admin). **This is the single most important structural fact for anyone designing a B2B pricing model on top of this product.**

---

## 4. What the product does, in detail

### 4.1 Arriving and signing up

A logged-out visitor lands on a marketing page: a hero with a search bar, an animated set of floating building cards, a live statistics band, and a feature grid. A waiting-list dialog is reachable from the landing navigation and captures an email and optional name; a duplicate email is handled gracefully rather than erroring.

Signup is open self-service with email and password. There is no invitation requirement and no approval step in the working product. A database table for allow-listed emails exists but the application does not read it — **[Inference]** a remnant of an earlier gated phase.

If the visitor arrived via a referral link carrying an inviter's username, the signup screen recognises it, shows who invited them alongside a facepile of others, and attributes the new account to that inviter.

On registration: a profile row is created automatically, and a branded welcome email is sent.

New users are then routed to onboarding, where they set a username, upload an avatar, and configure initial preferences. Completion is tracked on the account, and an incomplete user is pushed back into the flow.

### 4.2 The home feed

For a signed-in user, the home page is a feed of what the people they follow have been doing, newest first, with infinite scroll.

The feed is not a single card type. Reviews with photos or video render as prominent hero cards; text-only reviews render compactly; several reviews by the same person in a short window — optionally in the same city — collapse into a single cluster card. Beyond reviews, the feed also carries non-review activity from followed accounts (someone marked a building visited or added it to their list without writing anything) and public collection updates, each with their own card type.

Interleaved into the feed: algorithmically suggested posts from people the user does *not* follow, "people you may know" suggestions, and promotional blocks pointing at discovery features. A visual divider marks the point where the user has caught up with everything new since last visit. Each item can show a facepile of which of the user's contacts have engaged with that building.

A rail alongside the feed provides shortcuts, including into the user's own library.

### 4.3 Finding buildings — the map

The map is the centrepiece of discovery and is the most technically elaborate surface in the product.

It renders the world with building pins. Because a global catalogue cannot ship every pin to a browser, clustering is computed on the server: at a given viewport and zoom the system returns either aggregated cluster bubbles or individual buildings.

**The pin language carries meaning and is worth understanding, because it is how the product expresses quality.** Pins follow a five-rank monochrome ladder — larger and blacker means more important, smaller and fainter means less. Prominence is carried by size and fill only, never by colour. What drives the rank depends on the mode:

- In **Discover** mode, rank reflects the building's global standing: Top 1%, Top 5%, Top 10%, Top 20%, or the rest. Buildings already in the user's library additionally carry a small centre dot.
- In **My Library** mode, rank reflects only the user's own relationship to the building: rated 3, rated 2, rated 1, saved-or-visited-but-unrated, or unsaved. Rated pins show their score as one to three small dots inside the pin — a Michelin-star visual language used consistently across the product.

Buildings whose location is only approximate render as a circle rather than a pin, honestly communicating uncertainty. Cluster bubbles mirror the same ladder: a cluster wears the face of the highest-ranked building it contains.

The map's entire state — position, zoom, mode, and every active filter — lives in the URL, so any view is a shareable link. Position is also remembered locally between sessions.

**Filtering is deep.** A slide-out drawer offers: functional category and typology; materials, styles, and context; credited people and companies; construction status (built, under construction, unbuilt, lost, temporary); minimum global rating; minimum personal rating; minimum rating by contacts; specific contacts; specific collections; folders; access level, logistics, and cost; hide-toggles for visited, saved, hidden, and photo-less buildings; and a quality threshold. All filters are applied server-side.

A sidebar lists the buildings currently in view with images, credits, and tier badges, sortable.

Users can save a named set of filters as a reusable view and pin it.

### 4.4 Finding buildings — search

A unified search bar spans buildings, people, companies, and users, with a mode toggle between them. Location-aware queries are supported via Google Places.

Building search matches on name, alternative name, aliases, city, country, and the names of credited people and firms — so searching a practice's name surfaces its buildings. Name matching is authoritative, so every catalogued building is findable by name. The search page offers the same Discover / My Library switch as the map, as a first-class page-level control, and a browse mode with dedicated People and Companies tabs.

When building results are thin, the product nudges the user toward searching people, companies, or users instead.

A leaderboard ranks buildings by popularity.

### 4.5 The building page

The richest read surface in the product.

**Header:** a full-width hero image or video, falling back to an automatically generated community thumbnail. Name, alternative name, city, country, year, the credited people and firms as links to their own pages, and a construction-status badge. If the building ranks above standard, a popularity badge.

**Taxonomy:** functional category, typologies, materials, styles, context.

**Access:** three independent dimensions — level (public, private, restricted, commercial), logistics (walk-in, booking required, tour only, exterior only), and cost (free, paid, customers only) — are synthesised into one human-readable label with an icon, such as "Restricted (Booking Required)". Free-text access notes sit alongside. **This is a genuinely differentiated data asset: it answers "can I actually go and see this, and how?" — a question no general mapping product answers.**

**Professional statement:** if the credited architect or firm has written one, it appears in its own section, editable by them.

**Photography:** a gallery of every image on the building, each with a like count. Clicking opens a full-screen viewer with navigation, uploader attribution, timestamp, liking, and threaded comments on the individual image. Any signed-in user can upload by drag-and-drop; images are compressed in the browser before upload; uploaders can flag an image as AI-generated.

**Location:** an embedded map with the correct pin type, expandable to fullscreen, with a directions link out to external map apps.

**Nearby:** other buildings in geographic proximity, with thumbnails, rendered with the same tier pins.

**Social context:** which of the user's contacts have visited or saved this building.

**Links:** community-contributed external URLs with titles, upvoted, best-first.

**Awards:** the building's award record.

**Reviews:** a chronological feed of reviews with ratings, text, images, likes, and comments.

**Personal actions:** set status, rate, assign to collections without leaving the page.

The page is also reachable at a modern geographic URL — `/architecture/{country}/{city}/{id}/{slug}` — with a permanent redirect adding the slug when it is missing. **[Inference]** This URL architecture is a deliberate SEO structure, targeting city-and-country architecture searches.

### 4.6 The personal library

Every user has a personal relationship with any building: **visited**, **want to visit**, **hidden** (removed from their library and filtered out of the map), or none.

Ratings are a deliberate three-point scale, not five stars: **1 = Impressive, 2 = Essential, 3 = Masterpiece**. Rating a building 2 or above tells the user they just boosted its rank — making the contribution loop visible. Ratings feed the building's global popularity score. Rating is possible from the building page, the recommend dialog, and inline on cards.

A user's record on a building also holds free-text review content, an optional video, an optional visit date, and a visibility setting.

The profile presents the library two ways: a **Kanban board** with drag-and-drop cards in status columns, and a sortable **list**. Users can pin favourite buildings and select highlights for showcase, each toggleable as a profile section.

Users can export their own data — ratings, reviews, buildings visited, and bucket list — as a CSV.

### 4.7 Reviews and media

Reviews are written on a full-page form: text, rating, multiple images, one video. Each review has a permanent link with its own page carrying full content, images, comments, and likes. Reviews can be edited inline from the profile without opening a separate page.

Images and video are both compressed in the browser before upload — a deliberate cost and bandwidth decision. Individual images can be liked and commented on independently of the review that carries them.

### 4.8 Collections, folders, and itineraries

**Collections** are curated lists of buildings — the "Brutalist Gems of London" use case. Each has a name, description, SEO slug, public/private toggle, an optional external link, and a toggle for whether community images show.

Items can be grouped five ways: not at all; by user-defined custom categories each with a label and colour; by status; by ratings from selected members; or uniformly. Each item can carry a note, a category, and a hidden flag.

Collections can be co-edited by invited contributors, and other users can favourite someone's public collection.

**Collections can contain non-building points of interest** — accommodation, dining, transport, attractions, other — each with a name, a Google Place reference, coordinates, address, notes, and a website. This turns a collection from a list into a plannable trip.

Every collection has its own map view with route overlays, filters, and sidebar, at a clean per-user URL.

**Itineraries.** From a collection, a user chooses a number of days and a transport mode (walking, driving, cycling). The system groups the collection's buildings into geographic day-clusters, computes an optimised route per day, and saves the result. The itinerary renders as an ordered, sortable list of stops per day with transit detail between them, and as route lines on the map. Each day carries a number, optional title and description, stops, a default transport mode, and route geometry; each stop can override transport mode, add custom instructions, and estimate minutes.

**This is described in the product's own planning documents as "AI-powered itinerary generation." It is not. It is k-means geographic clustering plus a routing API. See §5.**

**Folders** are a layer above collections: named, sluggable, public-or-private containers holding collections, with their own page and preview cards. Folders are also available as a filter — show me every building in any collection in this folder.

### 4.9 Social

Users follow each other; following brings someone's activity into the feed. Profiles show mutual followers. Users can mark followed accounts as close friends.

A Connect page surfaces algorithmic "people you may know" suggestions based on mutual follows and taste overlap, and lists current contacts with activity status.

Users can recommend a building to one or more friends, with inline rating; can invite friends to visit somewhere together, which raises a visit-request notification; and can copy a share link that carries their username as a referral tag.

Users can compare taste overlap with another user, and the system computes a mutual affinity score from shared ratings.

Safety: block and report.

### 4.10 Geography pages

City pages, country pages, and an architecture hub. A locality row is created automatically the moment a building in a new city is added, and its building count is kept current by the database. Localities can be enriched with a description, hero image, SEO title and description, and a map centre. Locality pages carry collections, top contributors, and the local volunteer team.

**[Inference]** Auto-created city pages that fill themselves as the catalogue grows is a compounding SEO asset: every new city adds an indexable page that improves on its own as contributions arrive.

### 4.11 Events

An events directory for architecture talks, tours, exhibitions, open houses, and award ceremonies.

Any user can submit an event, and edit one they submitted. Events carry a title, description, start and end, address and geographic point, an external link to the organiser's own page, a cover image, and a locality.

**Events can be claimed.** An event moves through unclaimed → pending → claimed. An event can be attributed to an organising user, an organising person, or an organising company, and can be flagged as self-hosted. **[Inference]** This is the same claim pattern as firms and awards, and it is a recurring strategic motif: *catalogue the thing first, then let the party with a commercial interest come and take ownership of it.*

Users can mark themselves **interested** or **going**.

Event URLs are geographic — `/events/{country}/{city}/{slug}` — with a flat fallback for online events.

Events also appear on award editions, tying a ceremony to a prize.

### 4.12 Awards

A structured record of architecture prizes.

An **award** has a name, description, awarding body (either a linked company or a free-text name and type), country, frequency, website, and active flag. Awards themselves are claimable.

Awards have **editions** (a year, a number, a label, a ceremony date and location), **categories**, and **recipients**. A recipient row records an outcome and points at a building, a person, or a company — so the model captures shortlists and nominations, not only winners.

**Awards sync from Wikidata.** Awards carrying a Wikidata identifier are refreshed automatically, at most weekly, pulling data including a sitelink count. **[Inference]** Sitelink count is a notability proxy — a way to rank prizes by real-world significance without a human judging it.

Users can **suggest** an award recipient, which goes to a review queue. People and firms can **claim** an award they say they won, which goes to a review queue. Awards have their own leaderboards, including a per-person leaderboard, and buildings, people, and companies each display their award record on their pages.

### 4.13 Professional credits — the system underneath

This is the part of Plano that is least visible to a casual user and most valuable commercially.

**People** are individual practitioners: name, slug, biography, avatar, nationality, birth and death year, location note, website, and claim status. **Companies** are practices: name, slug, biography, logo, country, founded and dissolved year, website, a verified domain, and claim status. People and companies can be formally affiliated with each other over time.

**Every link between a building and a professional is a credit row**, and a credit is a rich object, not a name string:

- exactly one person **or** one company
- a **role** from a discipline taxonomy — design architecture, architecture of record, and others
- a **tier**: primary, contributor, or ancillary
- a **lead** flag, a display order, and a portfolio rank for the firm's own ordering
- optional start and end years
- contribution notes and a project URL
- a **status**: active, verified, flagged, or hidden
- who added it, who moderated it, and when
- if flagged: a reason (such as "wrong person"), notes, who flagged it, when, and what status it held before being flagged

**Credits can be contested and removed.** There is a flagging mechanism with structured reasons. There is a token-based removal flow — a credited party receives a link that lets them remove a credit without needing an account relationship. Credited entities are notified when they are credited, and notified of outcomes, with a log ensuring people are not notified repeatedly.

**Claiming.** An individual claims their person entry as themselves or via a representative. A firm is claimed by proving control of its email domain: a token goes to a work address, and redeeming it grants stewardship. Stewards can invite other stewards, or request access with an approval-token flow. Disputes over a firm claim are a formal, tracked object with an admin notification.

There is also a staging area for credits — **[Inference]** a bulk import or pipeline path — and an admin queue for legacy architect claims left over from an earlier version of this system.

### 4.14 The Embassy — the volunteer contribution engine

The Embassy is the workspace for ambassadors and, measured by code, one of the largest parts of the product. It has its own layout, its own access guard, and eight screens.

**Welcome / onboarding.** A new ambassador is asked which tools they want to work with; their preferences reorder the contribution hub so their chosen work comes first.

**Contribute** — the hub, with six tools:

1. **Data & Research** — the AI-assisted tool. See §5.
2. **Photography** — surfaces buildings in the chapter's geography that have no photographs, ranked by popularity so the most consequential gaps come first. Includes a coverage map and filters by photo count and popularity band.
3. **Architect Outreach** — surfaces unclaimed practices with buildings in the chapter's geography, ranked by the combined popularity of those buildings. The ambassador contacts the firm and logs the outcome against it. **This is a distributed, volunteer-operated, prioritised sales pipeline for firm claims. [Inference] It is the closest thing in the product to a go-to-market motion, and it is already built, staffed, and instrumented.**
4. **Moderation** — chapter-scoped review of photos, videos, credits, and new buildings, with per-item and bulk approval. Approvals are scope-checked server-side: an ambassador cannot moderate outside their chapter's geography. Global moderation variants exist for programme-level roles.
5. **Grow Community** — recruitment.
6. **Events** — the AI event-discovery review queue. See §5.

Also present: **duplicate detection**, surfacing likely-duplicate building pairs. Dismissals are per-user rather than global, so two ambassadors independently evaluate the same pair — a deliberate accuracy trade-off.

**My Goals.** Personal targets with a metric, a target value, and a due date. Progress is computed live from actual contributions — photographs uploaded, edits made, buildings visited, firms claimed — counted only from the moment the goal was created. The page also carries the chapter leaderboard, showing every active member.

**Tasks.** A chapter task list. Any active member can create a task with a title, description, due date, optional assignee, optional linked project, and an optional linked architecture firm. Visibility is per-task: whole chapter, leadership only, or private to the creator.

**Projects.** Chapter initiatives with a status. Ambassadors can propose ideas; leadership publishes them; admins see the cross-chapter idea inbox.

**Team.** The chapter directory grouped by role.

**Leadership.** For presidents and ExCo: chapter metrics over a chosen window with a comparison against the preceding equivalent window — edits, photographs added, and building visits — plus per-member activity, the member directory with contact details, invitation, and role management. Presidents in their first sixty days see their onboarding checklist. Pinned and unread admin broadcasts surface here.

**National overview.** For national presidents: every local chapter beneath them with member counts, president, 30-day edits and photos, and last activity.

### 4.15 The Programme console — running the volunteer network

An admin-side suite for operating the ambassador network as a programme.

**Health dashboard.** Chapter counts by status with 30-day deltas, pending and stale applications (pending over seven days), a 30-day activity trend of edits and photos with a rolling average, automatically flagged chapters, and the top five chapters by contribution.

**President directory** with a detail panel, and an onboarding tracker showing every president in their first sixty days and how far through the checklist they are.

**Intervention queue.** Five automated flags: no president, president inactive, forming chapter stalled, chapter at capacity with open applications, and no chapter activity. Each flag can be dismissed or snoozed for 7, 14, or 30 days, per admin. The sidebar carries a live count.

**Broadcasts.** Compose a message to presidents scoped to everyone, a country, or a chapter, rate-limited to three per day, with per-recipient read status. Messages can be pinned or marked action-required, surfacing as banners in the Embassy.

**Rankings.** Chapter performance over 7, 30, 90 days or all time — members, edits, photos, new members, applications approved, last activity, and a composite score. The top decile is highlighted. Exports to CSV.

**Campaigns.** Time-boxed targets with a metric, a target value, a date range, and a chapter scope.

**Coverage.** Every city ranked by building count, showing whether it has a chapter and how many members — with a gap view listing cities above a threshold with no chapter and a one-click "create a forming chapter here" action that pre-fills the dialog.

**[Inference] Taken together this is not a feature set — it is an operating system for a volunteer workforce, of a kind normally built internally at organisations like Wikimedia. Its existence at this level of finish implies the founders regard distributed human data collection as the core business process, not a side activity.**

### 4.16 The admin console

Beyond the programme suite: a dashboard with seven analytics zones (platform pulse, activity trends, content intelligence, a user leaderboard on eight different metrics, retention analysis, notification intelligence, and a photo heatmap); building management with full change history and the ability to revert any edit; user management and role assignment; moderation of reports; an image wall; photo analytics; storage cleanup jobs; entity claims; flagged credits; people and companies directories; merge tools for buildings, people, companies, and localities; the feedback inbox; events; the awards CMS; editorial updates; and an API request log.

A System page exists but is an explicit "coming soon" placeholder.

### 4.17 Feedback

Users can submit feedback from anywhere. A submission captures the message, a type, the page URL, the browser, **console errors**, and an optional screenshot stored privately. Admins triage it with statuses, outcome notes, a needs-user-input flag, and reopening. Every submission can fire an outbound webhook.

**[Inference]** Capturing console errors and screenshots with user feedback is a deliberate compression of the bug-report loop — and the development history shows this channel is actively used to drive fixes, with individual feedback items traced through to specific repairs.

### 4.18 Notifications

In-app notifications with per-type toggles stored on the profile, defaulting to on. Types cover: someone followed you; a friend joined; a suggested follow; a building recommendation; a like; a comment; an invitation to visit somewhere together; ambassador application received, approved, and rejected; ambassador membership needs review after a location change; and admin broadcasts.

Transactional email is separate, and covers welcome, credit notifications, credit outcomes, entity-claimed, steward invitations and requests and approvals, and dispute alerts.

### 4.19 Editorial

A published "Updates" section with a listing and per-post pages, authored in the admin console — a product-news channel owned by the platform.

### 4.20 Platform behaviours

Installable as an app on phones and desktops, with offline capability and platform-specific install prompts. Building and city pages carry per-page metadata and social preview tags, generated server-side. A sitemap is generated on the server. Error tracking and analytics are in place. Login and online-presence are tracked. Buildings are never hard-deleted — they are flagged deleted, or merged with a pointer to their surviving twin, so links never break.

---

## 5. The AI layer

This section is deliberately precise, because the gap between what the product's own documents claim and what the product does is commercially material.

### 5.1 What is genuinely AI

**Exactly four capabilities call a large language model.** All four use Anthropic's Claude (Sonnet), all four run on the server, and all four are restricted to ambassadors or admins. **No AI feature is exposed to ordinary users at all.**

**1. Building research (ambassadors).** An ambassador picks a building. The system sends the building's name and location to Claude with web search enabled, and asks it to research and return a structured set of facts: completion year, construction status, alternative name, functional category, typologies, architectural styles, materials, urban context, access level, access logistics, access cost, practical visitor notes, floor area, height, and storeys.

The prompt is disciplined. **Every returned fact must carry a source URL and a verbatim supporting excerpt.** The model is instructed to omit any field it could not find real evidence for, to never invent data, and to return uncertain fields not at all rather than guessing.

**The human stays in the loop, firmly.** Nothing is written automatically. The ambassador sees each proposed fact side by side with the building's current value, its source link, and the quoted excerpt, and accepts fields individually. Only accepted fields are saved. The save path re-checks server-side that the ambassador is active and that the building is inside their chapter's geography.

**2. Research queue (ambassadors).** The same research, run ahead of time. The system picks up to ten buildings in the chapter that are missing data, researches them concurrently, and parks the results in a review queue with a snapshot of current values. The ambassador arrives to pre-prepared work rather than waiting on a live call. Queue items can be applied or dismissed. **Human review is still mandatory.**

**3. Event discovery (ambassadors).** Automatic and cadenced. When any ambassador opens any Embassy page, the system checks whether their chapter's last event search is more than four days old. If so, it fires a background pipeline: three parallel Google searches via serper.dev (general events, talks and symposia, exhibitions and tours), scoped to the chapter's city and country; results merged and deduplicated by URL; the merged results handed to Claude to extract every qualifying architecture event as structured records with title, description, dates, address, the organiser's own link, the source URL, and a verbatim excerpt.

The prompt defines what qualifies (talks, exhibitions with a stated run, tours, open houses, award ceremonies) and what does not (articles, retrospectives, calls for entries, podcasts, online courses, past events, permanent installations). It instructs the model to skip any event whose start date it cannot pin to at least a day, and to include rather than omit when genuinely unsure.

Output then passes through **rule-based** filters the model does not control: anything missing a title, start date, or source is dropped; anything in the past is dropped; anything matching an existing live event by normalised title within a two-day window is flagged as a probable duplicate; anything already sitting in the review queue is skipped.

Surviving candidates land as **pending** discoveries. An ambassador reviews each one — with the source link and excerpt for verification — edits it if needed, and either publishes it, creating a real event, or discards it. **Nothing published without a human.**

**4. Event discovery (admin).** A free-text search where an admin types a query and Claude, with web search, returns up to eight real events for review.

### 5.2 What is *not* AI, despite being described as AI

**Itinerary generation is not AI.** The product's own requirements document titles this "AI Itinerary Generation." What actually runs is k-means clustering to group a collection's buildings into geographic day-clusters, followed by calls to a routing API for an optimised route per day. This is classical geometry and a maps API. There is no model, no language, no learning. It is a perfectly good feature — but it is not AI, and describing it as such in an investor context would be a misrepresentation that a technical diligence pass would catch immediately.

**Everything else is rule-based.** Popularity scoring is a formula over visit, rating, and photo counts, with tier ranks assigned by enforced percentile quotas — not a model. "People you may know" and suggested posts are database queries over the social graph and rating overlap. Search is Postgres full-text and fuzzy matching. Duplicate detection is deterministic matching. Chapter intervention flags are threshold rules. Nothing about the feed, ranking, recommendations, or search involves a model.

### 5.3 What the AI is good at today

- **Extraction over synthesis.** Every prompt asks Claude to pull structured facts out of documents it has been handed or found, not to reason or opine. This is the task class where current models are most reliable.
- **Verifiability by construction.** Every AI-produced fact carries a source URL and a verbatim excerpt. A reviewer can check any claim in seconds without leaving the screen. This is a genuinely good design and the reason the human-in-the-loop step is cheap rather than onerous.
- **Cheap when it lands.** Filling a completion year, a style, and access rules for a building takes one call and saves a volunteer a real research session.
- **Economics are measured, not guessed.** Every AI call is logged with its model, input tokens, output tokens, duration, status, the calling user, and **a computed dollar cost**. Admins have a screen for it. **[Inference]** Very few pre-revenue products instrument unit cost this precisely, and it means the marginal cost of AI-assisted contribution is a known number rather than an estimate.

### 5.4 Current limitations — stated plainly

- **The AI does not touch the consumer product.** No AI search, no AI recommendations, no AI-written descriptions, no conversational surface, no AI for regular users. If a story about AI-driven consumer experience is wanted, none of it exists.
- **Reach is capped by volunteers.** Research runs only when an ambassador triggers it, only inside their chapter. Cities without a chapter get no AI research at all. **The AI is not an autonomous catalogue-filling engine; it is an assistant to a volunteer who must already exist.** This is the single biggest constraint on the "AI fills the world's catalogue" narrative.
- **Output quality is unmeasured.** Nothing tracks how often a proposed fact is accepted versus rejected. Accept and dismiss are recorded, but no accuracy rate is computed or surfaced. There is no evaluation set, no regression test on model quality, and no measurement of whether a model change makes things better or worse.
- **Model output is parsed defensively, which tells you it has failed.** The event pipeline extracts JSON from the response with a pattern match, retries against a shrinking tail if the parse fails, and treats an unparseable response as a zero-result run. The code comments make clear these paths were written in response to real failures.
- **Cadence is coarse.** Event search runs on a four-day staleness gate per chapter, with manual override reserved to leadership. National chapters with no city are skipped entirely.
- **Third-party dependency is unhedged.** Event discovery needs both Anthropic and serper.dev. Either key missing and the feature returns a service error and does nothing. There is no fallback path.
- **The research prompt asks for taxonomy the model must guess at.** Categories, typologies, styles, materials, and context are asked for as names, then matched case-insensitively against the catalogue's taxonomy. A model naming a style slightly differently silently produces no match.

---

## 6. Integrations and ecosystem

| What it connects to | What it does | Why it matters commercially |
|---|---|---|
| **Anthropic (Claude)** | Building research with web search; event extraction | The only LLM dependency. Cost is metered per call. Concentration risk, but the workloads are portable extraction tasks. |
| **serper.dev** | Google search results for event discovery | Cheap search access without a Google contract. Free tier covers early use; a real cost line at scale. |
| **Google Maps / Places** | Location autocomplete for buildings, profiles, markers, event and explore filters | Deeply embedded in authoring and filtering. Usage-priced — a cost that scales with contribution volume. |
| **Mapbox Directions** | Optimised multi-stop routing for itineraries | The itinerary feature's engine. Usage-priced per route. |
| **OpenFreeMap + Esri satellite** | Base map tiles and an optional satellite layer | **A deliberate and valuable decision: the base map is free and open, not a metered commercial tile contract.** The map — the most-used surface — does not carry per-view cost. |
| **Wikidata** | Weekly refresh of award records, including a notability proxy | Free, structured, public data enriching a proprietary layer. A template for future enrichment. |
| **Resend** | All transactional email — welcome, credits, claims, stewardship, disputes | Owns the professional-outreach channel that the whole claim funnel depends on. |
| **Supabase** | Database, authentication, file storage, background functions, geospatial | The entire backend. The deepest platform dependency in the product. |
| **Vercel** | Hosting and delivery | Standard. |
| **Sentry / Google Analytics / Vercel Analytics** | Error tracking and usage analytics | Standard. |
| **Outbound feedback webhook** | Fires on every feedback submission | Routes user reports into whatever the team already uses. |

**Integrations that do not exist and are worth naming explicitly:** no payment provider of any kind. No accounting or invoicing. No CRM. No WhatsApp, SMS, Slack, or any messaging channel. No calendar integration — despite events with dates and RSVP states. No social login. No public API. No data export beyond a user's own CSV. No BIM, CAD, or industry-software integration. No mailing-list or marketing-automation tool.

---

## 7. Data assets

What accumulates through use, and what could become defensible.

### 7.1 The building catalogue — the base asset

Buildings with name, alternative names, aliases, precise geography with an honest precision flag, address, city, country, completion year, construction status, and a full taxonomy of category, typologies, materials, styles, and context.

**Moat quality: moderate.** Much of this exists elsewhere in some form. The taxonomy depth and consistency is better than open alternatives, but it is reproducible with effort.

### 7.2 The credits graph — **the strongest asset in the product**

Every building linked to the people and firms that made it, with role, tier, lead status, years, notes, and — crucially — **verification status and provenance**. Who added it, who moderated it, when, whether it has been contested, by whom, and why. Plus firm-to-person affiliations over time, and the identity spine of claimed people and domain-verified firms.

**Moat quality: high, and compounding.** This is the "who really made this building" graph, and it does not exist anywhere else in structured, contested, verified form. Wikipedia has prose. Firm websites have their own work only. Awards databases have winners only. Plano has the graph — and every claim and dispute makes it *more* authoritative, because each is a real-world party asserting or correcting the record about themselves. **Verification-by-adversarial-interest is very hard to replicate: a competitor cannot buy it, and can only earn it by relitigating every claim.**

### 7.3 Access intelligence — a quiet, distinctive asset

Structured, three-dimensional answers to "can I go in, how, and what does it cost," plus free-text practical notes, per building, globally.

**Moat quality: high relative to its size.** Nobody else has this in structured form. It cannot be scraped from one place; it comes from visitors and from research. It is exactly the data a travel, tourism, or cultural-institution partner would want, and it is small enough to be underrated internally.

### 7.4 Taste and behaviour

Ratings on a three-point scale, visits with dates, want-to-visit intent, hidden signals, reviews, photograph likes and comments, link votes, a follow graph with close friends, computed affinity between users, and referral attribution.

**Moat quality: conventional but real.** Standard network-effect data. Value scales with users, and today the user base is the constraint.

**Note a distinctive quality:** the three-point scale and the want-to-visit state express *intent to travel to a specific place*. That is commercially richer than a five-star rating on something already consumed.

### 7.5 The photographic archive

Community photographs per building with attribution, likes, comments, geography, an AI-generated flag, and — via the coverage tools — a precise map of where photography is missing.

**Moat quality: high and effectively unrepeatable at the margin.** Every photo is somebody physically going somewhere. It cannot be scraped, bought cheaply, or synthesised. Rights and licensing are, however, an open question (§10).

### 7.6 Coverage and gap intelligence

The product knows, structurally, **what it does not know**: which buildings lack photos, which lack a completion year or a style or a primary credit, which cities have many buildings and no chapter, which firms are unclaimed and how valuable they are by the popularity of their work, and which chapters are failing and why.

**Moat quality: strategically high, commercially underexploited.** Knowing where your gaps are and having a mechanism to close them is what turns a catalogue into a compounding one. **[Inference]** The unclaimed-firms tool, which ranks practices by the popularity of buildings they made but have not claimed, is a prioritised prospect list for a professional product — and it already exists.

### 7.7 Provenance and audit

A complete, revertible change history for every building — who changed what, when, from what to what. Plus per-user contribution timelines.

**Moat quality: enabling rather than standalone.** It makes the catalogue trustworthy and correctable, which is a precondition for institutional or licensing customers who need to know where a fact came from.

### 7.8 AI cost and performance telemetry

Every AI call with model, tokens, duration, status, user, and computed dollar cost.

**Moat quality: not a moat, but valuable.** It means the unit economics of AI-assisted data enrichment are a measured number.

### 7.9 Awards and events

A structured record of prizes, editions, categories, and recipients including shortlists — enriched from Wikidata and correctable by claim; plus an events directory with attendance intent, organiser attribution, and geography.

**Moat quality: moderate, growing with claims.** The value is in the joins: this firm, these buildings, these prizes, these events, this city.

### 7.10 The compounding join — where the real value sits

**[Inference]** The individual assets are each interesting. The defensible thing is the join across all of them: *this verified practice made these buildings in these cities, in these styles, from these materials, won these prizes, appears at these events, is photographed this well, is rated this highly by these people, and this many of them want to go.* No other single source can answer a query that crosses those dimensions. Every additional dimension makes the others more valuable, and every claim by a real professional raises the trust level of the whole graph.

---

## 8. Current state and boundaries

### 8.1 Implemented and working ✅

- **Consumer core:** signup, onboarding, landing page, waiting list, profiles, settings, data export.
- **Catalogue:** building creation, editing, full taxonomy, access model, merge, soft delete, audit history and reversion, slugs, short IDs, aliases.
- **Map:** server-side clustering, the five-rank pin ladder in both modes, approximate-location circles, the full filter drawer, URL state, saved views, sidebar.
- **Search:** unified across buildings, people, companies, users; Discover/Library modes; browse tabs; leaderboard; cross-entity nudges.
- **Library:** status tracking, three-point ratings, Kanban and list views, favourites, highlights.
- **Reviews and media:** reviews, image and video upload with client-side compression, image likes and comments, link contribution and voting.
- **Collections:** creation, five grouping methods, contributors, favourites, non-building markers, collection maps, folders.
- **Itineraries:** clustering, routing, multi-day structure, per-stop transit, route overlays. (Working — but not AI.)
- **Social:** follows, close friends, people-you-may-know, recommendations, visit-with invites, referral attribution, affinity, comparison, blocking, reporting.
- **Geography:** auto-created localities with live counts, city and country pages, geographic URLs, SEO metadata, server-generated sitemap.
- **Events:** submission, editing, claiming, attendance, geographic URLs, edition linkage.
- **Awards:** awards, editions, categories, recipients with outcomes, Wikidata sync, suggestions, claim requests, leaderboards, admin CMS.
- **Credits:** the full people/companies/credits model, person claims, domain-verified firm claims, steward invitations and requests, disputes, flagging, token-based removal, notifications, portfolios for both individuals and firms, transfer of editing authority to verified parties.
- **Embassy:** chapters, applications with review, all six contribution tools, chapter-scoped moderation with server-side enforcement, duplicate detection, goals with live progress, leaderboards, tasks, projects, team, leadership metrics, national overview, geographic membership re-validation.
- **Programme console:** health dashboard, president directory and onboarding tracker, intervention queue with dismiss and snooze, broadcasts with read tracking, performance rankings with export, campaigns, coverage and gap analysis with chapter creation.
- **Admin:** the full ~40-screen console described in §4.16.
- **AI:** all four capabilities in §5.1, with human review and cost logging.
- **Platform:** installable app, offline capability, error tracking, analytics, presence, transactional email, feedback capture with console errors and screenshots.

### 8.2 Partially built, stubbed, or degraded ⚠️

- **Admin System page** — an explicit "Coming soon" placeholder.
- **The allow-listed email table** — exists in the database, unread by the application. Signup is fully open. Any story about controlled access needs building.
- **Two admin levels** — `admin` and `app_admin` both exist and are treated identically. The distinction is unused.
- **Superadmin** — gated by an environment email list rather than a role, and exposes only a component playground.
- **Legacy architect claims** — a residual admin queue from an earlier version of the credits system, superseded by people/companies but still present.
- **Legacy fields carried for compatibility** — a deprecated single-field access enum, a deprecated tags array on reviews, and a legacy architect pointer on profiles with no relationship behind it.
- **Traces of a prior product** — the repository pivoted from what appears to have been a film product. Some legacy structures survive (a debug function referencing films, poll types including "film selection"). **These are inert, not features — but they will be visible in technical diligence and are worth being ready to explain.**
- **AI research taxonomy matching** — asks the model for free-text names, then matches them against the catalogue. Near-misses fail silently.
- **AI quality measurement** — accept/dismiss are recorded; no accuracy rate is computed anywhere.
- **Awards claim and suggestion queues** — the flows exist; the volume-handling and SLA around them is not evident.

### 8.3 What the product explicitly does **not** do ❌

**Stated plainly, because these gaps define the commercial starting position:**

- **No payments.** No payment provider, no billing tables, no prices, no plans, no subscriptions, no invoices, no receipts, no checkout, no trials, no coupons. **Nothing in the product has ever charged anyone anything.**
- **No usage limits or quotas of any kind.** No rate limits on contribution, no caps on collections, photos, itineraries, or exports. The only limits anywhere are operational: a four-day AI event-search cadence, a ten-item research queue, three admin broadcasts a day, and a twenty-member default chapter cap. **None of these are commercial gates.**
- **No feature gating.** No feature anywhere is withheld pending payment or plan. Every gate in the product is a *permission* gate (are you an admin, an ambassador, a steward), never a *commercial* one.
- **No teams, organisations, workspaces, or tenancy.** Explicitly not multi-tenant. No seats, no org accounts, no shared billing. **A B2B product would require this to be built from scratch.**
- **No public or partner API**, no data licensing mechanism, no bulk export, no embeds or widgets.
- **No advertising, sponsorship, or promoted-placement infrastructure.**
- **No consumer-facing AI.**
- **No messaging between users** — no DMs, no chat, no comment threads outside images and reviews. Social interaction is follows, ratings, recommendations, and likes only.
- **No calendar integration, ticketing, or booking** — despite events with dates and RSVP, and buildings with booking-required access.
- **No mobile app** — an installable web app only.
- **No offline map** — offline capability does not extend to map data.
- **No internationalisation** — English only, despite a global catalogue with a country-level structure.
- **No moderation queue before publication** — all moderation is retrospective. Any authenticated user can create a live building or merge two buildings immediately.
- **No revenue reporting, cost attribution, or business analytics.** The dashboards measure engagement and contribution. **The only money the product tracks anywhere is what it spends on AI.**

---

## 9. Monetization surface

**Start here: there is no monetization in the product. Not disabled, not stubbed — absent.** No payment integration, no billing schema, no plans, no gating. Everything below is analysis of where value visibly concentrates, based only on what was observed.

### 9.1 Where value is created today

1. **Professional identity.** A firm or architect gets a verified, controlled, canonical page carrying their portfolio, their statement, their prizes, and editorial authority over how their buildings are described — on a platform whose users are actively planning to go and see buildings. **The strongest signal in the entire product is that firm identity is contested: there is a formal dispute mechanism with admin escalation. People fight over things that are worth something.**
2. **Reach into intent.** Users don't just rate buildings — they mark them *want to visit*. That is pre-purchase travel intent, attached to a specific place.
3. **Access intelligence.** Structured "can I get in, how, what does it cost" data, globally, that nobody else has.
4. **The credits graph.** Structured, verified, provenance-tracked attribution that exists nowhere else.
5. **Awarding-body relationships.** Prizes are catalogued, Wikidata-enriched, claimable, and have per-award admin roles — a ready-made institutional relationship.
6. **Event organiser relationships.** Events are catalogued (increasingly by AI), claimable by organisers, and carry attendance intent.
7. **Volunteer labour.** The Embassy converts enthusiasm into structured data at near-zero marginal cost — a cost advantage rather than revenue.

### 9.2 Charging mechanisms that exist

**None.** To be precise about what would need building for each candidate path:

| Path | What already exists | What would need building |
|---|---|---|
| **Professional / firm subscription** | Claimed and verified firm identity, domain verification, stewardship with two levels, portfolio with custom ordering, editing authority, a dispute mechanism, **and a volunteer-operated pipeline of unclaimed firms ranked by value** | Payment integration, plans, gating logic, and a decision on which existing free capabilities become paid. **The go-to-market motion is already built and staffed; the till is not.** |
| **Awarding-body / institutional** | Award records, editions, categories, recipients, Wikidata enrichment, per-award admin roles, claim review | Payments; an org/tenant model; whatever the paid capability actually is |
| **Event promotion** | Events with claiming, organiser attribution, attendance intent, geographic URLs, AI-assisted discovery | Payments; promoted placement; any advertising infrastructure at all |
| **Data licensing** | The credits graph, access intelligence, taxonomy, geography, provenance and audit trail | A public API, licensing terms, export, rate limiting, contracts, **and resolution of the photo-rights question** |
| **Consumer premium** | Collections, folders, itineraries, saved views, export, deep filtering — all currently unlimited and free | Payments; quotas; a decision on what to take away or add. **Nothing is currently limited, so every gate would be a removal from existing users.** |
| **Travel / tourism partnership** | Want-to-visit intent, itineraries with real routing, non-building POIs (hotels, restaurants), access and booking-required data, city pages | Booking or affiliate integration; commercial relationships; attribution and tracking |

### 9.3 Observations that bear on pricing strategy

- **The product has been built as if free, thoroughly.** Every capability is available to everyone. There is no scarcity anywhere to convert. Introducing consumer limits would be a takeaway, not an upsell — which is a materially harder motion than launching with gates.
- **The professional side, by contrast, is monetization-ready in every respect except the payment itself.** Verified identity, tiered access, controlled portfolios, editorial authority, contested claims, and a prioritised prospect list with volunteers already working it. **[Inference] This is the shortest path from here to revenue, and the product's own construction points at it.**
- **Cost is instrumented; revenue is not.** The only financial telemetry in the entire product measures AI spend. **[Inference]** The team has thought carefully about what things cost and not yet about what things earn.
- **The base map is free and open.** The most-used surface in the product carries no per-view licensing cost — an unusual and valuable structural decision for a map product's gross margin.
- **The absence of a tenancy model is the biggest structural obstacle to any B2B path.** A firm subscription needs an account that is not a person, seats, shared billing, and an admin. Stewardship is a permission on a person's account, not an organisation. **This is real, foundational work — not a switch.**
- **The waiting list suggests the founders may already intend a gated posture. [Inference]** It sits alongside fully open signup, so its purpose is unclear (§10).

---

## 10. Open questions for the founder

Things that could not be determined from the product and that materially affect strategy.

**Business model**

1. **Has any monetization decision been made?** There is no trace of one — not a stub, not a schema, not a comment. Is this deliberate sequencing, or undecided?
2. **Who is the intended paying customer:** architecture firms, awarding bodies, event organisers, data licensees, tourism partners, or consumers? Each implies a different next build, and firm subscription is the only one that is nearly ready.
3. **If firms are the customer, what is the paid thing?** Claiming, verification, portfolio control, and editing authority are all free today. Is the plan to gate some of it (a takeaway from existing verified firms), or to build something new above it — analytics, leads, promotion?
4. **The unclaimed-firms outreach tool ranks practices by the value of their unclaimed work and has volunteers working it. Is that understood internally as a sales pipeline?** It is functionally one. If so, what happens when a firm says yes — and is a volunteer the right person to be having a commercial conversation?

**Segment and positioning**

5. **Is the consumer product the business, or the mechanism?** The engineering split says mechanism. If the investor narrative is "Letterboxd for architecture," it under-describes what has been built.
6. **Who is the primary persona today?** The product supports enthusiasts, students, professionals, curators, and social explorers. The tooling investment overwhelmingly favours contributors and professionals.
7. **What is the actual scale of the network right now?** Chapter counts, active ambassadors, buildings, claimed firms, and photo coverage are all in the live database but not knowable from the code. Every plan depends on these numbers.

**The volunteer engine**

8. **Is the Embassy sustainable, and what does it cost?** It is the core data-production process, and it is impressively built — but volunteer networks need real human management, and the intervention queue and onboarding tracker imply that churn and inactivity are already live problems. Who runs this, and what is the true cost per contribution?
9. **What is the plan for cities with no chapter?** AI research and event discovery are chapter-scoped. **No chapter means no AI enrichment at all** — so coverage is bounded by volunteer recruitment, not by AI capability. Is that intended permanently?
10. **What do ambassadors get?** Status, goals, and leaderboards are visible. Is there any material recognition, and does the model hold at scale?

**Data and rights**

11. **Who owns the photographs?** Users upload; there is an AI-generated flag but no licensing field, no rights metadata, no terms surfaced at upload. **This is the biggest single obstacle to any data-licensing path, and it gets more expensive to fix with every photo added.**
12. **Is data licensing intended?** The credits graph and access data are the most licensable assets in the product, and there is no API, no export, and no terms.
13. **What are the terms around contributed data generally?** Buildings, credits, reviews, and access notes are all community-contributed. Rights posture is not evident anywhere in the product.

**AI**

14. **How accurate is the AI research, really?** Accept and dismiss are recorded but no accuracy rate is computed. Without it there is no way to know whether the AI saves volunteer time or costs it. **This is a cheap thing to measure and an important one.**
15. **Is the intent to make AI autonomous?** Today it strictly assists a volunteer who must exist first. Removing the human would change the coverage economics fundamentally — and change the trust model just as fundamentally.
16. **Is the itinerary feature deliberately described as AI?** It is clustering plus routing. Internal documents call it "AI-powered." **This should be corrected before any diligence.**

**Product boundaries**

17. **Why a waiting list alongside open signup?** Vestige, demand measurement, or intended future gate?
18. **Why is there no pre-publication moderation?** Anyone can create a live building or merge two buildings instantly. That is a deliberate openness bet, but it is also an unbounded vandalism and quality surface, and the entire moderation apparatus is retrospective.
19. **Why no messaging?** Recommendations and visit-with invites exist, but two users who want to plan a trip together have nowhere to talk. Deliberate, or not yet built?
20. **Is a native mobile app planned?** The product is fundamentally about being physically at buildings — photographing them, logging visits — and it is a web app with no offline map.
21. **Is internationalisation planned?** The catalogue is global and structured by country; the interface is English only.
22. **What is the intended relationship with awarding bodies?** Per-award admin roles exist, implying an institutional relationship — but nothing indicates whether any exists or is sought.
23. **What is `app_admin` for?** It exists and does nothing different from `admin`.
24. **How should the prior-product history be characterised?** The repository shows a pivot from what appears to have been a film product, with inert traces remaining. Diligence will surface this; a clear account is better than a discovered one.

---

## Appendix — how to read this document against the product's other documents

The repository's own requirements document is dated March 2026 and is largely accurate on the consumer core, but it **predates or under-describes** the ambassador programme, the programme console, events, awards, the AI capabilities, and much of the credits system — all of which have grown substantially since. It also describes the technology stack in terms that no longer match what is running, and it describes itinerary generation as AI-powered when it is not.

Where this document and that one disagree, **this document follows the working product.**
