# Plano: Unified Data & API Contract

**Product:** Plano — The world's architecture, cataloged.
**Document type:** Data & API Contract
**Last updated:** March 2026
**Database:** Supabase (PostgreSQL 15 + PostGIS)

---

## Gap Analysis Summary

**No data gaps detected.** The existing schema comprehensively covers all business entities, relationships, and workflow states described in the PRD. All `⚑ DATA IMPLICATION` requirements are resolved into concrete columns, enums, and junction tables.

**Tenancy model:** Not tenant-scoped. Plano is a single-product social platform with no multi-tenancy. RLS policies use `auth.uid()` scoped to individual users, not tenants.

**Role Semantics:**

| Role | Route prefix | Post-login landing | Exclusive surfaces | Invisible entities |
|------|-------------|-------------------|-------------------|-------------------|
| `user` (default) | `/` | `/` (home feed) | — | Admin tables, admin RPCs |
| `admin` / `app_admin` | `/admin` | `/admin` (dashboard) | Admin panel, audit logs, moderation tools, deletion jobs | — (superset of user) |
| Verified architect | `/architect` | `/architect/dashboard` | Architect dashboard, privileged building editing | — (superset of user) |

---

## Auth Domain — profiles, allowed_emails

⚠️  STUB ONLY — The auth domain is documented here for reference only. `profiles` is auto-created via a `handle_new_user` database trigger on `auth.users` insertion. `allowed_emails` gates sign-up eligibility. Full schema follows below as these tables are already in production and are referenced by every other domain.

---

## 1. User Profile Domain

### Component 1: Database Schema

```sql
-- ============================================================
-- ENUM: (none — role is stored as text)
-- ============================================================

CREATE TABLE public.profiles (
  id            uuid        NOT NULL,
  username      text        CHECK (char_length(username) >= 3),
  avatar_url    text,
  bio           text,
  country       text,
  location      text,
  invited_by    text,
  role          text        DEFAULT 'user',      -- 'user' | 'admin' | 'app_admin'
  subscribed_platforms text[] DEFAULT '{}',
  favorites     jsonb       DEFAULT '[]',         -- Array of pinned building IDs
  notification_preferences jsonb DEFAULT '{}',    -- Per-type boolean toggles
  profile_sections jsonb    DEFAULT '{"favorites": false, "highlights": false}',
  verified_architect_id uuid,
  last_online   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at    timestamptz,

  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_verified_architect_id_fkey FOREIGN KEY (verified_architect_id) REFERENCES public.architects(id)
);

-- Auto-incrementing profile creation
-- Trigger: handle_new_user — fires AFTER INSERT on auth.users
-- Action: INSERT INTO profiles (id) VALUES (NEW.id)

CREATE TABLE public.allowed_emails (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  first_name text,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT allowed_emails_pkey PRIMARY KEY (id)
);

CREATE TABLE public.login_logs (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT login_logs_pkey PRIMARY KEY (id),
  CONSTRAINT login_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
```

### Component 2: Security Policies

### RLS: profiles

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (true);
  -- All profiles are publicly readable (username, avatar, bio, stats).
```

**INSERT**
```sql
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT
  WITH CHECK (id = (SELECT auth.uid()));
  -- Users can only insert their own profile row (triggered by handle_new_user).
```

**UPDATE**
```sql
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));
```

-- No DELETE policy: profiles are not deleted directly; account deletion is handled by a background job.

### RLS: allowed_emails

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "allowed_emails_select" ON allowed_emails
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))
  );
  -- Users can only check their own email's eligibility.
```

-- No INSERT/UPDATE/DELETE policy: managed by admin via service-role key in provisioning.

### RLS: login_logs

**Tenancy model:** not tenant-scoped

**INSERT**
```sql
CREATE POLICY "login_logs_insert" ON login_logs
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
```

-- No SELECT policy for regular users; admins read via is_admin().

### Component 3: API Route Registry & DTOs

| Method | Endpoint | Purpose | Runtime |
|--------|----------|---------|---------|
| GET | /profile/:username | Fetch public profile | supabase (client-side via Supabase JS) |
| GET | /profile/:username/photos | Fetch user's photo gallery | supabase (client-side) |
| PATCH | /settings | Update own profile | supabase (client-side) |
| GET | /api/export-data | Export personal data as CSV | nodejs |

No reserved static segments required for `/profile/:username` — the route is prefixed by `/profile/`.

```typescript
interface ProfileDTO {
  id: string;
  username: string;
  avatarUrl: string | null;       // Mapped: avatar_url
  bio: string | null;
  country: string | null;
  location: string | null;
  role: 'user' | 'admin' | 'app_admin';
  favorites: string[];            // Array of building UUIDs
  profileSections: {
    favorites: boolean;
    highlights: boolean;
  };
  verifiedArchitectId: string | null;  // Mapped: verified_architect_id
  lastOnline: string | null;           // ISO 8601
  createdAt: string;                   // ISO 8601
  // Computed fields (client-side via separate queries):
  buildingsVisitedCount: number;
  reviewsCount: number;
  followersCount: number;
  followingCount: number;
}

/*
Example payload:
{
  "id": "d4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8",
  "username": "archi_wanderer",
  "avatarUrl": "profile-photos/d4e5f6a7.jpg",
  "bio": "Exploring brutalism one city at a time.",
  "country": "United Kingdom",
  "location": "London",
  "role": "user",
  "favorites": ["a1b2c3d4-e5f6-7890-abcd-ef1234567890"],
  "profileSections": { "favorites": true, "highlights": false },
  "verifiedArchitectId": null,
  "lastOnline": "2026-03-28T14:30:00Z",
  "createdAt": "2025-06-15T09:00:00Z",
  "buildingsVisitedCount": 142,
  "reviewsCount": 87,
  "followersCount": 53,
  "followingCount": 31
}
*/
```

### Component 4: Input Validation (Zod Schemas) & Environment Variables

```typescript
import { z } from 'zod';

const UpdateProfileSchema = z.object({
  username: z.string().min(3).max(30).regex(
    /^[a-zA-Z0-9_]+$/,
    'Username may only contain letters, numbers, and underscores'
  ).optional(),
  bio: z.string().max(500).optional(),
  country: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  favorites: z.array(z.string().uuid()).max(10).optional(),
  profileSections: z.object({
    favorites: z.boolean(),
    highlights: z.boolean(),
  }).optional(),
  notificationPreferences: z.record(z.string(), z.boolean()).optional(),
});
```

**Environment Variable Registry:**

```
SUPABASE_URL
  Consumed by: all client-side queries
  Vercel Dashboard: required
  Supabase Vault: not required
  Notes: public, safe to expose in client bundle

SUPABASE_ANON_KEY
  Consumed by: all client-side queries
  Vercel Dashboard: required
  Supabase Vault: not required
  Notes: public, safe to expose in client bundle

SUPABASE_SERVICE_ROLE_KEY
  Consumed by: /api/export-data (server-side CSV generation)
  Vercel Dashboard: required
  Supabase Vault: not required
  Notes: RESTRICTED to admin and provisioning routes only
```

### Component 5: Storage Contract

**Bucket:** `avatars`
**Path convention:** `{userId}/{filename}`
**Access model:** Public (CDN-accessible via `supabase.storage.from('avatars').getPublicUrl()`)
**Pre-signed URL expiry:** Not applicable (public bucket).

---

## 2. Building Catalogue Domain

### Component 1: Database Schema

```sql
-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE public.location_precision AS ENUM ('exact', 'approximate');

CREATE TYPE public.building_status AS ENUM (
  'Built', 'Under Construction', 'Unbuilt', 'Demolished', 'Temporary', 'Lost'
);

-- Legacy single-field access enum (deprecated, retained for migration reference)
CREATE TYPE public.building_access AS ENUM (
  'Open Access', 'Admission Fee', 'Customers Only',
  'Appointment Only', 'Exterior View Only', 'No Access'
);

CREATE TYPE public.building_access_level AS ENUM (
  'public', 'private', 'restricted', 'commercial'
);

CREATE TYPE public.building_access_logistics AS ENUM (
  'walk-in', 'booking_required', 'tour_only', 'exterior_only'
);

CREATE TYPE public.building_access_cost AS ENUM (
  'free', 'paid', 'customers_only'
);

CREATE TYPE public.building_tier_rank AS ENUM (
  'Top 1%', 'Top 5%', 'Top 10%', 'Top 20%', 'Standard'
);

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE public.buildings (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid(),
  name                  text        NOT NULL,
  alt_name              text,
  aliases               text[]      NOT NULL DEFAULT '{}',
  slug                  text        UNIQUE,
  short_id              integer     NOT NULL DEFAULT nextval('buildings_short_id_seq') UNIQUE,
  location              geography(Point, 4326) NOT NULL,      -- PostGIS geography
  location_precision    location_precision NOT NULL DEFAULT 'exact',
  address               text,
  city                  text,
  country               text,
  year_completed        integer,
  status                building_status,
  access                building_access,                       -- Legacy; deprecated
  access_level          building_access_level,
  access_logistics      building_access_logistics,
  access_cost           building_access_cost,
  access_notes          text,
  functional_category_id uuid,
  hero_image_url        text,
  hero_image_id         uuid,
  community_preview_url text,
  architect_statement   text,
  popularity_score      integer     NOT NULL DEFAULT 0,
  tier_rank             building_tier_rank,
  source                text,
  import_id             text,
  is_deleted            boolean     DEFAULT false,
  is_verified           boolean     DEFAULT false,
  merged_into_id        uuid,
  created_by            uuid,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT buildings_pkey PRIMARY KEY (id),
  CONSTRAINT buildings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT buildings_functional_category_id_fkey FOREIGN KEY (functional_category_id) REFERENCES public.functional_categories(id),
  CONSTRAINT buildings_merged_into_id_fkey FOREIGN KEY (merged_into_id) REFERENCES public.buildings(id),
  CONSTRAINT buildings_hero_image_id_fkey FOREIGN KEY (hero_image_id) REFERENCES public.review_images(id)
);

CREATE TABLE public.building_architects (
  building_id  uuid NOT NULL,
  architect_id uuid NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT building_architects_pkey PRIMARY KEY (building_id, architect_id),
  CONSTRAINT building_architects_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id),
  CONSTRAINT building_architects_architect_id_fkey FOREIGN KEY (architect_id) REFERENCES public.architects(id)
);

CREATE TABLE public.building_attributes (
  building_id  uuid NOT NULL,
  attribute_id uuid NOT NULL,

  CONSTRAINT building_attributes_pkey PRIMARY KEY (building_id, attribute_id),
  CONSTRAINT building_attributes_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id),
  CONSTRAINT building_attributes_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES public.attributes(id)
);

CREATE TABLE public.building_styles (
  building_id uuid NOT NULL,
  style_id    uuid NOT NULL,
  created_at  timestamptz DEFAULT now(),

  CONSTRAINT building_styles_pkey PRIMARY KEY (building_id, style_id),
  CONSTRAINT building_styles_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id),
  CONSTRAINT building_styles_style_id_fkey FOREIGN KEY (style_id) REFERENCES public.architectural_styles(id)
);

CREATE TABLE public.building_functional_typologies (
  building_id  uuid NOT NULL,
  typology_id  uuid NOT NULL,

  CONSTRAINT building_functional_typologies_pkey PRIMARY KEY (building_id, typology_id),
  CONSTRAINT building_functional_typologies_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id),
  CONSTRAINT building_functional_typologies_typology_id_fkey FOREIGN KEY (typology_id) REFERENCES public.functional_typologies(id)
);

CREATE TABLE public.building_audit_logs (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  building_id  uuid NOT NULL,
  user_id      uuid,
  table_name   text NOT NULL,
  operation    text NOT NULL,         -- 'INSERT' | 'UPDATE' | 'DELETE'
  old_data     jsonb,
  new_data     jsonb,
  created_at   timestamptz DEFAULT now(),

  CONSTRAINT building_audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT building_audit_logs_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id),
  CONSTRAINT building_audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.import_buildings (
  import_id          text NOT NULL,
  name               text,
  year_completed     bigint,
  city               text,
  country            text,
  latitude           double precision,
  longitude          double precision,
  location_precision text,
  source             text,

  CONSTRAINT import_buildings_pkey PRIMARY KEY (import_id)
);
```

