-- Chapter Tasks
-- Allows ambassadors to create, assign, and track tasks within their chapter.
-- Visibility controls: 'chapter' (all members), 'leadership' (president+exco only),
-- 'only_me' (creator only). Default is 'chapter'.

CREATE TABLE public.chapter_tasks (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id      uuid        NOT NULL REFERENCES public.ambassador_chapters(id) ON DELETE CASCADE,
  title           text        NOT NULL,
  description     text,
  due_date        date,
  visibility      text        NOT NULL DEFAULT 'chapter'
                              CHECK (visibility IN ('chapter', 'leadership', 'only_me')),
  status          text        NOT NULL DEFAULT 'todo'
                              CHECK (status IN ('todo', 'in_progress', 'done')),
  created_by      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_to     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  project_id      uuid        REFERENCES public.chapter_projects(id) ON DELETE SET NULL,
  company_id      uuid        REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Touch trigger
CREATE OR REPLACE FUNCTION public.touch_chapter_tasks_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_chapter_tasks_updated_at
  BEFORE UPDATE ON public.chapter_tasks
  FOR EACH ROW EXECUTE FUNCTION public.touch_chapter_tasks_updated_at();

-- Enable RLS
ALTER TABLE public.chapter_tasks ENABLE ROW LEVEL SECURITY;

-- Helper: true when auth.uid() is an active member of the given chapter
-- (sub-select form — no helper function, avoids recursion risk)

-- SELECT: active chapter member who passes visibility check
CREATE POLICY "chapter_tasks_select"
  ON public.chapter_tasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ambassador_memberships am
      WHERE am.user_id = (SELECT auth.uid())
        AND am.chapter_id = chapter_tasks.chapter_id
        AND am.status = 'active'
    )
    AND (
      -- 'chapter' tasks are visible to all active members
      chapter_tasks.visibility = 'chapter'

      -- 'only_me' tasks are visible only to the creator
      OR (chapter_tasks.visibility = 'only_me'
          AND chapter_tasks.created_by = (SELECT auth.uid()))

      -- 'leadership' tasks are visible to president and exco
      OR (chapter_tasks.visibility = 'leadership'
          AND EXISTS (
            SELECT 1 FROM public.ambassador_memberships am2
            WHERE am2.user_id = (SELECT auth.uid())
              AND am2.chapter_id = chapter_tasks.chapter_id
              AND am2.status = 'active'
              AND am2.role IN ('president', 'exco')
          ))
    )
  );

-- INSERT: active chapter member, must be own created_by, must be own chapter
CREATE POLICY "chapter_tasks_insert"
  ON public.chapter_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    chapter_tasks.created_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.ambassador_memberships am
      WHERE am.user_id = (SELECT auth.uid())
        AND am.chapter_id = chapter_tasks.chapter_id
        AND am.status = 'active'
    )
  );

-- UPDATE: creator can edit their own tasks; chapter leaders can edit any task in their chapter
CREATE POLICY "chapter_tasks_update"
  ON public.chapter_tasks
  FOR UPDATE
  TO authenticated
  USING (
    -- creator can always edit
    chapter_tasks.created_by = (SELECT auth.uid())
    OR
    -- chapter leaders can edit any task
    EXISTS (
      SELECT 1 FROM public.ambassador_memberships am
      WHERE am.user_id = (SELECT auth.uid())
        AND am.chapter_id = chapter_tasks.chapter_id
        AND am.status = 'active'
        AND am.role IN ('president', 'exco')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ambassador_memberships am
      WHERE am.user_id = (SELECT auth.uid())
        AND am.chapter_id = chapter_tasks.chapter_id
        AND am.status = 'active'
    )
  );

-- DELETE: creator can delete their own tasks; chapter leaders can delete any task
CREATE POLICY "chapter_tasks_delete"
  ON public.chapter_tasks
  FOR DELETE
  TO authenticated
  USING (
    chapter_tasks.created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.ambassador_memberships am
      WHERE am.user_id = (SELECT auth.uid())
        AND am.chapter_id = chapter_tasks.chapter_id
        AND am.status = 'active'
        AND am.role IN ('president', 'exco')
    )
  );

-- RPC: get_chapter_tasks(p_chapter_id)
-- Returns tasks visible to the calling user, joined with creator/assignee usernames
-- and project/company display names.
CREATE OR REPLACE FUNCTION public.get_chapter_tasks(p_chapter_id uuid)
RETURNS TABLE (
  id              uuid,
  title           text,
  description     text,
  due_date        date,
  visibility      text,
  status          text,
  created_by      uuid,
  creator_username text,
  assigned_to     uuid,
  assignee_username text,
  assignee_avatar_url text,
  project_id      uuid,
  project_title   text,
  company_id      uuid,
  company_name    text,
  created_at      timestamptz,
  updated_at      timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ct.id,
    ct.title,
    ct.description,
    ct.due_date,
    ct.visibility,
    ct.status,
    ct.created_by,
    p_creator.username AS creator_username,
    ct.assigned_to,
    p_assignee.username AS assignee_username,
    p_assignee.avatar_url AS assignee_avatar_url,
    ct.project_id,
    cp.title AS project_title,
    ct.company_id,
    co.name AS company_name,
    ct.created_at,
    ct.updated_at
  FROM public.chapter_tasks ct
  LEFT JOIN public.profiles p_creator ON p_creator.id = ct.created_by
  LEFT JOIN public.profiles p_assignee ON p_assignee.id = ct.assigned_to
  LEFT JOIN public.chapter_projects cp ON cp.id = ct.project_id
  LEFT JOIN public.companies co ON co.id = ct.company_id
  WHERE ct.chapter_id = p_chapter_id
    -- caller must be an active member of this chapter
    AND EXISTS (
      SELECT 1 FROM public.ambassador_memberships am
      WHERE am.user_id = auth.uid()
        AND am.chapter_id = p_chapter_id
        AND am.status = 'active'
    )
    -- visibility filter
    AND (
      ct.visibility = 'chapter'
      OR (ct.visibility = 'only_me' AND ct.created_by = auth.uid())
      OR (ct.visibility = 'leadership'
          AND EXISTS (
            SELECT 1 FROM public.ambassador_memberships am2
            WHERE am2.user_id = auth.uid()
              AND am2.chapter_id = p_chapter_id
              AND am2.status = 'active'
              AND am2.role IN ('president', 'exco')
          ))
    )
  ORDER BY
    CASE ct.status
      WHEN 'todo'        THEN 1
      WHEN 'in_progress' THEN 2
      WHEN 'done'        THEN 3
    END,
    ct.due_date ASC NULLS LAST,
    ct.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_chapter_tasks(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chapter_tasks(uuid) TO authenticated;
