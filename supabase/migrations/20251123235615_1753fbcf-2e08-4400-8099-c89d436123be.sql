-- Simplify award_mileage to avoid recursive rank updates
CREATE OR REPLACE FUNCTION public.award_mileage(p_user_id uuid, p_amount integer, p_reason text, p_session_id uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update user mileage
  UPDATE public.profiles
  SET mileage = COALESCE(mileage, 0) + p_amount
  WHERE id = p_user_id;
  
  -- Record transaction
  INSERT INTO public.mileage_transactions (user_id, amount, reason, session_id)
  VALUES (p_user_id, p_amount, p_reason, p_session_id);
  
  -- Update monthly leaderboard (no rank recalculation here)
  INSERT INTO public.monthly_leaderboard (user_id, month, total_mileage)
  VALUES (
    p_user_id,
    TO_CHAR(NOW(), 'YYYY-MM'),
    p_amount
  )
  ON CONFLICT (user_id, month)
  DO UPDATE SET
    total_mileage = monthly_leaderboard.total_mileage + p_amount,
    updated_at = NOW();
END;
$function$;