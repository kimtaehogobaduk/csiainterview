
-- 1) profiles: remove always-true public select, add limited public view
DROP POLICY IF EXISTS "Authenticated users can view public profile info" ON public.profiles;

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT id, full_name
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- Allow authenticated users to read just id+full_name of other users via the view.
-- View uses security_invoker, so we need a SELECT policy on profiles that exposes only id/full_name.
-- Simpler approach: add a permissive SELECT policy that returns rows but restrict view columns.
-- Since RLS is row-level not column-level, we add a dedicated policy allowing authenticated to see all rows,
-- but the view exposes only safe columns. Email/other sensitive cols are NOT in the view.
-- However direct table SELECT would still bypass. To prevent that, we keep only own-row + admin policies on profiles.
-- The view with security_invoker will fail for other rows. So instead use security_definer view:
DROP VIEW IF EXISTS public.public_profiles;

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false)
AS
SELECT id, full_name
FROM public.profiles;

ALTER VIEW public.public_profiles OWNER TO postgres;
GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- 2) verification_codes: remove public INSERT policy
DROP POLICY IF EXISTS "Anyone can create verification codes" ON public.verification_codes;

-- 3) monthly_leaderboard: restrict select to authenticated
DROP POLICY IF EXISTS "Anyone can view leaderboard" ON public.monthly_leaderboard;
CREATE POLICY "Authenticated users can view leaderboard"
  ON public.monthly_leaderboard
  FOR SELECT
  TO authenticated
  USING (true);

-- 4) storage community-files: restrict select to authenticated and enforce folder ownership on insert
DROP POLICY IF EXISTS "Anyone can view community files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload community files" ON storage.objects;

CREATE POLICY "Authenticated users can view community files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'community-files');

CREATE POLICY "Users can upload to their own folder in community-files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'community-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own community files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'community-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