### Component 2: Security Policies

### RLS: buildings

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "buildings_select" ON buildings
  FOR SELECT USING (
    is_deleted = false OR is_deleted IS NULL
  );
  -- All non-deleted buildings are publicly readable.
  -- Admins can view deleted buildings via is_admin() override.
```

**INSERT**
```sql
CREATE POLICY "buildings_insert" ON buildings
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
  );
  -- Any authenticated user can create a building.
```

**UPDATE**
```sql
CREATE POLICY "buildings_update" ON buildings
  FOR UPDATE
  USING (
    created_by = (SELECT auth.uid())
    OR public.is_admin()
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    OR public.is_admin()
  );
  -- Creator or admin can update.
  -- Verified architects have additional field-level privileges
  -- enforced at the application layer via is_verified_architect_for_building().
```

-- No DELETE policy: buildings use soft-delete (is_deleted = true), not hard delete.

### RLS: building_architects

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "building_architects_select" ON building_architects
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "building_architects_insert" ON building_architects
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
```

**DELETE**
```sql
CREATE POLICY "building_architects_delete" ON building_architects
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM buildings b
      WHERE b.id = building_id
      AND (b.created_by = (SELECT auth.uid()) OR public.is_admin())
    )
  );
```

### RLS: building_attributes

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "building_attributes_select" ON building_attributes
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "building_attributes_insert" ON building_attributes
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
```

**DELETE**
```sql
CREATE POLICY "building_attributes_delete" ON building_attributes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM buildings b
      WHERE b.id = building_id
      AND (b.created_by = (SELECT auth.uid()) OR public.is_admin())
    )
  );
```

### RLS: building_styles

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "building_styles_select" ON building_styles
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "building_styles_insert" ON building_styles
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
```

**DELETE**
```sql
CREATE POLICY "building_styles_delete" ON building_styles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM buildings b
      WHERE b.id = building_id
      AND (b.created_by = (SELECT auth.uid()) OR public.is_admin())
    )
  );
```

### RLS: building_functional_typologies

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "building_functional_typologies_select" ON building_functional_typologies
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "building_functional_typologies_insert" ON building_functional_typologies
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
```

**DELETE**
```sql
CREATE POLICY "building_functional_typologies_delete" ON building_functional_typologies
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM buildings b
      WHERE b.id = building_id
      AND (b.created_by = (SELECT auth.uid()) OR public.is_admin())
    )
  );
```

### RLS: building_audit_logs

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "building_audit_logs_select" ON building_audit_logs
  FOR SELECT USING (public.is_admin());
```

**INSERT**
```sql
CREATE POLICY "building_audit_logs_insert" ON building_audit_logs
  FOR INSERT
  WITH CHECK (public.is_admin());
  -- Inserted by the log_building_changes trigger/RPC, which runs as SECURITY DEFINER.
```

-- No UPDATE/DELETE policy: audit logs are append-only.

### RLS: import_buildings

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "import_buildings_select" ON import_buildings
  FOR SELECT USING (public.is_admin());
```

-- No INSERT/UPDATE/DELETE policy for regular users: import_buildings is managed via admin batch processes.

### Component 3: API Route Registry & DTOs

| Method | Endpoint | Purpose | Runtime |
|--------|----------|---------|---------|
| GET | /building/:id/:slug | Fetch building detail | supabase (client-side) |
| POST | /building/new | Create building | supabase (client-side) |
| PATCH | /building/:id | Update building | supabase (client-side) |
| POST | /building/:id/merge | Merge duplicate buildings | supabase (RPC: `merge_buildings`) |
| GET | /api/check-slug | Check slug availability | supabase (RPC: `check_slug_availability`) |

⚠️ STATIC ROUTE REQUIRED — `/building/new` must take precedence over `/building/:id`.

```typescript
interface BuildingDTO {
  id: string;
  name: string;
  altName: string | null;                        // Mapped: alt_name
  aliases: string[];
  slug: string | null;
  shortId: number;                               // Mapped: short_id
  latitude: number;                              // Extracted: ST_Y(location)
  longitude: number;                             // Extracted: ST_X(location)
  locationPrecision: 'exact' | 'approximate';    // Mapped: location_precision
  address: string | null;
  city: string | null;
  country: string | null;
  yearCompleted: number | null;                  // Mapped: year_completed
  status: 'Built' | 'Under Construction' | 'Unbuilt' | 'Demolished' | 'Temporary' | 'Lost' | null;
  accessLevel: 'public' | 'private' | 'restricted' | 'commercial' | null;
  accessLogistics: 'walk-in' | 'booking_required' | 'tour_only' | 'exterior_only' | null;
  accessCost: 'free' | 'paid' | 'customers_only' | null;
  accessNotes: string | null;                    // Mapped: access_notes
  functionalCategoryId: string | null;           // Mapped: functional_category_id
  heroImageUrl: string | null;                   // Mapped: hero_image_url
  communityPreviewUrl: string | null;            // Mapped: community_preview_url
  architectStatement: string | null;             // Mapped: architect_statement
  popularityScore: number;                       // Mapped: popularity_score
  tierRank: 'Top 1%' | 'Top 5%' | 'Top 10%' | 'Top 20%' | 'Standard' | null;
  isVerified: boolean;                           // Mapped: is_verified
  createdBy: string | null;                      // Mapped: created_by
  createdAt: string;                             // ISO 8601
  // Joined fields (populated via separate queries or joins):
  architects: ArchitectSummaryDTO[];
  functionalCategory: { id: string; name: string; slug: string } | null;
  typologies: { id: string; name: string; slug: string }[];
  attributes: { id: string; name: string; groupSlug: string }[];
  styles: { id: string; name: string; slug: string }[];
}

interface ArchitectSummaryDTO {
  id: string;
  name: string;
  type: 'individual' | 'studio';
}

/*
Example payload:
{
  "id": "b1c2d3e4-f5a6-7890-bcde-f12345678901",
  "name": "Barbican Centre",
  "altName": "Barbican Arts Centre",
  "aliases": ["The Barbican"],
  "slug": "barbican-centre",
  "shortId": 1042,
  "latitude": 51.5200,
  "longitude": -0.0937,
  "locationPrecision": "exact",
  "address": "Silk Street, London EC2Y 8DS",
  "city": "London",
  "country": "United Kingdom",
  "yearCompleted": 1982,
  "status": "Built",
  "accessLevel": "public",
  "accessLogistics": "walk-in",
  "accessCost": "free",
  "accessNotes": "Some areas require tickets for performances.",
  "functionalCategoryId": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "heroImageUrl": "review_images/b1c2d3e4/hero.jpg",
  "communityPreviewUrl": "review_images/b1c2d3e4/preview.jpg",
  "architectStatement": null,
  "popularityScore": 847,
  "tierRank": "Top 1%",
  "isVerified": true,
  "createdBy": "d4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8",
  "createdAt": "2025-01-10T12:00:00Z",
  "architects": [
    { "id": "a1b2c3d4-0000-0000-0000-000000000001", "name": "Chamberlin, Powell and Bon", "type": "studio" }
  ],
  "functionalCategory": { "id": "c3d4e5f6-a7b8-9012-cdef-345678901234", "name": "Cultural", "slug": "cultural" },
  "typologies": [
    { "id": "t1a2b3c4-0000-0000-0000-000000000001", "name": "Arts Centre", "slug": "arts-centre" }
  ],
  "attributes": [
    { "id": "at01-0000-0000-0000-000000000001", "name": "Concrete", "groupSlug": "materiality" },
    { "id": "at02-0000-0000-0000-000000000002", "name": "Urban", "groupSlug": "context" }
  ],
  "styles": [
    { "id": "st01-0000-0000-0000-000000000001", "name": "Brutalism", "slug": "brutalism" }
  ]
}
*/
```

### Component 4: Input Validation (Zod Schemas) & Environment Variables

```typescript
import { z } from 'zod';

const CreateBuildingSchema = z.object({
  name: z.string().min(1).max(300),
  altName: z.string().max(300).optional().nullable(),
  aliases: z.array(z.string().max(200)).max(10).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locationPrecision: z.enum(['exact', 'approximate']).default('exact'),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(200).optional().nullable(),
  country: z.string().max(200).optional().nullable(),
  yearCompleted: z.number().int().min(-3000).max(2100).optional().nullable(),
  status: z.enum(['Built', 'Under Construction', 'Unbuilt', 'Demolished', 'Temporary', 'Lost']).optional().nullable(),
  accessLevel: z.enum(['public', 'private', 'restricted', 'commercial']).optional().nullable(),
  accessLogistics: z.enum(['walk-in', 'booking_required', 'tour_only', 'exterior_only']).optional().nullable(),
  accessCost: z.enum(['free', 'paid', 'customers_only']).optional().nullable(),
  accessNotes: z.string().max(1000).optional().nullable(),
  functionalCategoryId: z.string().uuid().optional().nullable(),
  architectIds: z.array(z.string().uuid()).optional(),
  typologyIds: z.array(z.string().uuid()).optional(),
  attributeIds: z.array(z.string().uuid()).optional(),
  styleIds: z.array(z.string().uuid()).optional(),
});

const UpdateBuildingSchema = CreateBuildingSchema.partial().extend({
  slug: z.string().min(1).max(300).regex(/^[a-z0-9-]+$/).optional(),
  architectStatement: z.string().max(5000).optional().nullable(),
});
```

No additional environment variables required for this domain beyond the standard Supabase connection vars.

---

## 3. Taxonomy Domain

### Component 1: Database Schema

```sql
CREATE TABLE public.functional_categories (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT functional_categories_pkey PRIMARY KEY (id)
);

CREATE TABLE public.functional_typologies (
  id                 uuid NOT NULL DEFAULT gen_random_uuid(),
  parent_category_id uuid NOT NULL,
  name               text NOT NULL,
  slug               text NOT NULL,
  created_at         timestamptz DEFAULT now(),

  CONSTRAINT functional_typologies_pkey PRIMARY KEY (id),
  CONSTRAINT functional_typologies_parent_category_id_fkey
    FOREIGN KEY (parent_category_id) REFERENCES public.functional_categories(id)
);

CREATE TABLE public.attribute_groups (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  name       text NOT NULL,               -- 'Materiality' | 'Context' | 'Style'
  slug       text NOT NULL UNIQUE,         -- 'materiality' | 'context' | 'style'
  created_at timestamptz DEFAULT now(),

  CONSTRAINT attribute_groups_pkey PRIMARY KEY (id)
);

CREATE TABLE public.attributes (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id   uuid NOT NULL,
  name       text NOT NULL,
  slug       text NOT NULL,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT attributes_pkey PRIMARY KEY (id),
  CONSTRAINT attributes_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.attribute_groups(id)
);

CREATE TABLE public.architectural_styles (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT architectural_styles_pkey PRIMARY KEY (id)
);
```

### Component 2: Security Policies

### RLS: functional_categories

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "functional_categories_select" ON functional_categories
  FOR SELECT USING (true);
```

-- No INSERT/UPDATE/DELETE policy: taxonomy data is seeded and managed by admins only.

### RLS: functional_typologies

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "functional_typologies_select" ON functional_typologies
  FOR SELECT USING (true);
