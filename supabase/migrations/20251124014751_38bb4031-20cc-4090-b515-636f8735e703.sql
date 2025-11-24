-- Fix 1: Block anonymous access to profiles table
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- Fix 2: Restrict verification codes to only the email owner
DROP POLICY IF EXISTS "Users can read verification codes by email" ON public.verification_codes;

CREATE POLICY "Users can read own verification codes"
ON public.verification_codes
FOR SELECT
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR email = auth.jwt()->>'email'
);

-- Fix 3: Create a view for users to see their approval requests without sensitive data
CREATE OR REPLACE VIEW public.user_approval_requests AS
SELECT 
  id,
  requested_at,
  expires_at,
  approved_at,
  email,
  user_id,
  status
FROM public.admin_approval_requests;

-- Grant access to the view
GRANT SELECT ON public.user_approval_requests TO authenticated;

-- Revoke direct user access to see their own IP/device info
DROP POLICY IF EXISTS "Users can view own requests" ON public.admin_approval_requests;

-- Users can now only view their requests through the sanitized view
CREATE POLICY "Users can view own requests via view"
ON public.admin_approval_requests
FOR SELECT
TO authenticated
USING (false);  -- Direct access blocked, use view instead
