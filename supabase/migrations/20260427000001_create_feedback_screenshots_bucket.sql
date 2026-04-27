INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-screenshots', 'feedback-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload screenshots scoped to their own user path
CREATE POLICY "Users upload own feedback screenshots"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'feedback-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Only service role can read (signed URLs generated server-side)
-- No SELECT policy for authenticated users — bucket is private
