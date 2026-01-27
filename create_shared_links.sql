-- Create shared_links table for external sharing
CREATE TABLE IF NOT EXISTS public.shared_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;

-- Policies
-- Anyone logged in can view a shared link (provided they have the ID)
CREATE POLICY "Authenticated users can view shared links" ON public.shared_links
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can create shared links
CREATE POLICY "Users can create shared links" ON public.shared_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);
