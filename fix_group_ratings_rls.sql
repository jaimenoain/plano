
-- Enable read access for all authenticated users to the log table
-- This allows group members to see each other's ratings
CREATE POLICY "Enable read access for all authenticated users"
ON "public"."log"
FOR SELECT
TO authenticated
USING (true);
