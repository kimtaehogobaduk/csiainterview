
CREATE TABLE public.school_research_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_key TEXT UNIQUE NOT NULL,
  school_name TEXT NOT NULL,
  school_type TEXT,
  keywords JSONB DEFAULT '[]'::jsonb,
  characteristics TEXT,
  interview_focus TEXT,
  detailed_info TEXT,
  common_questions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.school_research_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read school cache" ON public.school_research_cache
  FOR SELECT TO public USING (true);

CREATE POLICY "Service role can manage cache" ON public.school_research_cache
  FOR ALL TO service_role USING (true);
