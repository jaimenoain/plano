-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Public Access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Avatars are publicly accessible'
    ) THEN
        CREATE POLICY "Avatars are publicly accessible"
            ON storage.objects FOR SELECT
            USING ( bucket_id = 'avatars' );
    END IF;
END $$;

-- Policy: Authenticated Upload (own folder)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated users can upload avatars'
    ) THEN
        CREATE POLICY "Authenticated users can upload avatars"
            ON storage.objects FOR INSERT
            TO authenticated
            WITH CHECK (
                bucket_id = 'avatars' AND
                (storage.foldername(name))[1] = auth.uid()::text
            );
    END IF;
END $$;

-- Policy: Authenticated Update (own folder)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated users can update avatars'
    ) THEN
        CREATE POLICY "Authenticated users can update avatars"
            ON storage.objects FOR UPDATE
            TO authenticated
            USING (
                bucket_id = 'avatars' AND
                (storage.foldername(name))[1] = auth.uid()::text
            );
    END IF;
END $$;

-- Policy: Authenticated Delete (own folder)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated users can delete avatars'
    ) THEN
        CREATE POLICY "Authenticated users can delete avatars"
            ON storage.objects FOR DELETE
            TO authenticated
            USING (
                bucket_id = 'avatars' AND
                (storage.foldername(name))[1] = auth.uid()::text
            );
    END IF;
END $$;
