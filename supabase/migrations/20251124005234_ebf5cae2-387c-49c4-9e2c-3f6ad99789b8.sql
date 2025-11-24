-- Simplify admin_adjust_mileage to avoid any recursive behavior
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

  -- 1) 단순히 프로필 마일리지만 조정
  UPDATE public.profiles
  SET mileage = COALESCE(mileage, 0) + p_amount
  WHERE id = p_user_id;
  
  -- 2) 트리거나 다른 함수가 없다고 확인된 안전한 트랜잭션 로그만 기록
  INSERT INTO public.mileage_transactions (user_id, amount, reason, session_id)
  VALUES (p_user_id, p_amount, p_reason, NULL);

  -- ⚠ 리더보드(monthly_leaderboard)는 여기서 건드리지 않습니다.
  --    순위 계산/집계는 나중에 별도 배치나 클라이언트 정렬로 처리합니다.
END;
$function$;