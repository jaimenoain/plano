-- Secure storage policy for review_images bucket

-- Drop existing insecure policy
DROP POLICY IF EXISTS "Authenticated users can upload review images" ON storage.objects;

-- Create new secure policy enforcing folder isolation
CREATE POLICY "Authenticated users can upload review images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'review_images' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
