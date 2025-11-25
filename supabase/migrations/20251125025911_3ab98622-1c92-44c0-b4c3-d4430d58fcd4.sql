-- Create saved_questions table
CREATE TABLE public.saved_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'essay_based',
  essay TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_questions ENABLE ROW LEVEL SECURITY;

-- Users can view own saved questions
CREATE POLICY "Users can view own saved questions"
ON public.saved_questions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert own saved questions
CREATE POLICY "Users can insert own saved questions"
ON public.saved_questions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete own saved questions
CREATE POLICY "Users can delete own saved questions"
ON public.saved_questions
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all saved questions
CREATE POLICY "Admins can view all saved questions"
ON public.saved_questions
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create index for better query performance
CREATE INDEX idx_saved_questions_user_id ON public.saved_questions(user_id);
CREATE INDEX idx_saved_questions_created_at ON public.saved_questions(created_at DESC);