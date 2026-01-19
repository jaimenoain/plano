-- Create table for diagnostic logs
CREATE TABLE IF NOT EXISTS public.admin_diagnostic_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    error_type text NOT NULL,
    message text NOT NULL,
    stack_trace text,
    user_agent text,
    url text,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.admin_diagnostic_logs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to insert logs (to capture errors)
CREATE POLICY "Allow authenticated users to insert logs"
ON public.admin_diagnostic_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow admins to read logs
CREATE POLICY "Allow admins to read logs"
ON public.admin_diagnostic_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin')
    )
);

-- Allow admins to delete logs (cleanup)
CREATE POLICY "Allow admins to delete logs"
ON public.admin_diagnostic_logs
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin')
    )
);
