-- Fix search_path for security
CREATE OR REPLACE FUNCTION public.purchase_item(p_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_item_price integer;
  v_current_mileage integer;
  v_item_name text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', '로그인이 필요합니다.');
  END IF;

  SELECT price, name INTO v_item_price, v_item_name
  FROM public.profile_items
  WHERE id = p_item_id AND is_available = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', '존재하지 않거나 구매할 수 없는 아이템입니다.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_items WHERE user_id = v_user_id AND item_id = p_item_id) THEN
    RETURN jsonb_build_object('success', false, 'message', '이미 구매한 아이템입니다.');
  END IF;

  SELECT mileage INTO v_current_mileage FROM public.profiles WHERE id = v_user_id;

  IF v_current_mileage < v_item_price THEN
    RETURN jsonb_build_object('success', false, 'message', '마일리지가 부족합니다.');
  END IF;

  UPDATE public.profiles SET mileage = GREATEST(0, mileage - v_item_price) WHERE id = v_user_id;
  INSERT INTO public.user_items (user_id, item_id) VALUES (v_user_id, p_item_id);
  INSERT INTO public.mileage_transactions (user_id, amount, reason) VALUES (v_user_id, -v_item_price, '아이템 구매: ' || v_item_name);

  RETURN jsonb_build_object('success', true, 'message', v_item_name || ' 구매가 완료되었습니다!');
END;
$$;

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

  IF v_current_mileage + p_amount < 0 THEN
    RETURN jsonb_build_object('success', false, 'message', '마일리지는 음수가 될 수 없습니다. 현재 마일리지: ' || v_current_mileage || ', 변경 시도: ' || p_amount);
  END IF;

  UPDATE public.profiles SET mileage = GREATEST(0, mileage + p_amount) WHERE id = p_user_id;
  INSERT INTO public.mileage_transactions (user_id, amount, reason) VALUES (p_user_id, p_amount, p_reason);

  RETURN jsonb_build_object('success', true, 'message', '마일리지가 업데이트되었습니다');
END;
$$;