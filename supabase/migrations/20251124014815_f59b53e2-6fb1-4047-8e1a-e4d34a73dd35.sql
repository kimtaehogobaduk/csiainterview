-- Drop and recreate the view with SECURITY INVOKER
DROP VIEW IF EXISTS public.user_approval_requests;

CREATE VIEW public.user_approval_requests
WITH (security_invoker=on)
AS
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
