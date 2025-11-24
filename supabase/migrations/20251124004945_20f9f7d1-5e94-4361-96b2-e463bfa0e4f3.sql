-- Create dedicated admin mileage adjustment function to avoid legacy recursion issues
CREATE OR REPLACE FUNCTION public.admin_adjust_mileage(
  p_user_id uuid,
  p_amount integer,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_caller uuid;
BEGIN
  -- Ensure only authenticated admins can adjust mileage
  v_caller := auth.uid();

  IF v_caller IS NULL THEN
    RAISE EXCEPTION '인증되지 않은 요청입니다.';
  END IF;

  IF NOT has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION '관리자만 마일리지를 조정할 수 있습니다.';
  END IF;

  -- Update user mileage safely
  UPDATE public.profiles
  SET mileage = COALESCE(mileage, 0) + p_amount
  WHERE id = p_user_id;
  
  -- Record transaction (no triggers involved)
  INSERT INTO public.mileage_transactions (user_id, amount, reason, session_id)
  VALUES (p_user_id, p_amount, p_reason, NULL);
  
  -- Update monthly leaderboard without calling other functions or triggers
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