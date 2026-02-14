-- Add avatar_color column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_color TEXT DEFAULT '#FFD600';

-- Update handle_new_user function to ensure a default color is set
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_color)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'display_name', '#FFD600');
  RETURN new;
END;
$$;