```

-- No INSERT/UPDATE/DELETE policy: taxonomy data is seeded and managed by admins only.

### RLS: attribute_groups

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "attribute_groups_select" ON attribute_groups
  FOR SELECT USING (true);
```

-- No INSERT/UPDATE/DELETE policy: taxonomy data is seeded and managed by admins only.

### RLS: attributes

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "attributes_select" ON attributes
  FOR SELECT USING (true);
```

-- No INSERT/UPDATE/DELETE policy: taxonomy data is seeded and managed by admins only.

### RLS: architectural_styles

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "architectural_styles_select" ON architectural_styles
  FOR SELECT USING (true);
```

-- No INSERT/UPDATE/DELETE policy: taxonomy data is seeded and managed by admins only.

### Component 3: API Route Registry & DTOs

All taxonomy data is fetched client-side via the shared `useTaxonomy` hook with a 1-hour stale time.

| Method | Endpoint | Purpose | Runtime |
|--------|----------|---------|---------|
| GET | (client query) | Fetch all categories | supabase (client-side) |
| GET | (client query) | Fetch all typologies | supabase (client-side) |
| GET | (client query) | Fetch all attribute groups + attributes | supabase (client-side) |
| GET | (client query) | Fetch all architectural styles | supabase (client-side) |

```typescript
interface TaxonomyDTO {
  categories: FunctionalCategoryDTO[];
  typologies: FunctionalTypologyDTO[];
  attributeGroups: AttributeGroupDTO[];
  styles: ArchitecturalStyleDTO[];
}

interface FunctionalCategoryDTO {
  id: string;
  name: string;
  slug: string;
}

interface FunctionalTypologyDTO {
  id: string;
  parentCategoryId: string;    // Mapped: parent_category_id
  name: string;
  slug: string;
}

interface AttributeGroupDTO {
  id: string;
  name: string;
  slug: string;
  attributes: AttributeDTO[];  // Joined: attributes where group_id = this.id
}

interface AttributeDTO {
  id: string;
  name: string;
  slug: string;
  groupId: string;             // Mapped: group_id
}

interface ArchitecturalStyleDTO {
  id: string;
  name: string;
  slug: string;
}

/*
Example payload (TaxonomyDTO):
{
  "categories": [
    { "id": "c001-0000-0000-0000-000000000001", "name": "Cultural", "slug": "cultural" },
    { "id": "c002-0000-0000-0000-000000000002", "name": "Residential", "slug": "residential" }
  ],
  "typologies": [
    { "id": "t001-0000-0000-0000-000000000001", "parentCategoryId": "c001-0000-0000-0000-000000000001", "name": "Museum", "slug": "museum" },
    { "id": "t002-0000-0000-0000-000000000002", "parentCategoryId": "c001-0000-0000-0000-000000000001", "name": "Gallery", "slug": "gallery" }
  ],
  "attributeGroups": [
    {
      "id": "g001-0000-0000-0000-000000000001",
      "name": "Materiality",
      "slug": "materiality",
      "attributes": [
        { "id": "a001-0000-0000-0000-000000000001", "name": "Concrete", "slug": "concrete", "groupId": "g001-0000-0000-0000-000000000001" },
        { "id": "a002-0000-0000-0000-000000000002", "name": "Glass", "slug": "glass", "groupId": "g001-0000-0000-0000-000000000001" }
      ]
    }
  ],
  "styles": [
    { "id": "s001-0000-0000-0000-000000000001", "name": "Brutalism", "slug": "brutalism" }
  ]
}
*/
```

### Component 4: Input Validation (Zod Schemas) & Environment Variables

No write operations for regular users on taxonomy tables. Admin operations are performed via direct Supabase client calls.

No additional environment variables required for this domain.

---

## 4. User Library Domain (Reviews & Interactions)

### Component 1: Database Schema

```sql
CREATE TABLE public.user_buildings (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL,
  building_id uuid        NOT NULL,
  rating      integer     CHECK (rating IS NULL OR (rating >= 1 AND rating <= 3)),
  content     text,                                -- Review text
  tags        text[],                              -- Deprecated; retained for legacy data
  visibility  text        DEFAULT 'public' CHECK (visibility IN ('public', 'contacts', 'private')),
  status      text        NOT NULL DEFAULT 'visited' CHECK (status IN ('pending', 'visited', 'ignored')),
  video_url   text,
  visited_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT timezone('utc', now()),
  edited_at   timestamptz DEFAULT now(),

  CONSTRAINT user_buildings_pkey PRIMARY KEY (id),
  CONSTRAINT user_buildings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT user_buildings_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id)
);

CREATE TABLE public.likes (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL,
  interaction_id uuid NOT NULL,                    -- References user_buildings.id
  created_at     timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT likes_pkey PRIMARY KEY (id),
  CONSTRAINT likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT likes_user_building_id_fkey FOREIGN KEY (interaction_id) REFERENCES public.user_buildings(id)
);

CREATE TABLE public.comments (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL,
  interaction_id uuid NOT NULL,                    -- References user_buildings.id
  content        text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT comments_user_building_id_fkey FOREIGN KEY (interaction_id) REFERENCES public.user_buildings(id)
);

CREATE TABLE public.comment_likes (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  comment_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT comment_likes_pkey PRIMARY KEY (id),
  CONSTRAINT comment_likes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id),
  CONSTRAINT comment_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
```

### Component 2: Security Policies

### RLS: user_buildings

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "user_buildings_select" ON user_buildings
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
    OR visibility = 'public'
    OR (
      visibility = 'contacts'
      AND EXISTS (
        SELECT 1 FROM follows
        WHERE follower_id = (SELECT auth.uid())
        AND following_id = user_buildings.user_id
      )
    )
  );
```

**INSERT**
```sql
CREATE POLICY "user_buildings_insert" ON user_buildings
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**UPDATE**
```sql
CREATE POLICY "user_buildings_update" ON user_buildings
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**DELETE**
```sql
CREATE POLICY "user_buildings_delete" ON user_buildings
  FOR DELETE USING (user_id = (SELECT auth.uid()));
```

### RLS: likes

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "likes_select" ON likes
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "likes_insert" ON likes
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**DELETE**
```sql
CREATE POLICY "likes_delete" ON likes
  FOR DELETE USING (user_id = (SELECT auth.uid()));
```

-- No UPDATE policy: likes are immutable; users delete and re-create.

### RLS: comments

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "comments_select" ON comments
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "comments_insert" ON comments
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**UPDATE**
```sql
CREATE POLICY "comments_update" ON comments
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**DELETE**
```sql
CREATE POLICY "comments_delete" ON comments
  FOR DELETE USING (
    user_id = (SELECT auth.uid())
    OR public.is_admin()
  );
```

### RLS: comment_likes

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "comment_likes_select" ON comment_likes
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "comment_likes_insert" ON comment_likes
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**DELETE**
```sql
CREATE POLICY "comment_likes_delete" ON comment_likes
  FOR DELETE USING (user_id = (SELECT auth.uid()));
```

-- No UPDATE policy: comment likes are immutable.

### Component 3: API Route Registry & DTOs

| Method | Endpoint | Purpose | Runtime |
|--------|----------|---------|---------|
| GET | /review/:id | Fetch single review | supabase (client-side) |
| POST | /building/:id/review | Create/update user-building interaction | supabase (client-side) |
| PATCH | /review/:id | Update review content | supabase (client-side) |
| DELETE | /review/:id | Delete review | supabase (client-side) |
| POST | /review/:id/like | Like a review | supabase (client-side) |
| DELETE | /review/:id/like | Unlike a review | supabase (client-side) |
| POST | /review/:id/comment | Add comment | supabase (client-side) |
| GET | (RPC) get_feed | Home feed | supabase (RPC) |
| GET | (RPC) get_discovery_feed | Explore feed | supabase (RPC) |
| GET | (RPC) get_suggested_posts | Suggested content | supabase (RPC) |

```typescript
interface UserBuildingDTO {
  id: string;
  userId: string;                             // Mapped: user_id
  buildingId: string;                         // Mapped: building_id
  rating: 1 | 2 | 3 | null;
  content: string | null;
  visibility: 'public' | 'contacts' | 'private';
  status: 'pending' | 'visited' | 'ignored';
  videoUrl: string | null;                    // Mapped: video_url
  visitedAt: string | null;                   // ISO 8601; Mapped: visited_at
  createdAt: string;                          // ISO 8601
  editedAt: string;                           // ISO 8601; Mapped: edited_at
  // Joined fields:
  user: { id: string; username: string; avatarUrl: string | null };
  building: BuildingSummaryDTO;
  likesCount: number;                         // Computed: COUNT from likes
  commentsCount: number;                      // Computed: COUNT from comments
  isLikedByViewer: boolean;                   // Computed: exists in likes for current user
  images: ReviewImageDTO[];
}

interface BuildingSummaryDTO {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  country: string | null;
  heroImageUrl: string | null;
  /** Mapped: `main_image_url` on `buildings`; included on feed / `ReviewBuilding` joins from `get_feed` (hero image for activity cards). */
  mainImageUrl?: string | null;
  /** Mapped: `community_preview_url`; included in `get_feed` / `get_suggested_posts` `building_data` for feed activity-card fallback imagery. */
  communityPreviewUrl?: string | null;
  tierRank: string | null;
}

/*
Example payload:
{
  "id": "ub01-0000-0000-0000-000000000001",
  "userId": "d4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8",
  "buildingId": "b1c2d3e4-f5a6-7890-bcde-f12345678901",
  "rating": 3,
  "content": "The Barbican is an extraordinary example of brutalist civic architecture. The interlocking levels and garden courtyards create a world within a world.",
  "visibility": "public",
  "status": "visited",
  "videoUrl": null,
  "visitedAt": "2025-12-01T00:00:00Z",
  "createdAt": "2025-12-05T18:30:00Z",
  "editedAt": "2025-12-05T18:30:00Z",
  "user": {
    "id": "d4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8",
    "username": "archi_wanderer",
    "avatarUrl": "profile-photos/d4e5f6a7.jpg"
  },
  "building": {
    "id": "b1c2d3e4-f5a6-7890-bcde-f12345678901",
    "name": "Barbican Centre",
    "slug": "barbican-centre",
    "city": "London",
    "country": "United Kingdom",
    "heroImageUrl": "review_images/b1c2d3e4/hero.jpg",
    "tierRank": "Top 1%"
  },
  "likesCount": 12,
  "commentsCount": 3,
  "isLikedByViewer": true,
  "images": []
}
*/
```

### Component 4: Input Validation (Zod Schemas) & Environment Variables

```typescript
import { z } from 'zod';

const UpsertUserBuildingSchema = z.object({
  buildingId: z.string().uuid(),
  status: z.enum(['pending', 'visited', 'ignored']),
  rating: z.number().int().min(1).max(3).optional().nullable(),
  content: z.string().max(10000).optional().nullable(),
  visibility: z.enum(['public', 'contacts', 'private']).default('public'),
  videoUrl: z.string().url().optional().nullable(),
  visitedAt: z.string().datetime().optional().nullable(),
});

const CreateCommentSchema = z.object({
  interactionId: z.string().uuid(),
  content: z.string().min(1).max(2000),
});
```

No additional environment variables required for this domain.

---

## 5. Media Domain

### Component 1: Database Schema

