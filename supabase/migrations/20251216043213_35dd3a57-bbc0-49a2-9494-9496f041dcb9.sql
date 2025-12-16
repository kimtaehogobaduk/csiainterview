
-- Create migration tracking table to map old user emails to their data
CREATE TABLE IF NOT EXISTS public.user_migrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  old_user_id uuid NOT NULL,
  email text NOT NULL,
  migrated boolean DEFAULT false,
  new_user_id uuid,
  migrated_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_user_migrations_email ON public.user_migrations(email);
CREATE INDEX idx_user_migrations_old_user_id ON public.user_migrations(old_user_id);

-- Enable RLS
ALTER TABLE public.user_migrations ENABLE ROW LEVEL SECURITY;

-- Only admins can manage migrations
CREATE POLICY "Admins can manage migrations" ON public.user_migrations FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert old user mappings (email -> old_user_id)
INSERT INTO public.user_migrations (old_user_id, email) VALUES
('c50f6ff2-ba60-4111-a6a0-fb824120863a', 'pillibkwon@gmail.com'),
('da48bbb7-5cc8-4789-83fb-b1e2091b5a6b', 'dorychuchu@gmail.com'),
('3f08ed20-addc-457f-86b9-ec50e2419594', 'sjbaeg0406@gmail.com'),
('34474818-c260-4e68-8d4e-182e756cb71a', 'cocojay1111@gmail.com'),
('7d9825e5-e466-4ad8-a561-8e0af3cc4820', 'markyoons@gmail.com'),
('558e7546-3344-4478-9ccc-5bf8db62453d', 'leekirim0110@gmail.com'),
('b0a618ad-ff86-49ed-8b8f-6bd00c4a9d62', 'namyujin145@gmail.com'),
('490f4b4c-698c-400e-95ef-56346f114d4c', 'wiiizam15@gmail.com'),
('d6ace24b-2a92-487f-a54d-34deb6769179', 'danielkwon337@gmail.com'),
('1041b029-1351-431b-a9dc-2c14e58c4539', 'ky2ju.041585@gmail.com'),
('f3d86f6b-9c08-4f96-b6de-6f1c81e709f4', 'dust100203@gmail.com'),
('f03f1ee2-db03-424f-a4ed-79808d4c4dd4', 'csia2023min@gmail.com'),
('dbbe9bf0-ab39-46ad-ad00-c7e094fe100a', 'iii@gmail.com'),
('5ac5a273-7157-4024-8a26-c03d7d8ca15c', 'ii@gmail.com'),
('967714ed-09d3-4cb6-9f67-6b7caa422877', 'issppygrl@naver.com'),
('19b8cdc7-6a82-4d12-8c2b-d8754ea5e5e0', 'ssbssbbb2020@gmail.com'),
('b5293b00-d71a-48a0-a8a3-09e8139ab9ee', 'jinjayspring@gmail.com'),
('4df2f290-0e2f-4d2d-8676-074d44dfd3c5', 'lovely.jiwoo925@gmail.com'),
('f7c9a1e8-3b85-407c-a81e-6a022e8bc7c6', 'djdfnsddfdsj@gmail.com'),
('d7bbaca1-2f67-453a-9138-19e0a1cda8d4', 'kimtaehogobaduk@naver.com'),
('2f1f2fec-6722-4e75-b46f-406f330066b4', 'liduojuan@gmail.com'),
('aa23b09f-0001-4271-b9c1-b64323c37f42', 'slytherinkjw@gmail.com'),
('c7cd60cf-1525-49b4-8fc1-4f88aa1371c3', 'sallyloveme0303@gmail.com'),
('9117e742-5971-4428-98c9-b6351a495380', 'elly1072moon@gmail.com'),
('50458d4f-97fa-4b77-8de4-af94295340ea', 'csiahabitmakers@naver.com');

-- Create function to migrate user data when they sign up/login
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
    -- Update profile with old data
    UPDATE public.profiles SET
      full_name = COALESCE(NEW.full_name, (SELECT full_name FROM profiles WHERE id = v_migration.old_user_id)),
      ai_model = COALESCE((SELECT ai_model FROM profiles WHERE id = v_migration.old_user_id), 'google/gemini-2.5-flash'),
      essay_question_count = COALESCE((SELECT essay_question_count FROM profiles WHERE id = v_migration.old_user_id), 10),
      mileage = COALESCE((SELECT mileage FROM profiles WHERE id = v_migration.old_user_id), 0),
      enable_camera = COALESCE((SELECT enable_camera FROM profiles WHERE id = v_migration.old_user_id), false),
      desired_school = COALESCE((SELECT desired_school FROM profiles WHERE id = v_migration.old_user_id), 'cheongshim'),
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
    
    -- Migrate user roles (for admin users)
    UPDATE public.user_roles SET user_id = NEW.id WHERE user_id = v_migration.old_user_id;
    
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

-- Create trigger to run migration after profile is created
DROP TRIGGER IF EXISTS trigger_migrate_user_data ON public.profiles;
CREATE TRIGGER trigger_migrate_user_data
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.migrate_user_data();
