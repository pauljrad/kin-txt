-- Create a function to handle new user signups and send notifications
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  verification_url TEXT;
  function_url TEXT;
  admin_function_url TEXT;
BEGIN
  -- Get the Supabase project URL from environment
  function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-welcome-email';
  admin_function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/notify-admin-signup';
  
  -- Build verification URL if email is not confirmed
  IF NEW.email_confirmed_at IS NULL THEN
    verification_url := current_setting('app.settings.site_url', true) || '/auth/confirm?token=' || NEW.confirmation_token;
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

-- Create trigger on auth.users for new signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA net TO postgres, anon, authenticated, service_role;
