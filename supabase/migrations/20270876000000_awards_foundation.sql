-- =============================================================
-- Awards Foundation (Phase 1)
-- Tables: awards, award_editions, award_categories, award_recipients
-- RLS: public SELECT, admin-only writes
-- =============================================================

-- ── awards ───────────────────────────────────────────────────
CREATE TABLE public.awards (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      TEXT NOT NULL,
  slug                      TEXT NOT NULL UNIQUE,
  description               TEXT,
  website                   TEXT,
  country                   TEXT,
  frequency                 TEXT NOT NULL DEFAULT 'annual'
                            CHECK (frequency IN ('annual','biennial','ad_hoc','other')),
  awarding_body_type        TEXT
                            CHECK (awarding_body_type IN ('company','person','organisation')),
  awarding_body_company_id  UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  awarding_body_name        TEXT,
  is_active                 BOOLEAN NOT NULL DEFAULT true,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT awards_body_set CHECK (
    awarding_body_type IS NULL
    OR awarding_body_company_id IS NOT NULL
    OR awarding_body_name IS NOT NULL
  )
);

ALTER TABLE public.awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "awards_select" ON public.awards
  FOR SELECT USING (true);

CREATE POLICY "awards_insert" ON public.awards
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "awards_update" ON public.awards
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "awards_delete" ON public.awards
  FOR DELETE USING (public.is_admin());


-- ── award_editions ───────────────────────────────────────────
CREATE TABLE public.award_editions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id          UUID NOT NULL REFERENCES public.awards(id) ON DELETE CASCADE,
  year              INTEGER,
  edition_date      DATE,
  ceremony_location TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT award_editions_year_or_date CHECK (
    year IS NOT NULL OR edition_date IS NOT NULL
  )
);

CREATE INDEX award_editions_award_id_idx ON public.award_editions(award_id);
CREATE INDEX award_editions_year_idx     ON public.award_editions(year DESC);

ALTER TABLE public.award_editions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "award_editions_select" ON public.award_editions
  FOR SELECT USING (true);

CREATE POLICY "award_editions_insert" ON public.award_editions
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "award_editions_update" ON public.award_editions
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "award_editions_delete" ON public.award_editions
  FOR DELETE USING (public.is_admin());


-- ── award_categories ─────────────────────────────────────────
CREATE TABLE public.award_categories (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id              UUID NOT NULL REFERENCES public.awards(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  description           TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  valid_from_edition_id UUID REFERENCES public.award_editions(id) ON DELETE SET NULL,
  valid_to_edition_id   UUID REFERENCES public.award_editions(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX award_categories_award_id_idx ON public.award_categories(award_id);

ALTER TABLE public.award_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "award_categories_select" ON public.award_categories
  FOR SELECT USING (true);

CREATE POLICY "award_categories_insert" ON public.award_categories
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "award_categories_update" ON public.award_categories
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "award_categories_delete" ON public.award_categories
  FOR DELETE USING (public.is_admin());


-- ── award_recipients ─────────────────────────────────────────
CREATE TABLE public.award_recipients (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id            UUID NOT NULL REFERENCES public.award_editions(id) ON DELETE CASCADE,
  category_id           UUID NOT NULL REFERENCES public.award_categories(id) ON DELETE CASCADE,
  recipient_type        TEXT NOT NULL
                        CHECK (recipient_type IN ('building','person','company')),
  recipient_building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE,
  recipient_person_id   UUID REFERENCES public.people(id) ON DELETE CASCADE,
  recipient_company_id  UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  outcome               TEXT NOT NULL DEFAULT 'winner'
                        CHECK (outcome IN (
                          'winner','finalist','shortlisted','longlisted',
                          'nominated','commended','highly_commended','special_mention'
                        )),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT award_recipients_single_target CHECK (
    (recipient_building_id IS NOT NULL)::INT +
    (recipient_person_id   IS NOT NULL)::INT +
    (recipient_company_id  IS NOT NULL)::INT = 1
  ),
  CONSTRAINT award_recipients_type_fk_agreement CHECK (
    (recipient_type = 'building' AND recipient_building_id IS NOT NULL) OR
    (recipient_type = 'person'   AND recipient_person_id   IS NOT NULL) OR
    (recipient_type = 'company'  AND recipient_company_id  IS NOT NULL)
  )
);

CREATE INDEX award_recipients_edition_id_idx   ON public.award_recipients(edition_id);
CREATE INDEX award_recipients_category_id_idx  ON public.award_recipients(category_id);
CREATE INDEX award_recipients_building_id_idx  ON public.award_recipients(recipient_building_id);
CREATE INDEX award_recipients_person_id_idx    ON public.award_recipients(recipient_person_id);
CREATE INDEX award_recipients_company_id_idx   ON public.award_recipients(recipient_company_id);
CREATE INDEX award_recipients_outcome_idx      ON public.award_recipients(outcome);

ALTER TABLE public.award_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "award_recipients_select" ON public.award_recipients
  FOR SELECT USING (true);

CREATE POLICY "award_recipients_insert" ON public.award_recipients
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "award_recipients_update" ON public.award_recipients
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "award_recipients_delete" ON public.award_recipients
  FOR DELETE USING (public.is_admin());
