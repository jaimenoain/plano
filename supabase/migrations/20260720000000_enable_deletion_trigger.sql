-- Enable the pg_net extension to allow HTTP requests from the database
-- NOTE: If the migration fails with "permission denied for schema pg_catalog",
-- please enable these extensions manually in the Supabase Dashboard under Database -> Extensions.
-- CREATE EXTENSION IF NOT EXISTS "pg_net";
-- CREATE EXTENSION IF NOT EXISTS "supabase_vault";

-- Function to trigger the delete-storage-recursive Edge Function
-- This function retrieves the Project URL and Service Role Key from the Vault
-- to securely invoke the Edge Function without hardcoding credentials.
CREATE OR REPLACE FUNCTION trigger_delete_storage_recursive()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, vault, net, extensions
AS $$
DECLARE
  project_url TEXT;
  service_key TEXT;
BEGIN
  -- Retrieve secrets from Supabase Vault
  -- We use dynamic SQL or direct reference. Direct reference requires the schema to exist at create time.
  -- If 'vault' schema is missing, this creation will fail, prompting the user to enable the extension.
  SELECT decrypted_secret INTO project_url FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';

  -- Validate secrets
  IF project_url IS NULL OR service_key IS NULL THEN
      -- Raise an exception to prevent silent failures.
      -- The user must configure the secrets in the Vault for this trigger to work.
      RAISE EXCEPTION 'Missing secrets in Vault. Please configure them by running: SELECT vault.create_secret(''https://YOUR_PROJECT.supabase.co'', ''project_url''); and SELECT vault.create_secret(''YOUR_SERVICE_KEY'', ''service_role_key'');';
  END IF;

  -- Call the Edge Function via HTTP POST
  -- We assume the function is at /functions/v1/delete-storage-recursive
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

-- Create the trigger to fire after a new deletion job is inserted
DROP TRIGGER IF EXISTS on_deletion_job_created ON public.deletion_jobs;

CREATE TRIGGER on_deletion_job_created
    AFTER INSERT ON public.deletion_jobs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_delete_storage_recursive();
