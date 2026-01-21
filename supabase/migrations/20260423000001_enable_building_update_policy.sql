DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'buildings' AND policyname = 'Users can update their own buildings'
    ) THEN
        CREATE POLICY "Users can update their own buildings"
            ON buildings FOR UPDATE
            TO authenticated
            USING (created_by = auth.uid())
            WITH CHECK (created_by = auth.uid());
    END IF;
END $$;
