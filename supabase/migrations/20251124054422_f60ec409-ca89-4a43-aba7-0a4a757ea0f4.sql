-- Fix monthly_leaderboard table structure
-- Add unique constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'monthly_leaderboard_user_id_month_key'
  ) THEN
    ALTER TABLE public.monthly_leaderboard 
    ADD CONSTRAINT monthly_leaderboard_user_id_month_key 
    UNIQUE (user_id, month);
  END IF;
END $$;

-- Populate monthly_leaderboard with current user mileage data
INSERT INTO public.monthly_leaderboard (user_id, month, total_mileage)
SELECT 
  id as user_id,
  TO_CHAR(NOW(), 'YYYY-MM') as month,
  COALESCE(mileage, 0) as total_mileage
FROM public.profiles
WHERE mileage > 0
ON CONFLICT (user_id, month) 
DO UPDATE SET
  total_mileage = EXCLUDED.total_mileage,
  updated_at = NOW();