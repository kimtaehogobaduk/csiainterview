-- Create admin approval requests table
CREATE TABLE IF NOT EXISTS public.admin_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  device_info TEXT,
  ip_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 minutes')
);

-- Enable RLS
ALTER TABLE public.admin_approval_requests ENABLE ROW LEVEL SECURITY;

-- Admins can view all approval requests
CREATE POLICY "Admins can view all approval requests"
ON public.admin_approval_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own requests
CREATE POLICY "Users can view own requests"
ON public.admin_approval_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Anyone authenticated can create approval requests
CREATE POLICY "Authenticated users can create requests"
ON public.admin_approval_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can update approval requests
CREATE POLICY "Admins can update approval requests"
ON public.admin_approval_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_approval_requests_status ON public.admin_approval_requests(status, expires_at);
CREATE INDEX idx_approval_requests_user ON public.admin_approval_requests(user_id, status);

-- Enable realtime for approval requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_approval_requests;