-- Add desired_school column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN desired_school text DEFAULT 'cheongshim';

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.desired_school IS 'User desired school: cheongshim, hana, sangsan, minsa, etc.';