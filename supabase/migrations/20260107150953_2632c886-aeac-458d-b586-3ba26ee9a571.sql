-- Update handle_new_user function with input validation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  validated_display_name text;
BEGIN
  -- Extract and validate display_name from raw_user_meta_data
  validated_display_name := new.raw_user_meta_data ->> 'display_name';
  
  -- Handle NULL or empty values
  IF validated_display_name IS NOT NULL THEN
    -- Trim whitespace
    validated_display_name := trim(validated_display_name);
    
    -- Set to NULL if empty after trimming
    IF validated_display_name = '' THEN
      validated_display_name := NULL;
    ELSE
      -- Truncate to max 100 characters
      validated_display_name := left(validated_display_name, 100);
      
      -- Remove control characters (keep printable chars only)
      validated_display_name := regexp_replace(validated_display_name, E'[\\x00-\\x1F\\x7F]', '', 'g');
    END IF;
  END IF;

  INSERT INTO public.profiles (id, email, display_name)
  VALUES (new.id, new.email, validated_display_name);
  
  RETURN new;
EXCEPTION
  WHEN others THEN
    -- Log error but don't block user creation
    RAISE WARNING 'Failed to create profile for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$;