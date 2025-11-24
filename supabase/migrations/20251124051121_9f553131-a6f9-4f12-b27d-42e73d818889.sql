-- Allow authenticated users to view other users' customization for leaderboard
DROP POLICY IF EXISTS "Users can view own customization" ON public.user_customization;
DROP POLICY IF EXISTS "Users can update own customization" ON public.user_customization;
DROP POLICY IF EXISTS "Users can insert own customization" ON public.user_customization;

CREATE POLICY "Authenticated users can view customizations"
ON public.user_customization
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update own customization"
ON public.user_customization
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customization"
ON public.user_customization
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);