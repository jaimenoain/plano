-- Fix for the Background Job deletion system
-- ensuring robust connection between Database and Edge Function.

-- 1. Enable necessary extensions
-- Note: In some Supabase environments, you must enable these via the Dashboard.
-- We attempt to create them, but catch errors implicitly by using IF NOT EXISTS.
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";

-- 2. Define the Trigger Function
CREATE OR REPLACE FUNCTION public.invoke_delete_storage_recursive()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, vault, net, extensions
LANGUAGE plpgsql
AS $$
DECLARE
  project_url TEXT;
  service_key TEXT;
  full_url TEXT;
BEGIN
  -- Retrieve secrets from Supabase Vault
  -- We rely on secrets named 'project_url' (e.g., 'https://xyz.supabase.co')
  -- and 'service_role_key' (the service_role secret).
  SELECT decrypted_secret INTO project_url
  FROM vault.decrypted_secrets
  WHERE name = 'project_url';

  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key';

  -- Fallback/Validation: If secrets are missing, we cannot proceed.
  -- We verify both to ensure a successful request.
  IF project_url IS NULL OR service_key IS NULL THEN
      RAISE EXCEPTION 'Missing secrets in Vault. Please run: SELECT vault.create_secret(''YOUR_URL'', ''project_url''); SELECT vault.create_secret(''YOUR_KEY'', ''service_role_key'');';
  END IF;

  -- Remove trailing slash from project_url if present to avoid double slashes
  project_url := rtrim(project_url, '/');

  -- Construct the full endpoint URL
  full_url := project_url || '/functions/v1/delete-storage-recursive';

  -- Invoke the Edge Function asynchronously via pg_net
  -- We pass the new record as the 'record' field in the JSON payload.
  PERFORM net.http_post(
      url := full_url,
      headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_key
      ),
      body := jsonb_build_object(
          'record', NEW
      )
  );

  RETURN NEW;
END;
$$;

-- 3. Create the Trigger
-- We use CREATE OR REPLACE on the function, but for the trigger we drop and recreate
-- to ensure it's attached correctly.

DROP TRIGGER IF EXISTS on_deletion_job_created ON public.deletion_jobs;

CREATE TRIGGER on_deletion_job_created
    AFTER INSERT ON public.deletion_jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.invoke_delete_storage_recursive();

-- Verification Helper (Commented out)
-- INSERT INTO public.deletion_jobs (user_id, bucket_name) VALUES ('some-uuid', 'review_images');
