-- Create reading_list table for saved articles
CREATE TABLE public.reading_list (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  link TEXT NOT NULL,
  source TEXT,
  image_url TEXT,
  saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, link)
);

-- Enable Row Level Security
ALTER TABLE public.reading_list ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own reading list" 
ON public.reading_list 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their reading list" 
ON public.reading_list 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their reading list" 
ON public.reading_list 
FOR DELETE 
USING (auth.uid() = user_id);