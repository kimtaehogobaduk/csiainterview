-- Add mileage to profiles table
ALTER TABLE public.profiles 
ADD COLUMN mileage integer DEFAULT 0 CHECK (mileage >= 0);

-- Create mileage transactions table for tracking point history
CREATE TABLE public.mileage_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  reason text NOT NULL,
  session_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.mileage_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for mileage_transactions
CREATE POLICY "Users can view own transactions"
ON public.mileage_transactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
ON public.mileage_transactions
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create profile items shop (items users can buy)
CREATE TABLE public.profile_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  item_type text NOT NULL CHECK (item_type IN ('avatar_frame', 'badge', 'theme_color', 'icon')),
  price integer NOT NULL CHECK (price >= 0),
  image_url text,
  config jsonb DEFAULT '{}'::jsonb,
  is_available boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.profile_items ENABLE ROW LEVEL SECURITY;

-- Everyone can view available items
CREATE POLICY "Anyone can view available items"
ON public.profile_items
FOR SELECT
USING (is_available = true);

-- Admins can manage items
CREATE POLICY "Admins can manage items"
ON public.profile_items
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create user purchased items table
CREATE TABLE public.user_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.profile_items(id) ON DELETE CASCADE,
  purchased_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, item_id)
);

ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_items
CREATE POLICY "Users can view own items"
ON public.user_items
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all user items"
ON public.user_items
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create user customization settings
CREATE TABLE public.user_customization (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_frame_id uuid REFERENCES public.profile_items(id),
  badge_id uuid REFERENCES public.profile_items(id),
  theme_color text DEFAULT '#0ea5e9',
  custom_icon_id uuid REFERENCES public.profile_items(id),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.user_customization ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_customization
CREATE POLICY "Users can view own customization"
ON public.user_customization
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own customization"
ON public.user_customization
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customization"
ON public.user_customization
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create monthly leaderboard materialized view
CREATE TABLE public.monthly_leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month text NOT NULL, -- Format: YYYY-MM
  total_mileage integer NOT NULL DEFAULT 0,
  rank integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, month)
);

ALTER TABLE public.monthly_leaderboard ENABLE ROW LEVEL SECURITY;

-- Everyone can view leaderboard
CREATE POLICY "Anyone can view leaderboard"
ON public.monthly_leaderboard
FOR SELECT
USING (true);

-- Admins can manage leaderboard
CREATE POLICY "Admins can manage leaderboard"
ON public.monthly_leaderboard
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create function to award mileage
CREATE OR REPLACE FUNCTION public.award_mileage(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_session_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
END;
$$;

-- Create function to purchase item
CREATE OR REPLACE FUNCTION public.purchase_item(
  p_item_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_price integer;
  v_current_mileage integer;
  v_item_name text;
BEGIN
  v_user_id := auth.uid();
  
  -- Get item price and name
  SELECT price, name INTO v_price, v_item_name
  FROM public.profile_items
  WHERE id = p_item_id AND is_available = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', '아이템을 찾을 수 없습니다.');
  END IF;
  
  -- Check if already purchased
  IF EXISTS (SELECT 1 FROM public.user_items WHERE user_id = v_user_id AND item_id = p_item_id) THEN
    RETURN jsonb_build_object('success', false, 'message', '이미 구매한 아이템입니다.');
  END IF;
  
  -- Get current mileage
  SELECT mileage INTO v_current_mileage
  FROM public.profiles
  WHERE id = v_user_id;
  
  -- Check if user has enough mileage
  IF v_current_mileage < v_price THEN
    RETURN jsonb_build_object('success', false, 'message', '마일리지가 부족합니다.');
  END IF;
  
  -- Deduct mileage
  UPDATE public.profiles
  SET mileage = mileage - v_price
  WHERE id = v_user_id;
  
  -- Record transaction
  INSERT INTO public.mileage_transactions (user_id, amount, reason)
  VALUES (v_user_id, -v_price, '아이템 구매: ' || v_item_name);
  
  -- Add item to user inventory
  INSERT INTO public.user_items (user_id, item_id)
  VALUES (v_user_id, p_item_id);
  
  -- Initialize customization if not exists
  INSERT INTO public.user_customization (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN jsonb_build_object('success', true, 'message', '구매 완료!');
END;
$$;

-- Create function to update monthly leaderboard ranks
CREATE OR REPLACE FUNCTION public.update_leaderboard_ranks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month text;
BEGIN
  current_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  UPDATE public.monthly_leaderboard
  SET rank = ranked.new_rank
  FROM (
    SELECT 
      user_id,
      ROW_NUMBER() OVER (ORDER BY total_mileage DESC) as new_rank
    FROM public.monthly_leaderboard
    WHERE month = current_month
  ) ranked
  WHERE monthly_leaderboard.user_id = ranked.user_id
    AND monthly_leaderboard.month = current_month;
END;
$$;

-- Create trigger to update leaderboard ranks when mileage changes
CREATE OR REPLACE FUNCTION public.trigger_update_leaderboard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.update_leaderboard_ranks();
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_leaderboard_update
AFTER INSERT OR UPDATE ON public.monthly_leaderboard
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_update_leaderboard();