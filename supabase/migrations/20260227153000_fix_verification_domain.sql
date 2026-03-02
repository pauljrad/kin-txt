-- Update the handle_new_user function to use a hardcoded production domain for verification links
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  verification_url TEXT;
  function_url TEXT;
  admin_function_url TEXT;
  production_domain TEXT := 'https://kin-txt.com';
BEGIN
  -- Get the Supabase project URL from environment
  function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-welcome-email';
  admin_function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/notify-admin-signup';
  
  -- Build verification URL if email is not confirmed
  -- We now use the hardcoded production domain instead of app.settings.site_url
  IF NEW.email_confirmed_at IS NULL THEN
    verification_url := production_domain || '/auth/confirm?token=' || NEW.confirmation_token;
  END IF;
  
  -- Call the welcome email function (async, non-blocking)
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
  
  -- Call the admin notification function (async, non-blocking)
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
