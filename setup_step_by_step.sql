-- STEP 1: Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  preview TEXT,
  word_count INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0,
  current_word_index INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  emphasis_words TEXT[],
  whispered_words TEXT[],
  total_reading_time INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- STEP 2: Enable RLS on documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- STEP 3: Create documents policies
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
CREATE POLICY "Users can view their own documents"
ON public.documents FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
CREATE POLICY "Users can insert their own documents"
ON public.documents FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
CREATE POLICY "Users can update their own documents"
ON public.documents FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;
CREATE POLICY "Users can delete their own documents"
ON public.documents FOR DELETE
USING (auth.uid() = user_id);

-- STEP 4: Create reading_list table
CREATE TABLE IF NOT EXISTS public.reading_list (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  link TEXT NOT NULL,
  source TEXT,
  image_url TEXT,
  saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- STEP 5: Add unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS reading_list_user_link_idx ON public.reading_list(user_id, link);

-- STEP 6: Enable RLS on reading_list
ALTER TABLE public.reading_list ENABLE ROW LEVEL SECURITY;

-- STEP 7: Create reading_list policies
DROP POLICY IF EXISTS "Users can view their own reading list" ON public.reading_list;
CREATE POLICY "Users can view their own reading list" 
ON public.reading_list 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add to their reading list" ON public.reading_list;
CREATE POLICY "Users can add to their reading list" 
ON public.reading_list 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove from their reading list" ON public.reading_list;
CREATE POLICY "Users can remove from their reading list" 
ON public.reading_list 
FOR DELETE 
USING (auth.uid() = user_id);

-- STEP 8: Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'display_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- STEP 9: Create trigger for new user signup (drop first if exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STEP 10: Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 11: Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
