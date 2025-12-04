-- Set onboarding_completed to true for existing users who have already set up their profile
UPDATE public.profiles 
SET onboarding_completed = true 
WHERE full_name IS NOT NULL AND full_name != '';