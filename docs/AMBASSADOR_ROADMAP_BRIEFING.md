# Plano — Ambassador Programme: Briefing for Roadmap Planning

This document is a self-contained briefing for planning the roadmap of the Plano ambassador programme. It covers product vision, core data model, what is already built, and the full catalogue of tasks ambassadors could eventually perform. It does not include code.

---

## 1. What Plano is

**Plano** is being built to become the definitive global catalogue of architecture — the IMDB for buildings. The tagline is *"The world's architecture, cataloged."*

The core loop is: discover buildings on a map or feed → log visits and rate them → write reviews → follow others with similar taste → explore curated collections and itineraries.

The catalogue itself is the foundation. Without rich, accurate, well-photographed building data, the rest of the product has nothing to work with. That is why the ambassador programme exists.

### Target user personas

| Persona | Core need |
|---|---|
| The Enthusiast | A personal log of every building visited, like Letterboxd for architecture |
| The Student / Researcher | A comprehensive, browsable catalogue with taxonomy, style, and attribution data |
| The Practising Architect | A professional profile page with a verified portfolio of their credited buildings |
| The Curator | Tools to build themed collections and multi-day itineraries |
| The Social Explorer | A feed of what friends and followed architects are visiting |

---

## 2. The core data model

These are the main entities and how they relate. Understanding this is essential for reasoning about what ambassador tasks produce and what they unlock.

### Buildings
The central entity. Key fields:
- Name, alternative name, aliases (for searchability)
- City, country, address, GPS coordinates (PostGIS point), location precision (`exact` or `approximate`)
- Year completed
- Construction status: `Built`, `Under Construction`, `Unbuilt`, `Lost`, `Temporary`
- Functional category (e.g. Cultural, Residential, Religious) and typologies (e.g. Museum, Housing Block)
- Architectural attributes: style (e.g. Brutalism, Art Deco), materials (e.g. Concrete, Glass), context (e.g. Urban, Waterfront)
- Access information: access level (`public` / `private` / `restricted`), logistics (`walk-in` / `booking_required` / `tour_only`), cost (`free` / `paid`)
- Hero image URL + photo gallery
- Architect statement (editable only by the credited architect or admin)
- Popularity score + tier rank (Top 1% / Top 5% / Top 10% / Top 20% / Standard) — computed from visit count, rating count, and photo count
- Slug for clean URLs (`/building/:id/:slug`)

### People
Individual architectural practitioners. Separate from user accounts; a user can *claim* a person profile to verify their identity.
- Name, bio, nationality, slug
- Linked to buildings via `building_credits`
- `claim_status`: `unclaimed` / `pending` / `verified`
- A claimed person gains the right to edit official fields on their credited buildings (name, year, city, country, architect statement)

### Companies
Architecture firms and studios.
- Name, bio, country, website, slug
- Also linked to buildings via `building_credits`
- `claim_status`: `unclaimed` / `pending` / `verified`
- Claimed via work-email verification
- A *steward* (a user who manages the company profile) can edit company fields and official building data

### Building credits (`building_credits`)
The junction between buildings and people/companies. Each row has:
- A reference to either a person or a company (not both)
- A role (e.g. `design_architect`, `project_architect`, `structural_engineer`, `interior_designer`)
- A tier: `primary` / `secondary`
- Status: `active` / `verified` / `hidden`
- Optional years and notes

This is the table that answers "who built this building."

### Localities
Geographic reference data. Cities and towns with `city`, `country`, `country_code`. Buildings can reference a `locality_id`. Chapters also reference localities.

### User buildings (`user_buildings`)
The relationship between a user and a building:
- Status: `visited` / `pending` (bucket list) / `ignored`
- Rating: 1 (Impressive), 2 (Essential), 3 (Masterpiece)
- Review content, visit date
- Images and video

### Collections
User-curated lists of buildings. Can be public or private. Support five organisation methods (default, custom categories, by status, by rating). Collections can have collaborators (editors). Each collection can have a generated multi-day itinerary with routes.

### Profiles
User accounts. Key fields: username, avatar, bio, location, country, role (`user` / `admin` / `app_admin`). Location is used to determine chapter membership eligibility.

---

## 3. The ambassador programme — structure

Ambassadors are volunteer contributors organised into geographic *chapters*. The programme has two chapter types and three membership roles.

### Chapter types

| Type | Description |
|---|---|
| `local` | A city-level chapter, tied to a specific locality |
| `national` | A country-level chapter; local chapters point at their national chapter as `parent_chapter_id` |

Each chapter has:
- A name, type, status (`active` / `forming` / `inactive`)
- A `max_ambassadors` cap (default 20)
- For local chapters: a `locality_id`
- For both types: a `country_code`

### Membership roles

