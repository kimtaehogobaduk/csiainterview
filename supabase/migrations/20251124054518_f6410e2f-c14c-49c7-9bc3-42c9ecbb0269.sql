-- Remove the blocking anonymous access policy that conflicts with authenticated access
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;

-- Ensure authenticated users can view public profile information
DROP POLICY IF EXISTS "Authenticated users can view public profile info" ON public.profiles;

CREATE POLICY "Authenticated users can view public profile info"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);