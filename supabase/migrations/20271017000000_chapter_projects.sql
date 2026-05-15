-- Create chapter_projects table for pinning chapter priorities
CREATE TABLE IF NOT EXISTS public.chapter_projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id uuid NOT NULL REFERENCES public.ambassador_chapters(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE public.chapter_projects ENABLE ROW LEVEL SECURITY;

-- Everyone in the chapter can view projects
CREATE POLICY "Chapter members can view projects"
  ON public.chapter_projects
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ambassador_memberships
      WHERE user_id = auth.uid() 
      AND chapter_id = chapter_projects.chapter_id
      AND status = 'active'
    )
  );

-- ExCo and President can manage projects
CREATE POLICY "Leadership can manage projects"
  ON public.chapter_projects
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ambassador_memberships
      WHERE user_id = auth.uid() 
      AND chapter_id = chapter_projects.chapter_id
      AND status = 'active'
      AND role IN ('exco', 'president')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ambassador_memberships
      WHERE user_id = auth.uid() 
      AND chapter_id = chapter_projects.chapter_id
      AND status = 'active'
      AND role IN ('exco', 'president')
    )
  );

-- Grant access
GRANT ALL ON public.chapter_projects TO authenticated;
GRANT ALL ON public.chapter_projects TO service_role;
