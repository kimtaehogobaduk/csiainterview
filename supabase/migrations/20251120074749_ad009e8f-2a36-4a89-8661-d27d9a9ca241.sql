-- Add pinned post functionality to community_posts
ALTER TABLE public.community_posts 
ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE,
ADD COLUMN pinned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN pinned_by UUID REFERENCES auth.users(id);

-- Create index for faster pinned post queries
CREATE INDEX idx_community_posts_pinned ON public.community_posts(is_pinned, pinned_at DESC) WHERE is_pinned = TRUE;

-- Create index for ordering posts
CREATE INDEX idx_community_posts_order ON public.community_posts(is_pinned DESC, created_at DESC) WHERE is_deleted = FALSE;