```sql
CREATE TABLE public.review_images (
  id           uuid    NOT NULL DEFAULT gen_random_uuid(),
  review_id    uuid    NOT NULL,                  -- References user_buildings.id
  user_id      uuid    NOT NULL,
  storage_path text    NOT NULL,
  likes_count  integer DEFAULT 0,
  is_generated boolean DEFAULT false,             -- AI-generated flag
  is_official  boolean DEFAULT false,             -- Official building image
  width_px     integer,                           -- Stored file width (post client resize); null on legacy rows
  height_px    integer,                           -- Stored file height (post client resize); null on legacy rows
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT review_images_pkey PRIMARY KEY (id),
  CONSTRAINT review_images_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.user_buildings(id),
  CONSTRAINT review_images_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.image_likes (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  image_id   uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT image_likes_pkey PRIMARY KEY (id),
  CONSTRAINT image_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT image_likes_image_id_fkey FOREIGN KEY (image_id) REFERENCES public.review_images(id)
);

CREATE TABLE public.image_comments (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  image_id   uuid NOT NULL,
  content    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT image_comments_pkey PRIMARY KEY (id),
  CONSTRAINT image_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT image_comments_image_id_fkey FOREIGN KEY (image_id) REFERENCES public.review_images(id)
);

CREATE TABLE public.review_links (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  review_id  uuid NOT NULL,                       -- References user_buildings.id
  user_id    uuid NOT NULL,
  url        text NOT NULL,
  title      text,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT review_links_pkey PRIMARY KEY (id),
  CONSTRAINT review_links_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.user_buildings(id),
  CONSTRAINT review_links_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.link_likes (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  link_id    uuid NOT NULL,
  user_id    uuid NOT NULL,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT link_likes_pkey PRIMARY KEY (id),
  CONSTRAINT link_likes_link_id_fkey FOREIGN KEY (link_id) REFERENCES public.review_links(id),
  CONSTRAINT link_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
```

### Component 2: Security Policies

### RLS: review_images

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "review_images_select" ON review_images
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "review_images_insert" ON review_images
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**UPDATE**
```sql
CREATE POLICY "review_images_update" ON review_images
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**DELETE**
```sql
CREATE POLICY "review_images_delete" ON review_images
  FOR DELETE USING (
    user_id = (SELECT auth.uid())
    OR public.is_admin()
  );
```

### RLS: image_likes

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "image_likes_select" ON image_likes
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "image_likes_insert" ON image_likes
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**DELETE**
```sql
CREATE POLICY "image_likes_delete" ON image_likes
  FOR DELETE USING (user_id = (SELECT auth.uid()));
```

-- No UPDATE policy: image likes are immutable.

### RLS: image_comments

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "image_comments_select" ON image_comments
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "image_comments_insert" ON image_comments
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**DELETE**
```sql
CREATE POLICY "image_comments_delete" ON image_comments
  FOR DELETE USING (
    user_id = (SELECT auth.uid())
    OR public.is_admin()
  );
```

-- No UPDATE policy: image comments are not editable in the current product.

### RLS: review_links

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "review_links_select" ON review_links
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "review_links_insert" ON review_links
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**DELETE**
```sql
CREATE POLICY "review_links_delete" ON review_links
  FOR DELETE USING (user_id = (SELECT auth.uid()));
```

-- No UPDATE policy: links are deleted and re-created.

### RLS: link_likes

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "link_likes_select" ON link_likes
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "link_likes_insert" ON link_likes
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**DELETE**
```sql
CREATE POLICY "link_likes_delete" ON link_likes
  FOR DELETE USING (user_id = (SELECT auth.uid()));
```

-- No UPDATE policy: link likes are immutable.

### Component 3: API Route Registry & DTOs

| Method | Endpoint | Purpose | Runtime |
|--------|----------|---------|---------|
| POST | /api/generate-upload-url | Generate presigned upload URL | supabase-edge-function (requires manual JWT verification via `verify_jwt = false`) |
| POST | /api/delete-file | Delete single file from storage | supabase-edge-function |
| POST | /api/delete-storage-recursive | Recursive directory deletion | supabase-edge-function |
| POST | /api/fetch-url-metadata | Fetch OpenGraph metadata for link preview | supabase-edge-function |

```typescript
interface ReviewImageDTO {
  id: string;
  reviewId: string;           // Mapped: review_id
  userId: string;             // Mapped: user_id
  storagePath: string;        // Mapped: storage_path
  likesCount: number;         // Mapped: likes_count
  isGenerated: boolean;       // Mapped: is_generated
  isOfficial: boolean;        // Mapped: is_official
  createdAt: string;          // ISO 8601
  // Computed:
  imageUrl: string;           // Computed: resolved via supabase.storage.from('review_images').getPublicUrl()
  isLikedByViewer: boolean;   // Computed: exists in image_likes for current user
}

interface ReviewLinkDTO {
  id: string;
  reviewId: string;           // Mapped: review_id (actually building-level, keyed to any user_building for the building)
  userId: string;             // Mapped: user_id
  url: string;
  title: string | null;
  createdAt: string;          // ISO 8601
  likesCount: number;         // Computed: COUNT from link_likes
  isLikedByViewer: boolean;   // Computed: exists in link_likes for current user
}

/*
Example payload (ReviewImageDTO):
{
  "id": "img01-0000-0000-0000-000000000001",
  "reviewId": "ub01-0000-0000-0000-000000000001",
  "userId": "d4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8",
  "storagePath": "d4e5f6a7/b1c2d3e4/barbican_01.webp",
  "likesCount": 7,
  "isGenerated": false,
  "isOfficial": false,
  "createdAt": "2025-12-05T18:35:00Z",
  "imageUrl": "https://xyzproject.supabase.co/storage/v1/object/public/review_images/d4e5f6a7/b1c2d3e4/barbican_01.webp",
  "isLikedByViewer": false
}
*/

/*
Example payload (ReviewLinkDTO):
{
  "id": "lnk01-0000-0000-0000-000000000001",
  "reviewId": "ub01-0000-0000-0000-000000000001",
  "userId": "d4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8",
  "url": "https://www.archdaily.com/barbican-centre",
  "title": "Barbican Centre — ArchDaily",
  "createdAt": "2025-12-06T10:00:00Z",
  "likesCount": 4,
  "isLikedByViewer": true
}
*/
```

### Component 4: Input Validation (Zod Schemas) & Environment Variables

```typescript
import { z } from 'zod';

const CreateReviewLinkSchema = z.object({
  reviewId: z.string().uuid(),
  url: z.string().url().max(2000),
  title: z.string().max(500).optional().nullable(),
});
```

**Environment Variable Registry:**

```
SUPABASE_SERVICE_ROLE_KEY
  Consumed by: generate-upload-url, delete-file, delete-storage-recursive edge functions
  Vercel Dashboard: not required (edge functions run on Supabase)
  Supabase Vault: required
  Notes: Used for storage admin operations in edge functions with manual JWT verification

MAPBOX_ACCESS_TOKEN
  Consumed by: (not this domain — listed here for completeness in edge functions)
  Vercel Dashboard: not required
  Supabase Vault: required
  Notes: Used by calculate-route and generate-itinerary edge functions
```

### Component 5: Storage Contract

**Bucket:** `review_images`
**Path convention:** `{userId}/{buildingId}/{filename}`
**Access model:** Public (CDN-accessible via Supabase Storage public URL)
**Upload flow:** Client requests a presigned upload URL from the `generate-upload-url` edge function → client uploads directly to storage → client creates a `review_images` row with the `storage_path`.
**Pre-signed URL expiry (upload):** 15 minutes
**Pre-signed URL expiry (read):** Not applicable (public bucket)
**Deletion:** Handled by `delete-file` and `delete-storage-recursive` edge functions, plus background `deletion_jobs`.

---

## 6. Social Domain

### Component 1: Database Schema

```sql
CREATE TABLE public.follows (
  follower_id     uuid NOT NULL,
  following_id    uuid NOT NULL,
  is_close_friend boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT follows_pkey PRIMARY KEY (follower_id, following_id),
  CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.profiles(id),
  CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.recommendations (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  recommender_id  uuid NOT NULL,
  recipient_id    uuid NOT NULL,
  building_id     uuid NOT NULL,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'ignored', 'visit_with')),
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT recommendations_pkey PRIMARY KEY (id),
  CONSTRAINT recommendations_recommender_id_fkey FOREIGN KEY (recommender_id) REFERENCES public.profiles(id),
  CONSTRAINT recommendations_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id),
  CONSTRAINT recommendations_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id)
);

