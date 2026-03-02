-- Create a COMPREHENSIVE and SAFE version of handle_new_user
-- This version merges profile creation with custom domain notifications
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  verification_url TEXT;
  function_url TEXT := 'https://pxvnylvkzdcuuauppull.supabase.co/functions/v1/send-welcome-email';
  admin_function_url TEXT := 'https://pxvnylvkzdcuuauppull.supabase.co/functions/v1/notify-admin-signup';
  production_domain TEXT := 'https://kin-txt.com';
BEGIN
  -- 1. Create the user profile in public.profiles (RESTORED LOGIC)
  BEGIN
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (
      NEW.id, 
      NEW.email, 
      COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1))
    );
  EXCEPTION WHEN OTHERS THEN
    -- If profile already exists or fails, log it but don't block the trigger
    RAISE WARNING 'Profile creation skipped or failed for %: %', NEW.id, SQLERRM;
  END;

  -- 2. Build verification URL for custom domain
  BEGIN
    verification_url := production_domain || '/auth/confirm?token=' || NEW.confirmation_token;
  EXCEPTION WHEN OTHERS THEN
    verification_url := NULL;
  END;
  
  -- 3. Call the welcome email function (HARDCODED URL for reliability)
  BEGIN
    PERFORM
      net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object(
          'email', NEW.email,
          'displayName', NEW.raw_user_meta_data->>'display_name',
          'verificationUrl', verification_url
        )
      );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to send welcome email: %', SQLERRM;
  END;
  
  -- 4. Call the admin notification function
  BEGIN
    PERFORM
      net.http_post(
        url := admin_function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object(
          'email', NEW.email,
          'displayName', NEW.raw_user_meta_data->>'display_name',
          'userId', NEW.id::text,
          'createdAt', NEW.created_at::text
        )
      );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to send admin notification: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
