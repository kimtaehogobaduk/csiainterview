-- Add essay_question_count column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN essay_question_count integer DEFAULT 10 CHECK (essay_question_count >= 1 AND essay_question_count <= 50);