CREATE TABLE public.blocks (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  reason     text,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT blocks_pkey PRIMARY KEY (id),
  CONSTRAINT blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES public.profiles(id),
  CONSTRAINT blocks_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.reports (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_id uuid NOT NULL,
  reason      text NOT NULL,
  details     text,
  status      text DEFAULT 'pending',             -- 'pending' | 'reviewed' | 'resolved'
  created_at  timestamptz DEFAULT now(),

  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles(id),
  CONSTRAINT reports_reported_id_fkey FOREIGN KEY (reported_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.notifications (
  id                uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL,                -- Notification recipient
  actor_id          uuid NOT NULL,                -- User who triggered it
  type              text NOT NULL CHECK (type IN (
    'follow', 'like', 'comment', 'recommendation',
    'friend_joined', 'suggest_follow', 'visit_request',
    'architect_verification'
  )),
  resource_id       uuid,                         -- References user_buildings.id (for like/comment)
  recommendation_id uuid,
  architect_id      uuid,
  metadata          jsonb,
  is_read           boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id),
  CONSTRAINT notifications_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.user_buildings(id),
  CONSTRAINT notifications_recommendation_id_fkey FOREIGN KEY (recommendation_id) REFERENCES public.recommendations(id),
  CONSTRAINT notifications_architect_id_fkey FOREIGN KEY (architect_id) REFERENCES public.architects(id)
);

CREATE TABLE public.suggested_profile_hides (
  user_id           uuid NOT NULL,
  suggested_user_id uuid NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT suggested_profile_hides_pkey PRIMARY KEY (user_id, suggested_user_id),
  CONSTRAINT suggested_profile_hides_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT suggested_profile_hides_suggested_user_id_fkey FOREIGN KEY (suggested_user_id) REFERENCES public.profiles(id)
);
```

### Component 2: Security Policies

### RLS: follows

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "follows_select" ON follows
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "follows_insert" ON follows
  FOR INSERT
  WITH CHECK (follower_id = (SELECT auth.uid()));
```

**UPDATE**
```sql
CREATE POLICY "follows_update" ON follows
  FOR UPDATE
  USING (follower_id = (SELECT auth.uid()))
  WITH CHECK (follower_id = (SELECT auth.uid()));
  -- Allows toggling is_close_friend
```

**DELETE**
```sql
CREATE POLICY "follows_delete" ON follows
  FOR DELETE USING (follower_id = (SELECT auth.uid()));
```

### RLS: recommendations

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "recommendations_select" ON recommendations
  FOR SELECT USING (
    recommender_id = (SELECT auth.uid())
    OR recipient_id = (SELECT auth.uid())
  );
```

**INSERT**
```sql
CREATE POLICY "recommendations_insert" ON recommendations
  FOR INSERT
  WITH CHECK (recommender_id = (SELECT auth.uid()));
```

**UPDATE**
```sql
CREATE POLICY "recommendations_update" ON recommendations
  FOR UPDATE
  USING (recipient_id = (SELECT auth.uid()))
  WITH CHECK (recipient_id = (SELECT auth.uid()));
  -- Only the recipient can update status (accept/ignore).
```

-- No DELETE policy: recommendations are not deleted; they transition to 'ignored' status.

### RLS: blocks

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "blocks_select" ON blocks
  FOR SELECT USING (blocker_id = (SELECT auth.uid()));
```

**INSERT**
```sql
CREATE POLICY "blocks_insert" ON blocks
  FOR INSERT
  WITH CHECK (blocker_id = (SELECT auth.uid()));
```

**DELETE**
```sql
CREATE POLICY "blocks_delete" ON blocks
  FOR DELETE USING (blocker_id = (SELECT auth.uid()));
```

-- No UPDATE policy: blocks are immutable; unblock = delete.

### RLS: reports

**Tenancy model:** not tenant-scoped

**INSERT**
```sql
CREATE POLICY "reports_insert" ON reports
  FOR INSERT
  WITH CHECK (reporter_id = (SELECT auth.uid()));
```

**SELECT**
```sql
CREATE POLICY "reports_select" ON reports
  FOR SELECT USING (
    reporter_id = (SELECT auth.uid())
    OR public.is_admin()
  );
```

-- No UPDATE/DELETE policy for regular users: admin-managed via is_admin().

### RLS: notifications

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT USING (user_id = (SELECT auth.uid()));
```

**INSERT**
```sql
CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
  -- Any authenticated user can trigger a notification (for another user).
```

**UPDATE**
```sql
CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
  -- User can mark their own notifications as read.
```

-- No DELETE policy: notifications are not deleted by users.

### RLS: suggested_profile_hides

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "suggested_profile_hides_select" ON suggested_profile_hides
  FOR SELECT USING (user_id = (SELECT auth.uid()));
```

**INSERT**
```sql
CREATE POLICY "suggested_profile_hides_insert" ON suggested_profile_hides
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
```

-- No UPDATE/DELETE policy: hides are permanent dismissals.

### Component 3: API Route Registry & DTOs

| Method | Endpoint | Purpose | Runtime |
|--------|----------|---------|---------|
| POST | /follow/:userId | Follow a user | supabase (client-side) |
| DELETE | /follow/:userId | Unfollow a user | supabase (client-side) |
| PATCH | /follow/:userId/close-friend | Toggle close friend | supabase (client-side) |
| POST | /recommend | Send building recommendation | supabase (client-side) |
| PATCH | /recommendation/:id | Accept/ignore recommendation | supabase (client-side) |
| POST | /block/:userId | Block a user | supabase (client-side) |
| DELETE | /block/:userId | Unblock a user | supabase (client-side) |
| POST | /report | Report a user | supabase (client-side) |
| GET | /notifications | Fetch notifications | supabase (client-side) |
| PATCH | /notifications/read | Mark notifications as read | supabase (client-side) |
| GET | (RPC) get_people_you_may_know | Social suggestions | supabase (RPC) |
| GET | (RPC) get_inviter_facepile | Referral attribution | supabase (RPC) |

```typescript
interface NotificationDTO {
  id: string;
  userId: string;                  // Mapped: user_id
  actorId: string;                 // Mapped: actor_id
  type: 'follow' | 'like' | 'comment' | 'recommendation' | 'friend_joined' | 'suggest_follow' | 'visit_request' | 'architect_verification';
  resourceId: string | null;       // Mapped: resource_id (user_buildings.id)
  recommendationId: string | null; // Mapped: recommendation_id
  architectId: string | null;      // Mapped: architect_id
  metadata: Record<string, unknown> | null;
  isRead: boolean;                 // Mapped: is_read
  createdAt: string;               // ISO 8601
  // Joined:
  actor: { id: string; username: string; avatarUrl: string | null };
}

interface RecommendationDTO {
  id: string;
  recommenderId: string;           // Mapped: recommender_id
  recipientId: string;             // Mapped: recipient_id
  buildingId: string;              // Mapped: building_id
  status: 'pending' | 'accepted' | 'ignored' | 'visit_with';
  createdAt: string;               // ISO 8601
  // Joined:
  recommender: { id: string; username: string; avatarUrl: string | null };
  building: BuildingSummaryDTO;
}

/*
Example payload (NotificationDTO):
{
  "id": "notif01-0000-0000-0000-000000000001",
  "userId": "d4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8",
  "actorId": "e5f6a7b8-c9d0-4e1f-b2a3-c4d5e6f7a8b9",
  "type": "like",
  "resourceId": "ub01-0000-0000-0000-000000000001",
  "recommendationId": null,
  "architectId": null,
  "metadata": null,
  "isRead": false,
  "createdAt": "2026-03-27T09:15:00Z",
  "actor": {
    "id": "e5f6a7b8-c9d0-4e1f-b2a3-c4d5e6f7a8b9",
    "username": "concrete_soul",
    "avatarUrl": "profile-photos/e5f6a7b8.jpg"
  }
}
*/
```

### Component 4: Input Validation (Zod Schemas) & Environment Variables

```typescript
import { z } from 'zod';

const CreateRecommendationSchema = z.object({
  recipientIds: z.array(z.string().uuid()).min(1).max(20),
  buildingId: z.string().uuid(),
  status: z.enum(['pending', 'visit_with']).default('pending'),
});

const UpdateRecommendationSchema = z.object({
  status: z.enum(['accepted', 'ignored']),
});

const CreateReportSchema = z.object({
  reportedId: z.string().uuid(),
  reason: z.string().min(1).max(200),
  details: z.string().max(2000).optional().nullable(),
});

const CreateBlockSchema = z.object({
  blockedId: z.string().uuid(),
  reason: z.string().max(500).optional().nullable(),
});
```

No additional environment variables required for this domain.

---

## 7. Collections Domain

### Component 1: Database Schema

```sql
CREATE TABLE public.collections (
  id                              uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id                        uuid NOT NULL,
  name                            text NOT NULL,
  description                     text,
  slug                            text NOT NULL UNIQUE,
  is_public                       boolean NOT NULL DEFAULT false,
  show_community_images           boolean NOT NULL DEFAULT true,
  rating_mode                     text DEFAULT 'viewer'
                                  CHECK (rating_mode IN ('viewer', 'contributors_max', 'admins_max', 'member')),
  rating_source_user_id           uuid,
  categorization_method           text DEFAULT 'default'
                                  CHECK (categorization_method IN ('default', 'custom', 'status', 'rating_member', 'uniform')),
  custom_categories               jsonb DEFAULT '[]',
  categorization_selected_members uuid[],
  external_link                   text,
  itinerary                       jsonb,          -- AI-generated itinerary data
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT collections_pkey PRIMARY KEY (id),
  CONSTRAINT collections_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id),
  CONSTRAINT collections_rating_source_user_id_fkey FOREIGN KEY (rating_source_user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.collection_items (
  id                 uuid    NOT NULL DEFAULT gen_random_uuid(),
  collection_id      uuid    NOT NULL,
  building_id        uuid    NOT NULL,
  order_index        integer NOT NULL DEFAULT 0,
  note               text,
  custom_category_id text,
  is_hidden          boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT collection_items_pkey PRIMARY KEY (id),
  CONSTRAINT collection_items_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.collections(id),
  CONSTRAINT collection_items_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id)
);

CREATE TABLE public.collection_contributors (
  id            uuid NOT NULL DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL,
  user_id       uuid NOT NULL,
  role          text NOT NULL CHECK (role IN ('admin', 'editor', 'contributor', 'viewer')),
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT collection_contributors_pkey PRIMARY KEY (id),
  CONSTRAINT collection_contributors_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.collections(id),
  CONSTRAINT collection_contributors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.collection_favorites (
  id            uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  collection_id uuid NOT NULL,
  created_at    timestamptz DEFAULT now(),

  CONSTRAINT collection_favorites_pkey PRIMARY KEY (id),
  CONSTRAINT collection_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT collection_favorites_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.collections(id)
);

CREATE TABLE public.collection_markers (
  id              uuid             NOT NULL DEFAULT gen_random_uuid(),
  collection_id   uuid             NOT NULL,
  google_place_id text,
  name            text             NOT NULL,
  category        text             NOT NULL CHECK (category IN ('accommodation', 'dining', 'transport', 'attraction', 'other')),
  lat             double precision NOT NULL,
  lng             double precision NOT NULL,
  address         text,
  notes           text,
  website         text,
  created_by      uuid             NOT NULL,
  created_at      timestamptz      NOT NULL DEFAULT now(),

  CONSTRAINT collection_markers_pkey PRIMARY KEY (id),
  CONSTRAINT collection_markers_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.collections(id),
  CONSTRAINT collection_markers_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
```

### Component 2: Security Policies

### RLS: collections

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "collections_select" ON collections
  FOR SELECT USING (
    is_public = true
    OR owner_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM collection_contributors cc
      WHERE cc.collection_id = id
      AND cc.user_id = (SELECT auth.uid())
    )
  );
```

**INSERT**
```sql
CREATE POLICY "collections_insert" ON collections
  FOR INSERT
  WITH CHECK (owner_id = (SELECT auth.uid()));
```

**UPDATE**
```sql
CREATE POLICY "collections_update" ON collections
  FOR UPDATE
  USING (
    owner_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM collection_contributors cc
      WHERE cc.collection_id = id
      AND cc.user_id = (SELECT auth.uid())
      AND cc.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM collection_contributors cc
      WHERE cc.collection_id = id
      AND cc.user_id = (SELECT auth.uid())
      AND cc.role IN ('admin', 'editor')
    )
  );
```

**DELETE**
```sql
CREATE POLICY "collections_delete" ON collections
  FOR DELETE USING (owner_id = (SELECT auth.uid()));
```

### RLS: collection_items

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "collection_items_select" ON collection_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id
      AND (
        c.is_public = true
        OR c.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM collection_contributors cc
          WHERE cc.collection_id = c.id
          AND cc.user_id = (SELECT auth.uid())
        )
      )
    )
  );
```

**INSERT**
```sql
CREATE POLICY "collection_items_insert" ON collection_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id
      AND (
        c.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM collection_contributors cc
          WHERE cc.collection_id = c.id
          AND cc.user_id = (SELECT auth.uid())
          AND cc.role IN ('admin', 'editor', 'contributor')
        )
      )
    )
  );
```

**UPDATE**
```sql
CREATE POLICY "collection_items_update" ON collection_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id
      AND (
        c.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM collection_contributors cc
          WHERE cc.collection_id = c.id
          AND cc.user_id = (SELECT auth.uid())
          AND cc.role IN ('admin', 'editor')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id
      AND (
        c.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM collection_contributors cc
          WHERE cc.collection_id = c.id
          AND cc.user_id = (SELECT auth.uid())
          AND cc.role IN ('admin', 'editor')
        )
      )
    )
  );
```

**DELETE**
```sql
CREATE POLICY "collection_items_delete" ON collection_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id
      AND (
        c.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM collection_contributors cc
          WHERE cc.collection_id = c.id
          AND cc.user_id = (SELECT auth.uid())
          AND cc.role IN ('admin', 'editor')
        )
      )
    )
  );
```

### RLS: collection_contributors

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "collection_contributors_select" ON collection_contributors
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "collection_contributors_insert" ON collection_contributors
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id
      AND c.owner_id = (SELECT auth.uid())
    )
  );
  -- Only the collection owner can invite contributors.
```

**DELETE**
```sql
CREATE POLICY "collection_contributors_delete" ON collection_contributors
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id
      AND c.owner_id = (SELECT auth.uid())
    )
    OR user_id = (SELECT auth.uid())
  );
  -- Owner can remove anyone; contributor can remove themselves.
```

-- No UPDATE policy: contributor role changes require delete + re-insert.

### RLS: collection_favorites

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "collection_favorites_select" ON collection_favorites
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "collection_favorites_insert" ON collection_favorites
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**DELETE**
```sql
CREATE POLICY "collection_favorites_delete" ON collection_favorites
  FOR DELETE USING (user_id = (SELECT auth.uid()));
```

-- No UPDATE policy: favorites are immutable.

### RLS: collection_markers

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "collection_markers_select" ON collection_markers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id
      AND (
        c.is_public = true
        OR c.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM collection_contributors cc
          WHERE cc.collection_id = c.id
          AND cc.user_id = (SELECT auth.uid())
        )
      )
    )
  );
```

**INSERT**
```sql
CREATE POLICY "collection_markers_insert" ON collection_markers
  FOR INSERT
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id
      AND (
        c.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM collection_contributors cc
          WHERE cc.collection_id = c.id
          AND cc.user_id = (SELECT auth.uid())
          AND cc.role IN ('admin', 'editor', 'contributor')
        )
      )
    )
  );
```

