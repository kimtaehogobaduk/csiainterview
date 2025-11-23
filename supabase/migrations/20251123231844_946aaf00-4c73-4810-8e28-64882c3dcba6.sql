-- Add camera settings column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS enable_camera boolean DEFAULT false;