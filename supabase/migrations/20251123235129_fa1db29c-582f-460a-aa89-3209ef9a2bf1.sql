-- Remove recursive leaderboard triggers causing stack depth errors
DROP TRIGGER IF EXISTS trigger_update_leaderboard_on_insert ON public.monthly_leaderboard;
DROP TRIGGER IF EXISTS trigger_update_leaderboard_on_delete ON public.monthly_leaderboard;

-- Update award_mileage to recalculate ranks safely after updating monthly_leaderboard
CREATE OR REPLACE FUNCTION public.award_mileage(p_user_id uuid, p_amount integer, p_reason text, p_session_id uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update user mileage
  UPDATE public.profiles
  SET mileage = mileage + p_amount
  WHERE id = p_user_id;
  
  -- Record transaction
  INSERT INTO public.mileage_transactions (user_id, amount, reason, session_id)
  VALUES (p_user_id, p_amount, p_reason, p_session_id);
  
  -- Update monthly leaderboard
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

  -- Recalculate ranks once per call without using triggers
  PERFORM public.update_leaderboard_ranks();
END;
$function$;