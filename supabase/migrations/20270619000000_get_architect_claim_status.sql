-- Create RPC to check architect claim status
CREATE OR REPLACE FUNCTION public.get_architect_claim_status(p_architect_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_verified BOOLEAN;
    v_my_claim_status TEXT;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    -- Check if ANY verified claim exists for this architect
    SELECT EXISTS (
        SELECT 1
        FROM public.architect_claims
        WHERE architect_id = p_architect_id
        AND status = 'verified'
    ) INTO v_is_verified;

    -- Check current user's claim status
    IF v_user_id IS NOT NULL THEN
        SELECT status INTO v_my_claim_status
        FROM public.architect_claims
        WHERE architect_id = p_architect_id
        AND user_id = v_user_id;
    END IF;

    RETURN jsonb_build_object(
        'is_verified', v_is_verified,
        'my_claim_status', v_my_claim_status
    );
END;
$$;
