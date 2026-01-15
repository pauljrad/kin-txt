# Email Notification Setup for KiN-TXT

This document explains how to configure the email notification system for new user signups.

## Overview

When a new user signs up for KiN-TXT, the system automatically:
1. ✅ Sends a **welcome email** to the new user with a verification link
2. 📧 Sends a **notification email** to you (the admin) about the new signup
3. 🔐 Requires email verification before the user can fully access the app

## Setup Steps

### 1. Configure Resend API Key

You need a [Resend](https://resend.com) account to send emails.

1. Sign up at https://resend.com
2. Get your API key from the dashboard
3. Add it to your Supabase project:
   ```bash
   # In Supabase Dashboard:
   # Settings → Edge Functions → Add Secret
   # Name: RESEND_API_KEY
   # Value: re_your_api_key_here
   ```

### 2. Configure Admin Email

Set your email address to receive signup notifications:

```bash
# In Supabase Dashboard:
# Settings → Edge Functions → Add Secret
# Name: ADMIN_EMAIL
# Value: your-email@example.com
```

### 3. Configure Email Domain (Optional but Recommended)

By default, emails come from `onboarding@resend.dev` and `notifications@resend.dev`. To use your own domain:

1. Add and verify your domain in Resend
2. Update the email functions:
   - `send-welcome-email/index.ts`: Change `from: "KiN-TXT <onboarding@resend.dev>"`
   - `notify-admin-signup/index.ts`: Change `from: "KiN-TXT Notifications <notifications@resend.dev>"`

### 4. Enable Email Confirmation in Supabase

1. Go to Supabase Dashboard → Authentication → Settings
2. Enable "Enable email confirmations"
3. Set the "Site URL" to your production URL: `https://marvelous-cendol-1331d6.netlify.app`
4. Configure email templates (optional - customize the verification email)

### 5. Deploy the Edge Functions

Deploy the new and updated functions:

```bash
cd reading-app

# Deploy the admin notification function
supabase functions deploy notify-admin-signup

# Deploy the updated welcome email function
supabase functions deploy send-welcome-email
```

### 6. Run Database Migration

Apply the database migration to set up the webhook:

```bash
# Push the migration to your Supabase project
supabase db push
```

**Note:** The database trigger approach may require the `pg_net` extension. If you encounter issues, the current implementation in `Login.tsx` already handles calling both functions directly, which is simpler and more reliable.

## How It Works

### User Signup Flow

1. User fills out signup form with email, password, and display name
2. Account is created in Supabase Auth
3. Two emails are sent simultaneously:
   - **Welcome email** to user with:
     - Personalized greeting
     - Feature highlights
     - Email verification link (managed by Supabase)
   - **Admin notification** to you with:
     - User's email and display name
     - User ID and signup timestamp
     - Confirmation that welcome email was sent

### Email Verification

- Supabase handles email verification automatically
- Users receive a verification link in their welcome email
- Until verified, their `email_confirmed_at` field is null
- You can check verification status in Supabase Dashboard → Authentication → Users

## Testing

### Test Locally

1. Run the dev server: `npm run dev`
2. Create a new account with a real email address
3. Check that you receive the admin notification
4. Check that the new user receives the welcome email

### Check Email Delivery

- View sent emails in Resend Dashboard → Logs
- Check Supabase Edge Function logs for any errors
- Verify user creation in Supabase Dashboard → Authentication → Users

## Troubleshooting

### Emails not sending?

1. Check that `RESEND_API_KEY` is set in Supabase Edge Function secrets
2. Check that `ADMIN_EMAIL` is set for admin notifications
3. View Edge Function logs in Supabase Dashboard → Edge Functions → Logs
4. Check Resend dashboard for delivery status

### Verification links not working?

1. Ensure "Site URL" is correctly set in Supabase Auth settings
2. Check that email confirmation is enabled
3. Verify the redirect URL in `useAuth.tsx` matches your production URL

### Admin notifications going to wrong email?

- Update the `ADMIN_EMAIL` secret in Supabase Edge Function settings

## Environment Variables Summary

| Variable | Location | Purpose |
|----------|----------|---------|
| `RESEND_API_KEY` | Supabase Edge Functions | API key for sending emails via Resend |
| `ADMIN_EMAIL` | Supabase Edge Functions | Your email address for signup notifications |

## Files Modified

- ✅ `supabase/functions/notify-admin-signup/index.ts` - New admin notification function
- ✅ `supabase/functions/send-welcome-email/index.ts` - Updated with verification link support
- ✅ `supabase/migrations/20260115000000_setup_signup_notifications.sql` - Database trigger (optional)
- ✅ `supabase/config.toml` - Added new function configurations
- ✅ `src/pages/Login.tsx` - Calls both email functions on signup

## Next Steps

After setup is complete:
1. Test the signup flow with a real email
2. Verify you receive admin notifications
3. Verify new users receive welcome emails
4. Check that email verification works correctly
5. Deploy to production!
