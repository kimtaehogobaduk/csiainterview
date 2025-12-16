
-- Add profile settings columns to user_migrations
ALTER TABLE public.user_migrations ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.user_migrations ADD COLUMN IF NOT EXISTS ai_model text DEFAULT 'google/gemini-2.5-flash';
ALTER TABLE public.user_migrations ADD COLUMN IF NOT EXISTS essay_question_count integer DEFAULT 10;
ALTER TABLE public.user_migrations ADD COLUMN IF NOT EXISTS mileage integer DEFAULT 0;
ALTER TABLE public.user_migrations ADD COLUMN IF NOT EXISTS enable_camera boolean DEFAULT false;
ALTER TABLE public.user_migrations ADD COLUMN IF NOT EXISTS desired_school text DEFAULT 'cheongshim';
ALTER TABLE public.user_migrations ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- Update user_migrations with profile settings
UPDATE public.user_migrations SET full_name = 'd', ai_model = 'google/gemini-2.5-pro', essay_question_count = 10, mileage = 0, enable_camera = false, desired_school = 'minsa', role = 'user' WHERE email = 'pillibkwon@gmail.com';
UPDATE public.user_migrations SET full_name = '황채연', ai_model = 'google/gemini-2.5-flash', essay_question_count = 10, mileage = 88, enable_camera = false, desired_school = 'cheongshim', role = 'user' WHERE email = 'dorychuchu@gmail.com';
UPDATE public.user_migrations SET full_name = '백서진', ai_model = 'google/gemini-2.5-pro', essay_question_count = 20, mileage = 0, enable_camera = false, desired_school = 'cheongshim', role = 'user' WHERE email = 'sjbaeg0406@gmail.com';
UPDATE public.user_migrations SET full_name = '정아영', ai_model = 'google/gemini-2.5-flash', essay_question_count = 20, mileage = 83, enable_camera = false, desired_school = 'cheongshim', role = 'user' WHERE email = 'cocojay1111@gmail.com';
UPDATE public.user_migrations SET full_name = '윤주환', ai_model = 'google/gemini-2.5-flash', essay_question_count = 10, mileage = 0, enable_camera = false, desired_school = 'cheongshim', role = 'user' WHERE email = 'markyoons@gmail.com';
UPDATE public.user_migrations SET full_name = '이기림', ai_model = 'google/gemini-2.5-flash', essay_question_count = 10, mileage = 0, enable_camera = false, desired_school = 'cheongshim', role = 'admin' WHERE email = 'leekirim0110@gmail.com';
UPDATE public.user_migrations SET full_name = '남유진', ai_model = 'google/gemini-2.5-flash', essay_question_count = 20, mileage = 0, enable_camera = false, desired_school = 'cheongshim', role = 'user' WHERE email = 'namyujin145@gmail.com';
UPDATE public.user_migrations SET full_name = '강릉감자', ai_model = 'google/gemini-2.5-flash', essay_question_count = 10, mileage = 0, enable_camera = false, desired_school = 'cheongshim', role = 'user' WHERE email = 'wiiizam15@gmail.com';
UPDATE public.user_migrations SET full_name = '권도현', ai_model = 'google/gemini-2.5-flash', essay_question_count = 10, mileage = 81, enable_camera = false, desired_school = 'cheongshim', role = 'user' WHERE email = 'danielkwon337@gmail.com';
UPDATE public.user_migrations SET full_name = '김예주', ai_model = 'google/gemini-2.5-flash', essay_question_count = 10, mileage = 0, enable_camera = false, desired_school = 'cheongshim', role = 'user' WHERE email = 'ky2ju.041585@gmail.com';
UPDATE public.user_migrations SET full_name = '김정윤', ai_model = 'google/gemini-2.5-flash', essay_question_count = 10, mileage = 0, enable_camera = false, desired_school = 'cheongshim', role = 'user' WHERE email = 'dust100203@gmail.com';
UPDATE public.user_migrations SET full_name = '김민지', ai_model = 'google/gemini-2.5-flash', essay_question_count = 20, mileage = 0, enable_camera = false, desired_school = 'cheongshim', role = 'user' WHERE email = 'csia2023min@gmail.com';
UPDATE public.user_migrations SET full_name = '김태헌', ai_model = 'google/gemini-2.5-flash', essay_question_count = 10, mileage = 73, enable_camera = false, desired_school = 'cheongshim', role = 'user' WHERE email = 'iii@gmail.com';
UPDATE public.user_migrations SET full_name = '김태헌', ai_model = 'google/gemini-2.5-flash', essay_question_count = 10, mileage = 0, enable_camera = false, desired_school = 'cheongshim', role = 'user' WHERE email = 'ii@gmail.com';
UPDATE public.user_migrations SET full_name = '한유주', ai_model = 'google/gemini-2.5-flash', essay_question_count = 10, mileage = 0, enable_camera = false, desired_school = 'cheongshim', role = 'user' WHERE email = 'issppygrl@naver.com';
UPDATE public.user_migrations SET full_name = '설승민', ai_model = 'google/gemini-2.5-flash', essay_question_count = 10, mileage = 0, enable_camera = false, desired_school = 'cheongshim', role = 'user' WHERE email = 'ssbssbbb2020@gmail.com';
UPDATE public.user_migrations SET full_name = '장영진', ai_model = 'google/gemini-2.5-flash', essay_question_count = 10, mileage = 0, enable_camera = false, desired_school = 'cheongshim', role = 'user' WHERE email = 'jinjayspring@gmail.com';
UPDATE public.user_migrations SET full_name = '이지우', ai_model = 'google/gemini-2.5-flash', essay_question_count = 10, mileage = 0, enable_camera = false, desired_school = 'cheongshim', role = 'user' WHERE email = 'lovely.jiwoo925@gmail.com';
UPDATE public.user_migrations SET full_name = '똥길동', ai_model = 'google/gemini-2.5-flash', essay_question_count = 10, mileage = 175, enable_camera = false, desired_school = 'cheongshim', role = 'user' WHERE email = 'djdfnsddfdsj@gmail.com';
UPDATE public.user_migrations SET full_name = '김태호', ai_model = 'google/gemini-2.5-flash', essay_question_count = 10, mileage = 233, enable_camera = true, desired_school = 'custom:상산고등학교', role = 'admin' WHERE email = 'kimtaehogobaduk@naver.com';
UPDATE public.user_migrations SET full_name = '이다연', ai_model = 'google/gemini-2.5-flash', essay_question_count = 10, mileage = 0, enable_camera = false, desired_school = 'cheongshim', role = 'user' WHERE email = 'liduojuan@gmail.com';
UPDATE public.user_migrations SET full_name = '김준우', ai_model = 'google/gemini-2.5-flash', essay_question_count = 10, mileage = 0, enable_camera = false, desired_school = 'cheongshim', role = 'user' WHERE email = 'slytherinkjw@gmail.com';
UPDATE public.user_migrations SET full_name = '이한결', ai_model = 'google/gemini-2.5-flash', essay_question_count = 10, mileage = 0, enable_camera = false, desired_school = 'cheongshim', role = 'user' WHERE email = 'sallyloveme0303@gmail.com';
UPDATE public.user_migrations SET full_name = '문건희', ai_model = 'google/gemini-2.5-flash', essay_question_count = 10, mileage = 13, enable_camera = false, desired_school = 'cheongshim', role = 'user' WHERE email = 'elly1072moon@gmail.com';
UPDATE public.user_migrations SET full_name = '난공부', ai_model = 'google/gemini-2.5-flash', essay_question_count = 13, mileage = 130, enable_camera = true, desired_school = 'sangsan', role = 'admin' WHERE email = 'csiahabitmakers@naver.com';

