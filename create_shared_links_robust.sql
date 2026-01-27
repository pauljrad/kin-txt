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

-- Handle existing policies before creating them
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'shared_links' AND policyname = 'Authenticated users can view shared links'
    ) THEN
        CREATE POLICY "Authenticated users can view shared links" ON public.shared_links
        FOR SELECT USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'shared_links' AND policyname = 'Users can create shared links'
    ) THEN
        CREATE POLICY "Users can create shared links" ON public.shared_links
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END
$$;
