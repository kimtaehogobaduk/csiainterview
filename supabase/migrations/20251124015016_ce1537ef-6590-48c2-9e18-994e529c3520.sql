-- Allow authenticated users to view basic profile information for leaderboard
CREATE POLICY "Authenticated users can view public profile info"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
