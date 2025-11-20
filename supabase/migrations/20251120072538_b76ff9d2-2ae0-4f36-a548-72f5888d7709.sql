-- Add 'elder' role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'elder';

-- Create community_posts table
CREATE TABLE public.community_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  is_deleted BOOLEAN DEFAULT false,
  deleted_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on community_posts
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

-- RLS policies for community_posts
CREATE POLICY "Anyone can view non-deleted posts"
  ON public.community_posts
  FOR SELECT
  USING (is_deleted = false OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can create posts"
  ON public.community_posts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own posts"
  ON public.community_posts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can delete posts"
  ON public.community_posts
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for community files
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-files', 'community-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for community files
CREATE POLICY "Anyone can view community files"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'community-files');

CREATE POLICY "Authenticated users can upload community files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'community-files' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete own files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'community-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Trigger for updated_at on community_posts
CREATE TRIGGER update_community_posts_updated_at
  BEFORE UPDATE ON public.community_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();