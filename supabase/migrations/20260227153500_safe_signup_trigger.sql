-- Create a SAFE version of handle_new_user that won't block signups if notifications fail
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  verification_url TEXT;
  function_url TEXT;
  admin_function_url TEXT;
  production_domain TEXT := 'https://kin-txt.com';
BEGIN
  -- Attempt to get URLs from settings, fallback to hardcoded production domain if missing
  BEGIN
    function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-welcome-email';
    admin_function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/notify-admin-signup';
  EXCEPTION WHEN OTHERS THEN
    -- Fallback URLs (using the project ref pxvnylvkzdcuuauppull for reliability)
    function_url := 'https://pxvnylvkzdcuuauppull.supabase.co/functions/v1/send-welcome-email';
    admin_function_url := 'https://pxvnylvkzdcuuauppull.supabase.co/functions/v1/notify-admin-signup';
  END;
  
  -- Build verification URL
  BEGIN
    verification_url := production_domain || '/auth/confirm?token=' || NEW.confirmation_token;
  EXCEPTION WHEN OTHERS THEN
    verification_url := NULL;
  END;
  
  -- Call the welcome email function (SAFE WRAPPER)
  BEGIN
    IF function_url IS NOT NULL THEN
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
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log error to Postgres log but DON'T fail the transaction
    RAISE WARNING 'Failed to send welcome email: %', SQLERRM;
  END;
  
  -- Call the admin notification function (SAFE WRAPPER)
  BEGIN
    IF admin_function_url IS NOT NULL THEN
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
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to send admin notification: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
