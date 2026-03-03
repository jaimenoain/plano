-- Add verified_architect_id column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS verified_architect_id UUID REFERENCES public.architects(id) ON DELETE SET NULL;

-- Trigger function to automatically update profiles.verified_architect_id
CREATE OR REPLACE FUNCTION public.sync_verified_architect_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Handle DELETE operation
    IF TG_OP = 'DELETE' THEN
        IF OLD.status = 'approved' OR OLD.status = 'verified' THEN
            UPDATE public.profiles
            SET verified_architect_id = NULL
            WHERE id = OLD.user_id AND verified_architect_id = OLD.architect_id;
        END IF;
        RETURN OLD;
    END IF;

    -- Handle INSERT and UPDATE operations
    IF NEW.status = 'approved' OR NEW.status = 'verified' THEN
        UPDATE public.profiles
        SET verified_architect_id = NEW.architect_id
        WHERE id = NEW.user_id;
    ELSE
        -- If it was previously approved/verified but now changed to something else
        IF TG_OP = 'UPDATE' AND (OLD.status = 'approved' OR OLD.status = 'verified') THEN
            UPDATE public.profiles
            SET verified_architect_id = NULL
            WHERE id = NEW.user_id AND verified_architect_id = OLD.architect_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_sync_verified_architect_id ON public.architect_claims;
CREATE TRIGGER trg_sync_verified_architect_id
AFTER INSERT OR UPDATE OR DELETE ON public.architect_claims
FOR EACH ROW
EXECUTE FUNCTION public.sync_verified_architect_id();
