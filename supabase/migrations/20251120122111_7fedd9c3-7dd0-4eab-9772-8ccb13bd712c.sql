-- Add original_content column to store unmoderated content for admin review
ALTER TABLE public.community_posts 
ADD COLUMN IF NOT EXISTS original_content TEXT;

-- Create RLS policy for admins to view original content
CREATE POLICY "Admins can view original content"
ON public.community_posts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);