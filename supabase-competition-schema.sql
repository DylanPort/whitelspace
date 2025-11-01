-- Competition Submissions Table
CREATE TABLE IF NOT EXISTS public.competition_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  creator TEXT NOT NULL, -- Twitter handle or "Anonymous"
  project_link TEXT NOT NULL, -- GitHub or deployed URL
  description TEXT NOT NULL CHECK (char_length(description) >= 100),
  file_count INTEGER NOT NULL DEFAULT 0,
  tech_stack TEXT,
  upvotes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT FALSE
);

-- Enable Row Level Security
ALTER TABLE public.competition_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read
CREATE POLICY "Anyone can view competition submissions"
  ON public.competition_submissions
  FOR SELECT
  USING (true);

-- Policy: Anyone can insert (submit)
CREATE POLICY "Anyone can submit to competition"
  ON public.competition_submissions
  FOR INSERT
  WITH CHECK (true);

-- Policy: Anyone can update upvotes/views (adjust later to restrict if needed)
CREATE POLICY "Anyone can upvote or add views"
  ON public.competition_submissions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_competition_created_at ON public.competition_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_competition_upvotes ON public.competition_submissions(upvotes DESC);
CREATE INDEX IF NOT EXISTS idx_competition_featured ON public.competition_submissions(featured) WHERE featured = true;

