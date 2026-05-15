-- Create ambassador_goals table for personal goal setting
CREATE TABLE IF NOT EXISTS public.ambassador_goals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  target_value integer NOT NULL DEFAULT 1,
  current_value integer NOT NULL DEFAULT 0,
  metric text NOT NULL CHECK (metric IN ('edits', 'photos', 'firms_claimed', 'visits')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'abandoned')),
  due_date timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE public.ambassador_goals ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own goals
CREATE POLICY "Users can manage their own goals"
  ON public.ambassador_goals
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Grant access
GRANT ALL ON public.ambassador_goals TO authenticated;
GRANT ALL ON public.ambassador_goals TO service_role;