**DELETE**
```sql
CREATE POLICY "collection_markers_delete" ON collection_markers
  FOR DELETE USING (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_id
      AND c.owner_id = (SELECT auth.uid())
    )
  );
```

### Component 3: API Route Registry & DTOs

| Method | Endpoint | Purpose | Runtime |
|--------|----------|---------|---------|
| GET | /:username/collections/:slug | Fetch collection detail | supabase (client-side) |
| POST | /collections/new | Create collection | supabase (client-side) |
| PATCH | /collections/:id | Update collection settings | supabase (client-side) |
| DELETE | /collections/:id | Delete collection | supabase (client-side) |
| POST | /collections/:id/items | Add buildings to collection | supabase (client-side) |
| DELETE | /collections/:id/items/:itemId | Remove item | supabase (client-side) |
| POST | /collections/:id/markers | Add non-building marker | supabase (client-side) |
| POST | /collections/:id/contributors | Invite contributor | supabase (client-side) |
| POST | /collections/:id/favorite | Favorite collection | supabase (client-side) |
| DELETE | /collections/:id/favorite | Unfavorite collection | supabase (client-side) |
| GET | (RPC) get_collection_stats | Collection analytics | supabase (RPC) |
| GET | (RPC) get_collection_buildings | Buildings with coordinates | supabase (RPC) |
| GET | (RPC) get_collections_feed | Collections feed (public lists from followed users) | supabase (RPC) |
| POST | (edge fn) generate-itinerary | AI itinerary generation | supabase-edge-function |
| POST | (edge fn) calculate-route | Route calculation | supabase-edge-function |

⚠️ STATIC ROUTE REQUIRED — `/collections/new` must take precedence over `/collections/:id`.

```typescript
interface CollectionDTO {
  id: string;
  ownerId: string;                      // Mapped: owner_id
  name: string;
  description: string | null;
  slug: string;
  isPublic: boolean;                    // Mapped: is_public
  showCommunityImages: boolean;         // Mapped: show_community_images
  ratingMode: 'viewer' | 'contributors_max' | 'admins_max' | 'member';
  categorizationMethod: 'default' | 'custom' | 'status' | 'rating_member' | 'uniform';
  customCategories: { id: string; label: string; color: string }[];
  externalLink: string | null;          // Mapped: external_link
  itinerary: ItineraryDTO | null;
  createdAt: string;                    // ISO 8601
  updatedAt: string;                    // ISO 8601
  // Joined:
  owner: { id: string; username: string; avatarUrl: string | null };
  itemCount: number;                    // Computed: COUNT of collection_items
  contributors: CollectionContributorDTO[];
  isFavoritedByViewer: boolean;         // Computed: exists in collection_favorites
}

interface CollectionItemDTO {
  id: string;
  collectionId: string;                 // Mapped: collection_id
  buildingId: string;                   // Mapped: building_id
  orderIndex: number;                   // Mapped: order_index
  note: string | null;
  customCategoryId: string | null;      // Mapped: custom_category_id
  isHidden: boolean;                    // Mapped: is_hidden
  createdAt: string;                    // ISO 8601
  building: BuildingSummaryDTO;
}

interface CollectionContributorDTO {
  id: string;
  userId: string;                       // Mapped: user_id
  role: 'admin' | 'editor' | 'contributor' | 'viewer';
  user: { id: string; username: string; avatarUrl: string | null };
}

/** Preview row from `get_collections_feed` buildings subquery (snake_case JSON). */
interface CollectionPreviewBuilding {
  building_id: string;
  name: string;
  main_image_url: string | null;
}

/** Raw JSON row from `get_collections_feed` RPC (snake_case). Authenticated only. */
interface RawCollectionFeedRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  updated_at: string;
  owner_id: string;
  primary_tag: string | null;
  owner: {
    username: string | null;
    avatar_url: string | null;
  };
  preview_buildings: CollectionPreviewBuilding[];
  building_count: number;
}

/** CamelCase DTO for home-feed collection cards / `useCollectionsFeed`. */
interface FeedCollection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  updatedAt: string;
  ownerId: string;
  primaryTag: string | null;
  owner: { id: string; username: string | null; avatarUrl: string | null };
  previewBuildings: Array<{
    buildingId: string;
    name: string;
    mainImageUrl: string | null;
  }>;
  buildingCount: number;
  isLiked?: boolean;
  likesCount?: number;
}

interface CollectionMarkerDTO {
  id: string;
  collectionId: string;                 // Mapped: collection_id
  googlePlaceId: string | null;         // Mapped: google_place_id
  name: string;
  category: 'accommodation' | 'dining' | 'transport' | 'attraction' | 'other';
  lat: number;
  lng: number;
  address: string | null;
  notes: string | null;
  website: string | null;
  createdAt: string;                    // ISO 8601
}

interface ItineraryDTO {
  days: ItineraryDayDTO[];
}

interface ItineraryDayDTO {
  dayNumber: number;
  title: string | null;
  description: string | null;
  transportMode: 'walking' | 'driving' | 'cycling';
  stops: ItineraryStopDTO[];
  routeGeometry: GeoJSON.LineString | null;
}

interface ItineraryStopDTO {
  buildingId: string;
  order: number;
  transit: {
    mode: 'walking' | 'driving' | 'cycling' | null;
    customInstructions: string | null;
    estimatedMinutes: number | null;
  } | null;
}

/*
Example payload (CollectionDTO):
{
  "id": "col01-0000-0000-0000-000000000001",
  "ownerId": "d4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8",
  "name": "Brutalist Gems of London",
  "description": "A curated tour of London's finest brutalist architecture.",
  "slug": "brutalist-gems-london",
  "isPublic": true,
  "showCommunityImages": true,
  "ratingMode": "viewer",
  "categorizationMethod": "custom",
  "customCategories": [
    { "id": "cat-01", "label": "Must See", "color": "#ef4444" },
    { "id": "cat-02", "label": "Worth a Detour", "color": "#f59e0b" }
  ],
  "externalLink": "https://brutalismguide.co.uk",
  "itinerary": null,
  "createdAt": "2025-11-01T10:00:00Z",
  "updatedAt": "2026-03-15T14:20:00Z",
  "owner": {
    "id": "d4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8",
    "username": "archi_wanderer",
    "avatarUrl": "profile-photos/d4e5f6a7.jpg"
  },
  "itemCount": 12,
  "contributors": [
    {
      "id": "cc01-0000-0000-0000-000000000001",
      "userId": "e5f6a7b8-c9d0-4e1f-b2a3-c4d5e6f7a8b9",
      "role": "editor",
      "user": { "id": "e5f6a7b8-c9d0-4e1f-b2a3-c4d5e6f7a8b9", "username": "concrete_soul", "avatarUrl": null }
    }
  ],
  "isFavoritedByViewer": false
}
*/
```

### Component 4: Input Validation (Zod Schemas) & Environment Variables

```typescript
import { z } from 'zod';

const CreateCollectionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  isPublic: z.boolean().default(false),
  externalLink: z.string().url().max(2000).optional().nullable(),
});

const UpdateCollectionSchema = CreateCollectionSchema.partial().extend({
  showCommunityImages: z.boolean().optional(),
  ratingMode: z.enum(['viewer', 'contributors_max', 'admins_max', 'member']).optional(),
  categorizationMethod: z.enum(['default', 'custom', 'status', 'rating_member', 'uniform']).optional(),
  customCategories: z.array(z.object({
    id: z.string().max(50),
    label: z.string().min(1).max(100),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  })).max(20).optional(),
});

const CreateCollectionItemSchema = z.object({
  buildingId: z.string().uuid(),
  note: z.string().max(1000).optional().nullable(),
  customCategoryId: z.string().max(50).optional().nullable(),
});

const CreateCollectionMarkerSchema = z.object({
  name: z.string().min(1).max(300),
  category: z.enum(['accommodation', 'dining', 'transport', 'attraction', 'other']),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  googlePlaceId: z.string().max(500).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  website: z.string().url().max(2000).optional().nullable(),
});

const GenerateItinerarySchema = z.object({
  collectionId: z.string().uuid(),
  days: z.number().int().min(1).max(14),
  transportMode: z.enum(['walking', 'driving', 'cycling']),
});
```

**Environment Variable Registry:**

```
MAPBOX_ACCESS_TOKEN
  Consumed by: calculate-route, generate-itinerary edge functions
  Vercel Dashboard: not required
  Supabase Vault: required
  Notes: Mapbox Directions API v5 access token for route calculation
```

---

## 8. Folders Domain

### Component 1: Database Schema

```sql
CREATE TABLE public.user_folders (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL,
  name        text NOT NULL,
  slug        text NOT NULL,
  description text,
  is_public   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT user_folders_pkey PRIMARY KEY (id),
  CONSTRAINT user_folders_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id)
);

CREATE TABLE public.user_folder_items (
  folder_id     uuid NOT NULL,
  collection_id uuid NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT user_folder_items_pkey PRIMARY KEY (folder_id, collection_id),
  CONSTRAINT user_folder_items_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.user_folders(id),
  CONSTRAINT user_folder_items_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.collections(id)
);
```

### Component 2: Security Policies

### RLS: user_folders

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "user_folders_select" ON user_folders
  FOR SELECT USING (
    is_public = true
    OR owner_id = (SELECT auth.uid())
  );
```

**INSERT**
```sql
CREATE POLICY "user_folders_insert" ON user_folders
  FOR INSERT
  WITH CHECK (owner_id = (SELECT auth.uid()));
```

**UPDATE**
```sql
CREATE POLICY "user_folders_update" ON user_folders
  FOR UPDATE
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));
```

**DELETE**
```sql
CREATE POLICY "user_folders_delete" ON user_folders
  FOR DELETE USING (owner_id = (SELECT auth.uid()));
```

### RLS: user_folder_items

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "user_folder_items_select" ON user_folder_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_folders f
      WHERE f.id = folder_id
      AND (f.is_public = true OR f.owner_id = (SELECT auth.uid()))
    )
  );
```

**INSERT**
```sql
CREATE POLICY "user_folder_items_insert" ON user_folder_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_folders f
      WHERE f.id = folder_id
      AND f.owner_id = (SELECT auth.uid())
    )
  );
```

**DELETE**
```sql
CREATE POLICY "user_folder_items_delete" ON user_folder_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_folders f
      WHERE f.id = folder_id
      AND f.owner_id = (SELECT auth.uid())
    )
  );
```

-- No UPDATE policy: folder items are added or removed, not updated in place.

### Component 3: API Route Registry & DTOs

| Method | Endpoint | Purpose | Runtime |
|--------|----------|---------|---------|
| GET | /:username/folders/:slug | Fetch folder contents | supabase (client-side) |
| POST | /folders/new | Create folder | supabase (client-side) |
| PATCH | /folders/:id | Update folder | supabase (client-side) |
| DELETE | /folders/:id | Delete folder | supabase (client-side) |
| POST | /folders/:id/items | Add collection to folder | supabase (client-side) |
| DELETE | /folders/:id/items/:collectionId | Remove collection from folder | supabase (client-side) |

