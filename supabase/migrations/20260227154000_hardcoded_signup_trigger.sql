-- Create a Simplified and HARDCODED version of handle_new_user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  verification_url TEXT;
  function_url TEXT := 'https://pxvnylvkzdcuuauppull.supabase.co/functions/v1/send-welcome-email';
  admin_function_url TEXT := 'https://pxvnylvkzdcuuauppull.supabase.co/functions/v1/notify-admin-signup';
  production_domain TEXT := 'https://kin-txt.com';
BEGIN
  -- Build verification URL
  BEGIN
    verification_url := production_domain || '/auth/confirm?token=' || NEW.confirmation_token;
  EXCEPTION WHEN OTHERS THEN
    verification_url := NULL;
  END;
  
  -- Call the welcome email function (HARDCODED URL, NO SETTINGS DEPENDPENCY)
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
  
  -- Call the admin notification function (HARDCODED URL)
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
