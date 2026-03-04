-- Drop existing trigger and function since we are replacing them
DROP TRIGGER IF EXISTS trg_sync_verified_architect_id ON public.architect_claims;
DROP FUNCTION IF EXISTS public.sync_verified_architect_id();

-- Create the new function with the requested name
CREATE OR REPLACE FUNCTION public.handle_architect_claim_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Handle DELETE operation
    IF TG_OP = 'DELETE' THEN
        IF OLD.status = 'verified' THEN
            UPDATE public.profiles
            SET verified_architect_id = NULL
            WHERE id = OLD.user_id AND verified_architect_id = OLD.architect_id;
        END IF;
        RETURN OLD;
    END IF;

    -- Handle INSERT and UPDATE operations
    IF NEW.status = 'verified' THEN
        UPDATE public.profiles
        SET verified_architect_id = NEW.architect_id
        WHERE id = NEW.user_id;
    ELSE
        -- If it was previously verified but now changed to something else
        IF TG_OP = 'UPDATE' AND OLD.status = 'verified' THEN
            UPDATE public.profiles
            SET verified_architect_id = NULL
            WHERE id = NEW.user_id AND verified_architect_id = OLD.architect_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Create the new trigger with the requested name
CREATE TRIGGER on_architect_claim_verified
AFTER INSERT OR UPDATE OR DELETE ON public.architect_claims
FOR EACH ROW
EXECUTE FUNCTION public.handle_architect_claim_approval();
