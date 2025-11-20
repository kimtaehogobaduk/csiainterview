-- Create verification codes table
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  type text NOT NULL DEFAULT 'signup' -- 'signup' or 'reset'
);

-- Enable RLS
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert verification codes (for signup)
CREATE POLICY "Anyone can create verification codes"
ON public.verification_codes
FOR INSERT
WITH CHECK (true);

-- Only allow reading own verification codes
CREATE POLICY "Users can read verification codes by email"
ON public.verification_codes
FOR SELECT
USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON public.verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON public.verification_codes(expires_at);