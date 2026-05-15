-- Create outreach_log table for tracking ambassador contact with firms
CREATE TABLE IF NOT EXISTS public.outreach_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id uuid NOT NULL, -- References the firm being contacted
  ambassador_id uuid REFERENCES auth.users(id) NOT NULL,
  status text NOT NULL DEFAULT 'contacted' CHECK (status IN ('contacted', 'replied', 'claimed', 'declined')),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE public.outreach_log ENABLE ROW LEVEL SECURITY;

-- Ambassadors can see all outreach logs in their chapter area? 
-- For simplicity, ambassadors can see all logs for firms they've contacted or all chapter logs.
-- Roadmap says: "Architect outreach tool: interface for ambassadors to track firm claims."

CREATE POLICY "Ambassadors can view outreach logs"
  ON public.outreach_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ambassador_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Ambassadors can insert their own outreach logs"
  ON public.outreach_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ambassador_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.ambassador_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Ambassadors can update their own outreach logs"
  ON public.outreach_log
  FOR UPDATE
  TO authenticated
  USING (
    ambassador_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.ambassador_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  )
  WITH CHECK (
    ambassador_id = auth.uid()
  );

-- Grant access
GRANT ALL ON public.outreach_log TO authenticated;
GRANT ALL ON public.outreach_log TO service_role;
