-- Add video_url column to interview_sessions table
ALTER TABLE public.interview_sessions 
ADD COLUMN video_url text;

-- Create storage bucket for interview videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('interview-videos', 'interview-videos', false);

-- RLS policies for interview videos bucket
CREATE POLICY "Users can upload their own interview videos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'interview-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own interview videos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'interview-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own interview videos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'interview-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all interview videos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'interview-videos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);