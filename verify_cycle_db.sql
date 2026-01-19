
-- Verification script for Cycle logic (Simulated)

BEGIN;

-- 1. Create a test group
-- Using valid UUIDs for all ID fields to avoid syntax errors.
-- Assuming 'created_by' references auth.users or profiles, we use a syntactically valid UUID.
-- If FK constraints exist, this might fail if that user doesn't exist, but we fix the syntax error first.
INSERT INTO groups (id, name, created_by)
VALUES ('11111111-1111-1111-1111-111111111111', 'Test Group', 'ffffffff-ffff-ffff-ffff-ffffffffffff');

-- 2. Create a cycle
INSERT INTO group_cycles (id, title, group_id, is_active)
VALUES ('22222222-2222-2222-2222-222222222222', 'Test Cycle', '11111111-1111-1111-1111-111111111111', true);

-- 3. Create a session linked to the cycle
INSERT INTO group_sessions (id, group_id, cycle_id, title, session_date)
VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Cycle Session', NOW());

-- 4. Verify the link
DO $$
DECLARE
    cid UUID;
BEGIN
    SELECT cycle_id INTO cid FROM group_sessions WHERE id = '33333333-3333-3333-3333-333333333333';
    IF cid != '22222222-2222-2222-2222-222222222222' THEN
        RAISE EXCEPTION 'Session not linked correctly';
    END IF;
END $$;

-- 5. Delete the cycle and verify SET NULL
DELETE FROM group_cycles WHERE id = '22222222-2222-2222-2222-222222222222';

DO $$
DECLARE
    cid UUID;
BEGIN
    SELECT cycle_id INTO cid FROM group_sessions WHERE id = '33333333-3333-3333-3333-333333333333';
    IF cid IS NOT NULL THEN
        RAISE EXCEPTION 'Session cycle_id did not set to NULL after cycle deletion';
    END IF;
END $$;

ROLLBACK;
