-- Programme campaigns: central-team campaigns that appear in all chapter project boards

CREATE TABLE IF NOT EXISTS public.programme_campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  metric_type text NOT NULL CHECK (metric_type IN ('photos', 'edits', 'outreach')),
  target_value integer NOT NULL DEFAULT 1,
  chapter_scope text NOT NULL DEFAULT 'all' CHECK (chapter_scope IN ('all', 'specific')),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Join table for specific-scope campaigns
CREATE TABLE IF NOT EXISTS public.programme_campaign_chapters (
  campaign_id uuid NOT NULL REFERENCES public.programme_campaigns(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES public.ambassador_chapters(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, chapter_id)
);

-- Indexes
CREATE INDEX idx_programme_campaigns_dates ON public.programme_campaigns(start_date, end_date);
CREATE INDEX idx_programme_campaign_chapters_chapter ON public.programme_campaign_chapters(chapter_id);

-- RLS
ALTER TABLE public.programme_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programme_campaign_chapters ENABLE ROW LEVEL SECURITY;

-- Admins can manage campaigns
CREATE POLICY "Admins can manage campaigns"
  ON public.programme_campaigns
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Ambassadors can read campaigns scoped to their chapter (all-scope or specific-scope where their chapter is listed)
CREATE POLICY "Ambassadors can view relevant campaigns"
  ON public.programme_campaigns
  FOR SELECT
  TO authenticated
  USING (
    chapter_scope = 'all'
    OR EXISTS (
      SELECT 1 FROM public.programme_campaign_chapters pcc
      JOIN public.ambassador_memberships am ON am.chapter_id = pcc.chapter_id
      WHERE pcc.campaign_id = programme_campaigns.id
        AND am.user_id = (SELECT auth.uid())
        AND am.status = 'active'
    )
  );

-- Admins can manage campaign-chapter links
CREATE POLICY "Admins can manage campaign chapters"
  ON public.programme_campaign_chapters
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Ambassadors can view campaign-chapter links
CREATE POLICY "Ambassadors can view campaign chapters"
  ON public.programme_campaign_chapters
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ambassador_memberships
      WHERE user_id = (SELECT auth.uid()) AND status = 'active'
    )
  );

GRANT ALL ON public.programme_campaigns TO authenticated;
GRANT ALL ON public.programme_campaigns TO service_role;
GRANT ALL ON public.programme_campaign_chapters TO authenticated;
GRANT ALL ON public.programme_campaign_chapters TO service_role;
