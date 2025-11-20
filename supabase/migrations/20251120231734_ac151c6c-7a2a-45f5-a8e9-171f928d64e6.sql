-- Add INSERT policy for profiles table
CREATE POLICY "Users can insert own profile"
ON public.profiles 
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Make community-files bucket private (update existing bucket)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'community-files';

-- Add RLS policies for community-files storage bucket
CREATE POLICY "Authenticated users can view own files"
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'community-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Authenticated users can upload own files"
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'community-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Authenticated users can delete own files"
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'community-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);