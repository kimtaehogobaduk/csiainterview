-- Add ai_model preference to profiles table
ALTER TABLE public.profiles
ADD COLUMN ai_model TEXT DEFAULT 'google/gemini-2.5-flash';