```typescript
interface FolderDTO {
  id: string;
  ownerId: string;            // Mapped: owner_id
  name: string;
  slug: string;
  description: string | null;
  isPublic: boolean;           // Mapped: is_public
  createdAt: string;           // ISO 8601
  // Joined:
  collections: CollectionSummaryDTO[];
  collectionCount: number;     // Computed: COUNT of user_folder_items
}

interface CollectionSummaryDTO {
  id: string;
  name: string;
  slug: string;
  isPublic: boolean;
  itemCount: number;
  previewImages: string[];     // Computed: first 4 hero images from collection items
}

/*
Example payload (FolderDTO):
{
  "id": "fld01-0000-0000-0000-000000000001",
  "ownerId": "d4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8",
  "name": "European Trips",
  "slug": "european-trips",
  "description": "Collections from my architecture tours across Europe.",
  "isPublic": true,
  "createdAt": "2026-01-15T08:00:00Z",
  "collections": [
    {
      "id": "col01-0000-0000-0000-000000000001",
      "name": "Brutalist Gems of London",
      "slug": "brutalist-gems-london",
      "isPublic": true,
      "itemCount": 12,
      "previewImages": ["review_images/img1.jpg", "review_images/img2.jpg"]
    }
  ],
  "collectionCount": 3
}
*/
```

### Component 4: Input Validation (Zod Schemas) & Environment Variables

```typescript
import { z } from 'zod';

const CreateFolderSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  isPublic: z.boolean().default(true),
});

const UpdateFolderSchema = CreateFolderSchema.partial();
```

No additional environment variables required for this domain.

---

## 9. Architect Domain

### Component 1: Database Schema

```sql
-- ============================================================
-- ENUM
-- ============================================================

CREATE TYPE public.architect_type AS ENUM ('individual', 'studio');

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE public.architects (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  name         text NOT NULL UNIQUE,
  type         architect_type NOT NULL DEFAULT 'individual',
  headquarters text,
  website_url  text,
  bio          text,
  import_ref   text,
  created_by   uuid,
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT architects_pkey PRIMARY KEY (id),
  CONSTRAINT architects_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

CREATE TABLE public.architect_affiliations (
  studio_id     uuid NOT NULL,
  individual_id uuid NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT architect_affiliations_pkey PRIMARY KEY (studio_id, individual_id),
  CONSTRAINT architect_affiliations_studio_id_fkey FOREIGN KEY (studio_id) REFERENCES public.architects(id),
  CONSTRAINT architect_affiliations_individual_id_fkey FOREIGN KEY (individual_id) REFERENCES public.architects(id)
);

CREATE TABLE public.architect_claims (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  architect_id uuid NOT NULL,
  status       text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'verified', 'rejected')),
  proof_email  text NOT NULL,
  resolved_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT architect_claims_pkey PRIMARY KEY (id),
  CONSTRAINT architect_claims_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT architect_claims_architect_id_fkey FOREIGN KEY (architect_id) REFERENCES public.architects(id)
);
```

### Component 2: Security Policies

### RLS: architects

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "architects_select" ON architects
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "architects_insert" ON architects
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
```

**UPDATE**
```sql
CREATE POLICY "architects_update" ON architects
  FOR UPDATE
  USING (
    created_by = (SELECT auth.uid())
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.verified_architect_id = architects.id
    )
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.verified_architect_id = architects.id
    )
  );
```

-- No DELETE policy: architects are not deleted.

### RLS: architect_affiliations

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "architect_affiliations_select" ON architect_affiliations
  FOR SELECT USING (true);
```

**INSERT**
```sql
CREATE POLICY "architect_affiliations_insert" ON architect_affiliations
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
```

**DELETE**
```sql
CREATE POLICY "architect_affiliations_delete" ON architect_affiliations
  FOR DELETE USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
      AND (p.verified_architect_id = studio_id OR p.verified_architect_id = individual_id)
    )
  );
```

-- No UPDATE policy: affiliations are immutable junction records.

### RLS: architect_claims

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "architect_claims_select" ON architect_claims
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
    OR public.is_admin()
  );
```

**INSERT**
```sql
CREATE POLICY "architect_claims_insert" ON architect_claims
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**UPDATE**
```sql
CREATE POLICY "architect_claims_update" ON architect_claims
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
  -- Only admins can approve/reject claims via handle_architect_claim_approval RPC.
```

-- No DELETE policy: claims are not deleted; they transition to 'verified' or 'rejected'.

### Component 3: API Route Registry & DTOs

| Method | Endpoint | Purpose | Runtime |
|--------|----------|---------|---------|
| GET | /architect/:id | Fetch architect detail + portfolio | supabase (client-side) |
| POST | /architects/new | Create architect record | supabase (client-side) |
| PATCH | /architect/:id | Update architect metadata | supabase (client-side) |
| POST | /architect/:id/claim | Submit verification claim | supabase (client-side) |
| GET | /architect/dashboard | Verified architect dashboard | supabase (client-side) |
| GET | (RPC) get_architect_claim_status | Check claim status | supabase (RPC) |
| GET | (RPC) is_verified_architect_for_building | Verify architect-building link | supabase (RPC) |
| POST | (RPC) handle_architect_claim_approval | Admin: process claim | supabase (RPC, admin-only) |
| POST | (RPC) sync_verified_architect_id | Sync profile ↔ architect | supabase (RPC, trigger) |

⚠️ STATIC ROUTE REQUIRED — `/architects/new` and `/architect/dashboard` must take precedence over `/architect/:id`.

```typescript
interface ArchitectDTO {
  id: string;
  name: string;
  type: 'individual' | 'studio';
  headquarters: string | null;
  websiteUrl: string | null;       // Mapped: website_url
  bio: string | null;
  createdAt: string;               // ISO 8601
  // Joined:
  buildings: BuildingSummaryDTO[];
  affiliations: ArchitectSummaryDTO[];   // Studios for individuals, members for studios
  isClaimedByViewer: boolean;      // Computed: exists in architect_claims for current user
}

/*
Example payload:
{
  "id": "a1b2c3d4-0000-0000-0000-000000000001",
  "name": "Chamberlin, Powell and Bon",
  "type": "studio",
  "headquarters": "London, UK",
  "websiteUrl": null,
  "bio": "British architectural practice responsible for the Barbican Estate and the New Hall at Cambridge.",
  "createdAt": "2025-01-01T00:00:00Z",
  "buildings": [
    {
      "id": "b1c2d3e4-f5a6-7890-bcde-f12345678901",
      "name": "Barbican Centre",
      "slug": "barbican-centre",
      "city": "London",
      "country": "United Kingdom",
      "heroImageUrl": "review_images/b1c2d3e4/hero.jpg",
      "tierRank": "Top 1%"
    }
  ],
  "affiliations": [
    { "id": "a2b3c4d5-0000-0000-0000-000000000002", "name": "Geoffrey Powell", "type": "individual" }
  ],
  "isClaimedByViewer": false
}
*/
```

### Component 4: Input Validation (Zod Schemas) & Environment Variables

```typescript
import { z } from 'zod';

const CreateArchitectSchema = z.object({
  name: z.string().min(1).max(300),
  type: z.enum(['individual', 'studio']).default('individual'),
  headquarters: z.string().max(300).optional().nullable(),
  websiteUrl: z.string().url().max(2000).optional().nullable(),
  bio: z.string().max(5000).optional().nullable(),
});

const UpdateArchitectSchema = CreateArchitectSchema.partial();

const SubmitArchitectClaimSchema = z.object({
  architectId: z.string().uuid(),
  proofEmail: z.string().email().max(320),
});
```

No additional environment variables required for this domain.

---

## 10. Map & Discovery Domain

This domain has no dedicated tables beyond `saved_views`. All map and search functionality is powered by PostgreSQL RPCs operating on the `buildings`, `user_buildings`, and taxonomy tables defined above.

### Component 1: Database Schema

```sql
CREATE TABLE public.saved_views (
  id         uuid    NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid    NOT NULL,
  name       text    NOT NULL,
  filters    jsonb   NOT NULL DEFAULT '{}',
  is_pinned  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT saved_views_pkey PRIMARY KEY (id),
  CONSTRAINT saved_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
```

### Component 2: Security Policies

### RLS: saved_views

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "saved_views_select" ON saved_views
  FOR SELECT USING (user_id = (SELECT auth.uid()));
```

**INSERT**
```sql
CREATE POLICY "saved_views_insert" ON saved_views
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**UPDATE**
```sql
CREATE POLICY "saved_views_update" ON saved_views
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**DELETE**
```sql
CREATE POLICY "saved_views_delete" ON saved_views
  FOR DELETE USING (user_id = (SELECT auth.uid()));
```

### Component 3: API Route Registry & DTOs

| Method | Endpoint | Purpose | Runtime |
|--------|----------|---------|---------|
| GET | (RPC) get_map_clusters_v2 | Server-side clustered map data | supabase (RPC) |
| GET | (RPC) get_map_pins | Individual pin data | supabase (RPC) |
| GET | (RPC) get_buildings_list | Paginated sidebar building list | supabase (RPC) |
| GET | (RPC) find_nearby_buildings | Geographic proximity search | supabase (RPC) |
| GET | (RPC) search_buildings | Full-text + fuzzy building search | supabase (RPC) |
| GET | (RPC) get_discovery_filters | Available filter options | supabase (RPC) |
| GET | (RPC) get_building_leaderboards | Ranked building lists | supabase (RPC) |

```typescript
interface MapClusterDTO {
  clusterId: number;
  latitude: number;
  longitude: number;
  count: number;                        // Buildings in cluster
  expansionZoom: number;                // Zoom level to expand
  maxTier: string | null;               // Highest tier in cluster
}

interface MapPinDTO {
  id: string;
  name: string;
  slug: string | null;
  latitude: number;
  longitude: number;
  locationPrecision: 'exact' | 'approximate';
  tierRank: string | null;
  heroImageUrl: string | null;
  city: string | null;
  country: string | null;
  // Library mode additions:
  userRating: number | null;
  userStatus: string | null;
}

interface SavedViewDTO {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  isPinned: boolean;                    // Mapped: is_pinned
  createdAt: string;                    // ISO 8601
}

/*
Example payload (MapClusterDTO):
{
  "clusterId": 42,
  "latitude": 51.5074,
  "longitude": -0.1278,
  "count": 23,
  "expansionZoom": 14,
  "maxTier": "Top 1%"
}
*/

/*
Example payload (MapPinDTO):
{
  "id": "b1c2d3e4-f5a6-7890-bcde-f12345678901",
  "name": "Barbican Centre",
  "slug": "barbican-centre",
  "latitude": 51.5200,
  "longitude": -0.0937,
  "locationPrecision": "exact",
  "tierRank": "Top 1%",
  "heroImageUrl": "review_images/b1c2d3e4/hero.jpg",
  "city": "London",
  "country": "United Kingdom",
  "userRating": 3,
  "userStatus": "visited"
}
*/
```

### Component 4: Input Validation (Zod Schemas) & Environment Variables

```typescript
import { z } from 'zod';

const CreateSavedViewSchema = z.object({
  name: z.string().min(1).max(200),
  filters: z.record(z.string(), z.unknown()),
  isPinned: z.boolean().default(false),
});