| Role | Permissions |
|---|---|
| `ambassador` | Access to Embassy task feed (chapter's building gaps), can contribute data and photos |
| `exco` | Same as ambassador + can see Leadership tab, view member activity, review applications. Each ExCo member has a `exco_responsibility`: one of `content`, `marketing`, `architect_relations`, `data_quality`, `community` |
| `president` | Everything ExCo can do + can invite new members, update existing memberships, manage roles and statuses |

A national chapter president also gets a **National overview** tab showing all local child chapters with their activity metrics.

### Membership lifecycle

```
User applies (BecomeAmbassador page)
    → application row created (status: pending)
    → notification sent to chapter president + ExCo
    
Chapter leader reviews application (Embassy → Applications tab)
    → Approve: membership row created (status: active)
                notification sent to applicant
    → Reject: application closed with optional note
              notification sent to applicant

Member updates profile location
    → system checks if location still matches chapter
    → if not: membership flagged (status: pending_review)
              notification sent to chapter president + ExCo
    → chapter leader reactivates or closes membership
```

### Membership statuses

| Status | Meaning |
|---|---|
| `active` | Full access to Embassy and Portal |
| `pending_review` | Access to Embassy/Portal preserved but tasks locked; awaiting leadership review (triggered by location change) |
| `inactive` | Deactivated; no access |

### One membership per user
A user can only belong to one chapter at a time. This is enforced at the database level.

---

## 4. The two ambassador-facing surfaces

### The Embassy (`/embassy`)
The working tool. Gated — requires an active or pending-review membership. Contains:

**For all ambassadors (Tasks tab):**
- **Buildings without photos** — buildings in the chapter's geographic scope that have no images at all, sorted by popularity score (highest-impact first)
- **Incomplete building data** — buildings missing one or more of: year completed, architectural style, primary design architect credit
- **Unclaimed firms** — architecture companies with buildings in chapter scope that haven't claimed their profile
- **Recently added buildings** — buildings added to the catalogue in the last 30 days, flagged for review and enrichment
- **Your contributions** — the ambassador's personal audit timeline of building edits

**For chapter leaders only (Leadership tab):**
- Chapter metrics: total edits, photos added, building visits in the last 30 days vs the preceding period (for trend comparison)
- Per-member activity: edits and photos per ambassador, last active date
- Member directory with contact emails
- Ability to invite new members (by searching existing users by username) and to update existing membership roles and statuses

**For leaders only (Applications tab):**
- List of pending applications with applicant username, avatar, and motivation text
- Approve / Reject with optional note

**For national chapter president only (National overview tab):**
- Table of all active local child chapters with: member count, chapter president name, edits and photos in last 30 days, last activity date

### The Ambassador Portal (`/ambassador-portal`)
A lighter, informational surface. Also gated. Contains:
- The ambassador's role badge and chapter name
- Four action cards linking to the most common contribution paths
- A resources section (links to Embassy, profile settings, programme overview)
- A direct message form to the Plano central team (goes through the feedback API, tagged with the ambassador's role and chapter)
- A profile reminder (chapter membership is verified against profile location)

---

## 5. What is already built

The programme currently has six implemented phases:

| Phase | What it delivered |
|---|---|
| Foundation | `ambassador_chapters` and `ambassador_memberships` schema, RLS, admin CRUD at `/admin/ambassadors`, ambassador badge on public profiles |
| Applications | `ambassador_applications` table, `submit_ambassador_application` RPC, `review_ambassador_application` RPC, `BecomeAmbassador` public page, application notifications |
| Task feed | Embassy task feed RPCs (no-photos, missing-metadata, unclaimed-firms, recent-buildings, my-audit-timeline), Embassy page with task UI |
| Leadership | Leadership tab (metrics, activity, member directory), president invite/update RPCs |
| National overview + admin coverage | National overview tab for national chapter presidents, `get_admin_ambassador_locality_coverage` and `get_admin_ambassador_program_stats` for Plano admin |
| Location review | `sync_ambassador_membership_after_profile_geography` RPC — automatically flags membership for review when an ambassador updates their profile location to a different city/country |

The admin panel (`/admin/ambassadors`) allows Plano staff to:
- Create and manage chapters (name, type, locality, country code, status, ambassador cap)
- View and manage all memberships within a chapter (add by username, change role, change status, remove)
- View all pending applications across all chapters
- View a locality coverage map (every city in the database with its building count and whether a chapter exists for it)
- View programme-wide stats (total active memberships, pending applications, chapters by status, members by country)

---

## 6. The full task catalogue

This is what ambassadors could eventually do — the vision, not just what's supported today. These are the input for roadmap planning.

### Data completeness
- Add missing buildings to the catalogue
- Complete missing metadata: year, style, materials, typology, functional category
- Verify and correct inaccurate data against authoritative sources
- Improve location precision (walking to a building to confirm exact GPS)
- Update construction status (Built → Lost for demolitions; Under Construction → Built for completions)
- Add alternative names and local-language spellings
- Document unbuilt projects and demolished buildings (status = Unbuilt / Lost)
- Add external reference links (articles, heritage listings, documentaries)
- Identify and initiate merges of duplicate building entries
- Complete access information (is it really open to the public? booking required? free entry?)

### Photography
- Photograph buildings with no images (the highest-priority task)
- Improve photo quality on poorly-documented buildings
- Capture interior shots for publicly accessible buildings
- Seasonal and time-of-day photography for major landmarks
- Document construction progress for buildings with `Under Construction` status
- Flag low-quality or misattributed photos for removal

### Architect and firm data
- Identify unclaimed person profiles and reach out to those architects
- Verify and correct building attributions
- Add missing people and companies
- Verify biographical data (nationality, education, active period)
- Help firms discover and claim their company profiles

### Translation and localisation
- Add correct local-language building names as aliases
- Write building descriptions in the local language
- Translate UI strings (future capability)
- Contextualise local architectural movements for international users

### Community and outreach
- Welcome new members in the chapter's city
- Invite architects, firms, and architecture school communities to join
- Reach out to heritage organisations for data partnerships
- Review and approve chapter membership applications (leaders only)
- Mentor newly joined ambassadors

### Curation
- Build city and neighbourhood collections ("10 Essential Buildings of Porto")
- Create architecture walk itineraries using the itinerary tools
- Identify and document "hidden gems" — significant but under-known buildings
- Write thematic collections for local architectural movements

### Quality assurance
- Periodic spot-checks of buildings in the chapter's geographic scope
- Flag problematic, incorrect, or low-quality content
- Cross-reference against official heritage registers

### Events and real-world presence
- Organise group architecture walks and photo days (planned against the Embassy task list)
- Host meet-ups for local architecture enthusiasts
- Partner with architecture festivals, open house events, and biennales
- Document significant architectural events (openings, demolitions) in the platform

### Chapter leadership
- Coordinate chapter priorities using the Embassy dashboard
- Handle location-change membership reviews
- Communicate chapter news and issues to the central Plano team
- Build and sustain chapter culture and engagement

---

## 7. Key constraints and principles

These matter for any roadmap decision:

**Geographic scoping.** A chapter's scope is defined precisely in the database: local chapters match by `locality_id`; national chapters match by `country_code`. All task-feed RPCs and leadership metrics filter by this scope. New task types need to follow the same scoping logic.

**One membership per user.** A user cannot be in two chapters simultaneously. This shapes how cross-chapter collaboration works — it can only happen at the national level.

**Ambassador capacity cap.** Chapters have a `max_ambassadors` limit. The approve-application flow enforces this. If a chapter is full, applications can still be received but cannot be approved until capacity opens.

**Contributions are currently unstructured.** The existing task feed surfaces *what needs doing* and links to the building edit page. There is no concept of a task being "claimed" or "completed" by a specific ambassador. Contributions are inferred from the audit log after the fact.

**Activity tracking is audit-log-derived.** The metrics for edits and photos added come from `building_audit_logs`. Photo additions are detected by the `hero_image_url` column becoming non-empty. This is a proxy — richer contribution tracking would require more explicit instrumentation.

**The reward structure is currently zero.** Ambassadors have a role badge on their public profile and access to the Embassy/Portal. There are no points, leaderboards, streaks, or public contribution counts visible to the community.

**Access to building editing is open.** Any authenticated user can edit any building (subject to specific fields being restricted to credited professionals). Ambassadors do not have any special editing permissions beyond regular users — their value is in knowing what to edit and being motivated to do it.

---

## 8. Surfaces and routes (reference)

| Surface | Route | Access |
|---|---|---|
| Become Ambassador | `/become-ambassador` | Public |
| Ambassador Portal | `/ambassador-portal` | Active or pending-review ambassador |
| Embassy | `/embassy` | Active or pending-review ambassador |
| Admin: Chapters | `/admin/ambassadors` | Plano admin |
| Admin: Applications | `/admin/ambassadors/applications` | Plano admin |
| Admin: Coverage map | `/admin/ambassadors/coverage` | Plano admin |
| Admin: Chapter detail | `/admin/ambassadors/:chapterId` | Plano admin |
| Building edit | `/building/:id/:slug/edit` | Creator, credited professional, or any auth user (non-official fields) |
| Company profile | `/company/:slug` | Public |
| Person profile | `/person/:slug` | Public |

---

## 9. Notification types currently in use (ambassador-related)

| Type | Recipient | Trigger |
|---|---|---|
| `ambassador_application_received` | Chapter president + ExCo | New application submitted |
| `ambassador_application_approved` | Applicant | Application approved |
| `ambassador_application_rejected` | Applicant | Application rejected |
| `ambassador_membership_review` | Chapter president + ExCo | Member's profile location no longer matches chapter |

---

## 10. What the roadmap exercise should produce

The goal is a phased roadmap that answers:

1. **What ambassador tasks should be supported with dedicated product features** (beyond the current generic "edit this building" link), and in what order?
2. **What motivates and retains volunteer ambassadors** — what recognition, feedback loops, and community features does the programme need to not rely purely on intrinsic motivation?
3. **What does the chapter leadership experience need** to coordinate a distributed team of volunteers effectively?
4. **How does the programme scale** from a handful of beta chapters to hundreds of chapters globally, including in languages and contexts very different from the founding team's?
5. **Where does the programme connect back to the core product** — how do ambassador contributions visibly improve the experience for regular Plano users, and how does that virtuous cycle get communicated?

The task catalogue in section 6 is the raw material. The roadmap should sequence these into coherent phases with clear rationale for ordering.
