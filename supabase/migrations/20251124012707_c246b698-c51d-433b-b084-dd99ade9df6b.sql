-- Make update_leaderboard_ranks a no-op to avoid recursive stack overflows
CREATE OR REPLACE FUNCTION public.update_leaderboard_ranks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 순위 계산은 이제 애플리케이션 레벨에서 처리합니다.
  RETURN;
END;
$$;

-- Update admin_adjust_mileage to delegate to award_mileage without touching leaderboard directly
CREATE OR REPLACE FUNCTION public.admin_adjust_mileage(
  p_user_id uuid,
  p_amount integer,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_current_mileage integer;
BEGIN
  v_admin_id := auth.uid();
  
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', '인증되지 않음');
  END IF;

  IF NOT has_role(v_admin_id, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'message', '관리자 권한 없음');
  END IF;

  SELECT mileage INTO v_current_mileage FROM public.profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', '사용자를 찾을 수 없습니다');
  END IF;

  -- Prevent negative mileage
  IF COALESCE(v_current_mileage, 0) + p_amount < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', '마일리지는 음수가 될 수 없습니다. 현재 마일리지: ' || COALESCE(v_current_mileage, 0) || ', 변경 시도: ' || p_amount
    );
  END IF;

  -- Use shared mileage logic (also updates monthly_leaderboard & transactions)
  PERFORM public.award_mileage(p_user_id, p_amount, p_reason, NULL);

  RETURN jsonb_build_object('success', true, 'message', '마일리지가 업데이트되었습니다');
END;
$$;