-- Create table for tracking deletion jobs
CREATE TABLE IF NOT EXISTS public.deletion_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    bucket_name TEXT NOT NULL DEFAULT 'review_images',
    logs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deletion_jobs_status ON public.deletion_jobs(status);
CREATE INDEX IF NOT EXISTS idx_deletion_jobs_user_id ON public.deletion_jobs(user_id);

-- Enable Row Level Security
ALTER TABLE public.deletion_jobs ENABLE ROW LEVEL SECURITY;

-- Policies for Admins
CREATE POLICY "Admins can view deletion jobs" ON public.deletion_jobs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'admin' OR profiles.role = 'app_admin')
        )
    );

CREATE POLICY "Admins can insert deletion jobs" ON public.deletion_jobs
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'admin' OR profiles.role = 'app_admin')
        )
    );

-- Function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION update_deletion_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_deletion_jobs_modtime
    BEFORE UPDATE ON public.deletion_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_deletion_jobs_updated_at();


-- NOTE: To enable the automatic trigger of the Edge Function, you must configure a Database Webhook
-- or use the pg_net extension as shown below.
-- Replace YOUR_PROJECT_ID and YOUR_SERVICE_ROLE_KEY with actual values.

/*
-- CREATE EXTENSION IF NOT EXISTS "pg_net";

CREATE OR REPLACE FUNCTION trigger_delete_storage_recursive()
RETURNS TRIGGER AS $$
DECLARE
  project_url TEXT := 'https://YOUR_PROJECT_ID.supabase.co'; -- Use http://host.docker.internal:54321 for local development
  service_key TEXT := 'YOUR_SERVICE_ROLE_KEY';
BEGIN
  PERFORM net.http_post(
      url := project_url || '/functions/v1/delete-storage-recursive',
      headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_key
      ),
      body := jsonb_build_object('record', NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_deletion_job_created
    AFTER INSERT ON public.deletion_jobs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_delete_storage_recursive();
*/