-- Update migrate_user_data function to use the stored profile settings
CREATE OR REPLACE FUNCTION public.migrate_user_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_migration RECORD;
BEGIN
  -- Check if this email has pending migration data
  SELECT * INTO v_migration FROM public.user_migrations 
  WHERE email = NEW.email AND migrated = false
  LIMIT 1;
  
  IF FOUND THEN
    -- Update profile with old settings from migration table
    UPDATE public.profiles SET
      full_name = COALESCE(v_migration.full_name, NEW.full_name),
      ai_model = COALESCE(v_migration.ai_model, 'google/gemini-2.5-flash'),
      essay_question_count = COALESCE(v_migration.essay_question_count, 10),
      mileage = COALESCE(v_migration.mileage, 0),
      enable_camera = COALESCE(v_migration.enable_camera, false),
      desired_school = COALESCE(v_migration.desired_school, 'cheongshim'),
      onboarding_completed = true
    WHERE id = NEW.id;
    
    -- Migrate essays
    UPDATE public.essays SET user_id = NEW.id WHERE user_id = v_migration.old_user_id;
    
    -- Migrate interview sessions
    UPDATE public.interview_sessions SET user_id = NEW.id WHERE user_id = v_migration.old_user_id;
    
    -- Migrate mileage transactions
    UPDATE public.mileage_transactions SET user_id = NEW.id WHERE user_id = v_migration.old_user_id;
    
    -- Migrate saved questions
    UPDATE public.saved_questions SET user_id = NEW.id WHERE user_id = v_migration.old_user_id;
    
    -- Migrate monthly leaderboard
    UPDATE public.monthly_leaderboard SET user_id = NEW.id WHERE user_id = v_migration.old_user_id;
    
    -- Add admin role if applicable
    IF v_migration.role = 'admin' THEN
      INSERT INTO public.user_roles (user_id, role) 
      VALUES (NEW.id, 'admin'::app_role)
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- Mark migration as complete
    UPDATE public.user_migrations SET 
      migrated = true, 
      new_user_id = NEW.id,
      migrated_at = now()
    WHERE id = v_migration.id;
  END IF;
  
  RETURN NEW;
END;
$$;