const MapFilterSchema = z.object({
  bounds: z.object({
    north: z.number().min(-90).max(90),
    south: z.number().min(-90).max(90),
    east: z.number().min(-180).max(180),
    west: z.number().min(-180).max(180),
  }),
  zoom: z.number().min(0).max(22),
  mode: z.enum(['discover', 'library']).default('discover'),
  categoryIds: z.array(z.string().uuid()).optional(),
  typologyIds: z.array(z.string().uuid()).optional(),
  attributeIds: z.array(z.string().uuid()).optional(),
  styleIds: z.array(z.string().uuid()).optional(),
  architectIds: z.array(z.string().uuid()).optional(),
  statuses: z.array(z.enum(['Built', 'Under Construction', 'Unbuilt', 'Demolished', 'Temporary', 'Lost'])).optional(),
  accessLevels: z.array(z.enum(['public', 'private', 'restricted', 'commercial'])).optional(),
  accessLogistics: z.array(z.enum(['walk-in', 'booking_required', 'tour_only', 'exterior_only'])).optional(),
  accessCosts: z.array(z.enum(['free', 'paid', 'customers_only'])).optional(),
  minRating: z.number().int().min(0).max(3).optional(),
  minPersonalRating: z.number().int().min(1).max(3).optional(),
  hideVisited: z.boolean().optional(),
  hideSaved: z.boolean().optional(),
  hideHidden: z.boolean().optional(),
  hideWithoutImages: z.boolean().optional(),
  collectionIds: z.array(z.string().uuid()).optional(),
  folderIds: z.array(z.string().uuid()).optional(),
  contactIds: z.array(z.string().uuid()).optional(),
});
```

No additional environment variables required for this domain.

---

## 11. Admin Domain

### Component 1: Database Schema

```sql
CREATE TABLE public.admin_audit_logs (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id    uuid NOT NULL,
  action_type text NOT NULL,              -- 'merge' | 'delete' | 'edit' | 'claim_approval' | etc.
  target_type text NOT NULL,              -- 'building' | 'user' | 'architect_claim' | etc.
  target_id   text NOT NULL,
  details     jsonb,
  created_at  timestamptz DEFAULT now(),

  CONSTRAINT admin_audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT admin_audit_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id)
);

CREATE TABLE public.deletion_jobs (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  bucket_name text NOT NULL DEFAULT 'review_images',
  logs        jsonb DEFAULT '[]',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),

  CONSTRAINT deletion_jobs_pkey PRIMARY KEY (id)
);

-- Utility function used across all admin-gated policies:
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;
```

### Component 2: Security Policies

### RLS: admin_audit_logs

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "admin_audit_logs_select" ON admin_audit_logs
  FOR SELECT USING (public.is_admin());
```

**INSERT**
```sql
CREATE POLICY "admin_audit_logs_insert" ON admin_audit_logs
  FOR INSERT
  WITH CHECK (public.is_admin());
```

-- No UPDATE/DELETE policy: audit logs are append-only and immutable.

### RLS: deletion_jobs

**Tenancy model:** not tenant-scoped

**SELECT**
```sql
CREATE POLICY "deletion_jobs_select" ON deletion_jobs
  FOR SELECT USING (public.is_admin());
```

**INSERT**
```sql
CREATE POLICY "deletion_jobs_insert" ON deletion_jobs
  FOR INSERT
  WITH CHECK (public.is_admin());
```

**UPDATE**
```sql
CREATE POLICY "deletion_jobs_update" ON deletion_jobs
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
```

-- No DELETE policy: deletion jobs are not removed.

### Component 3: API Route Registry & DTOs

| Method | Endpoint | Purpose | Runtime |
|--------|----------|---------|---------|
| GET | /admin | Admin dashboard | supabase (client-side, admin guard) |
| GET | (RPC) get_admin_pulse | Dashboard pulse metrics | supabase (RPC, admin-only) |
| GET | (RPC) get_admin_trends | Activity trend data | supabase (RPC, admin-only) |
| GET | (RPC) get_admin_leaderboards | User leaderboard data | supabase (RPC, admin-only) |
| GET | (RPC) get_admin_content_stats | Content analytics | supabase (RPC, admin-only) |
| GET | (RPC) get_admin_retention | Retention analysis | supabase (RPC, admin-only) |
| GET | (RPC) get_admin_notifications | Notification analytics | supabase (RPC, admin-only) |
| GET | (RPC) get_photo_heatmap_data | Photo geographic density | supabase (RPC, admin-only) |
| POST | (RPC) merge_buildings | Merge duplicate buildings | supabase (RPC, admin-only) |
| POST | (RPC) revert_building_change | Undo a building edit | supabase (RPC, admin-only) |
| POST | (RPC) fix_orphaned_user_buildings | Data integrity repair | supabase (RPC, admin-only) |

All admin routes MUST be protected by the `AdminGuard` component that checks `profiles.role = 'admin' OR 'app_admin'`.

```typescript
interface AdminPulseDTO {
  totalUsers: number;
  newUsers24h: number;
  newUsers30d: number;
  activeUsers24h: number;
  activeUsers30d: number;
  networkDensity: number;
  totalBuildings: number;
  totalReviews: number;
  totalPhotos: number;
  pendingReports: number;
}

interface AdminAuditLogDTO {
  id: string;
  adminId: string;                 // Mapped: admin_id
  actionType: string;              // Mapped: action_type
  targetType: string;              // Mapped: target_type
  targetId: string;                // Mapped: target_id
  details: Record<string, unknown> | null;
  createdAt: string;               // ISO 8601
}

/*
Example payload (AdminPulseDTO):
{
  "totalUsers": 4823,
  "newUsers24h": 17,
  "newUsers30d": 342,
  "activeUsers24h": 891,
  "activeUsers30d": 2456,
  "networkDensity": 0.34,
  "totalBuildings": 18742,
  "totalReviews": 31204,
  "totalPhotos": 67891,
  "pendingReports": 3
}
*/
```

### Component 4: Input Validation (Zod Schemas) & Environment Variables

Admin RPCs are SECURITY DEFINER functions that internally verify `is_admin()`. No additional Zod schemas are required for admin dashboard read operations.

```
SUPABASE_SERVICE_ROLE_KEY
  Consumed by: Admin batch operations (merge, revert, deletion jobs)
  Vercel Dashboard: required
  Supabase Vault: required
  Notes: Restricted to admin-only operations. Must be registered in both Vercel Dashboard
         and Supabase Vault independently — they are separate secret stores and do not sync.
```

---

## 12. Infrastructure Domain

### Component 1: Database Schema

```sql
-- PostGIS spatial reference system (system table, not application-managed)
CREATE TABLE public.spatial_ref_sys (
  srid      integer NOT NULL CHECK (srid > 0 AND srid <= 998999),
  auth_name character varying,
  auth_srid integer,
  srtext    character varying,
  proj4text character varying,

  CONSTRAINT spatial_ref_sys_pkey PRIMARY KEY (srid)
);
-- This table is managed by PostGIS and MUST NOT be modified by application code.
```

### RPC Inventory (Cross-Domain Reference)

| Domain | Function | Auth | Description |
|--------|----------|------|-------------|
| Map | `get_map_clusters_v2` | anon | Server-side clustering with full filter support |
| Map | `get_map_pins` | anon | Individual map pin data |
| Map | `get_buildings_list` | anon | Paginated building list for sidebar |
| Map | `find_nearby_buildings` | anon | Geographic proximity search |
| Search | `search_buildings` | anon | Full-text + fuzzy building search |
| Search | `get_discovery_filters` | anon | Available filter options |
| Feed | `get_feed` | authenticated | Home feed (contacts + self) |
| Feed | `get_discovery_feed` | anon | Explore page feed |
| Feed | `get_suggested_posts` | authenticated | Algorithmically suggested content |
| Buildings | `calculate_building_score` | admin | Compute popularity score |
| Buildings | `update_building_tiers` | admin | Assign tier ranks |
| Buildings | `check_slug_availability` | authenticated | Verify slug uniqueness |
| Buildings | `merge_buildings` | admin | Merge duplicate records |
| Collections | `get_collection_stats` | authenticated | Collection analytics |
| Collections | `get_collection_buildings` | authenticated | Buildings with coordinates |
| Collections | `get_collections_feed` | authenticated | Home feed: public collections owned by followed users |
| Social | `get_people_you_may_know` | authenticated | User suggestions |
| Social | `get_inviter_facepile` | anon | Referral attribution |
| Admin | `get_admin_pulse` | admin | Dashboard metrics |
| Admin | `get_admin_trends` | admin | Activity trends |
| Admin | `get_admin_leaderboards` | admin | User leaderboards |
| Admin | `get_admin_content_stats` | admin | Content analytics |
| Admin | `get_admin_retention` | admin | Retention analysis |
| Admin | `get_admin_notifications` | admin | Notification analytics |
| Admin | `get_photo_heatmap_data` | admin | Photo density heatmap |
| Architects | `get_architect_claim_status` | authenticated | Claim review status |
| Architects | `is_verified_architect_for_building` | authenticated | Verify architect–building link |
| Architects | `handle_architect_claim_approval` | admin | Process claim approval |
| Architects | `sync_verified_architect_id` | trigger | Sync profile ↔ architect |
| Leaderboards | `get_building_leaderboards` | anon | Ranked building lists |
| Maintenance | `fix_orphaned_user_buildings` | admin | Data integrity repair |
| Maintenance | `handle_new_user` | trigger | Auto-create profile on signup |
| Audit | `log_building_changes` | trigger | Record building edit history |
| Audit | `revert_building_change` | admin | Undo a building edit |
| Storage | `trigger_delete_storage_recursive` | admin | Trigger recursive cleanup |
| Storage | `invoke_delete_storage_recursive` | admin | Execute recursive cleanup |

### Edge Function Registry

| Function | Purpose | Auth | Environment Variables |
|----------|---------|------|---------------------|
| `calculate-route` | Mapbox Directions API route calculation | manual JWT (`verify_jwt = false`) | `MAPBOX_ACCESS_TOKEN` |
| `generate-itinerary` | AI itinerary generation (k-means + routing) | manual JWT (`verify_jwt = false`) | `MAPBOX_ACCESS_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY` |
| `generate-upload-url` | Presigned upload URL generation | manual JWT (`verify_jwt = false`) | `SUPABASE_SERVICE_ROLE_KEY` |
| `delete-file` | Single file deletion from storage | manual JWT (`verify_jwt = false`) | `SUPABASE_SERVICE_ROLE_KEY` |
| `delete-storage-recursive` | Recursive directory deletion | manual JWT (`verify_jwt = false`) | `SUPABASE_SERVICE_ROLE_KEY` |
| `fetch-url-metadata` | OpenGraph metadata scraping | manual JWT (`verify_jwt = false`) | — |
| `send-welcome-email` | Branded welcome email via React Email | webhook trigger | `SUPABASE_SERVICE_ROLE_KEY` |
| `og-tags` | Crawler-facing HTML with OG/Twitter meta for shared links (`?path=…`) | none (`verify_jwt = false`); anon reads only | Optional `STORAGE_PUBLIC_URL` to absolutize relative image paths (default S3 public base) |
| `sitemap` | Dynamic `sitemap.xml` for public buildings, architects, profiles | none (`verify_jwt = false`); anon reads only | — |

### Global Environment Variable Registry

```
SUPABASE_URL
  Consumed by: all client-side queries, edge functions
  Vercel Dashboard: required
  Supabase Vault: not required (auto-available in edge functions)

SUPABASE_ANON_KEY
  Consumed by: all client-side queries
  Vercel Dashboard: required
  Supabase Vault: not required

SUPABASE_SERVICE_ROLE_KEY
  Consumed by: generate-upload-url, delete-file, delete-storage-recursive,
               generate-itinerary, send-welcome-email edge functions;
               admin batch operations
  Vercel Dashboard: required
  Supabase Vault: required
  Notes: MUST only be used in edge functions with manual JWT verification
         and admin-only operations. Using it in any other context is a blocking error.

MAPBOX_ACCESS_TOKEN
  Consumed by: calculate-route, generate-itinerary edge functions
  Vercel Dashboard: not required
  Supabase Vault: required

VITE_GA_MEASUREMENT_ID
  Consumed by: Google Analytics (client-side)
  Vercel Dashboard: required
  Supabase Vault: not required
  Notes: Public, safe to expose in client bundle

VITE_SENTRY_DSN
  Consumed by: Sentry browser SDK (`@sentry/react`) in production builds
  Vercel Dashboard: optional (empty = Sentry disabled)
  Supabase Vault: not required
  Notes: Set in deployment only; never commit real DSNs

STORAGE_PUBLIC_URL
  Consumed by: `og-tags` edge function (optional override for relative image URLs)
  Supabase Vault: optional secret for edge functions if the default public asset base differs
```
