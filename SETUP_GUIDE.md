# 🚀 Step-by-Step Setup Guide for Email Notifications

Follow these steps exactly to get your email notification system working.

---

## ✅ Step 1: Get a Resend Account (5 minutes)

1. Go to **https://resend.com**
2. Click **"Sign Up"** (it's free!)
3. Verify your email
4. Once logged in, click **"API Keys"** in the left sidebar
5. Click **"Create API Key"**
6. Name it: `KiN-TXT Production`
7. Click **"Create"**
8. **COPY THE API KEY** - it will look like: `re_xxxxxxxxxxxxxxxxxxxxx`
9. **Save it somewhere safe** - you'll need it in the next step!

---

## ✅ Step 2: Configure Supabase Secrets (5 minutes)

1. Go to **https://supabase.com/dashboard**
2. Click on your **KiN-TXT project** (jcribtonvxrwhoixoioo)
3. In the left sidebar, click **"Edge Functions"**
4. Click the **"Manage secrets"** button (top right)
5. Add the first secret:
   - Click **"Add new secret"**
   - Name: `RESEND_API_KEY`
   - Value: Paste your Resend API key from Step 1 (the `re_xxx...` key)
   - Click **"Create"**
6. Add the second secret:
   - Click **"Add new secret"** again
   - Name: `ADMIN_EMAIL`
   - Value: Your email address (where you want to receive signup notifications)
   - Click **"Create"**

---

## ✅ Step 3: Deploy Edge Functions (10 minutes)

### Option A: Using Supabase Dashboard (Easiest!)

1. In your Supabase dashboard, click **"Edge Functions"** in the left sidebar
2. Click **"Deploy a new function"**
3. For each function below, you'll need to:

#### Deploy `notify-admin-signup`:
1. Click **"Deploy a new function"**
2. Name: `notify-admin-signup`
3. Copy the code from: `reading-app/supabase/functions/notify-admin-signup/index.ts`
4. Paste it into the editor
5. Click **"Deploy function"**

#### Deploy `send-welcome-email`:
1. Click **"Deploy a new function"**
2. Name: `send-welcome-email`
3. Copy the code from: `reading-app/supabase/functions/send-welcome-email/index.ts`
4. Paste it into the editor
5. Click **"Deploy function"**

### Option B: Using Supabase CLI (If you prefer command line)

**First, install Supabase CLI:**
```bash
npm install -g supabase
```

**Then link your project:**
```bash
cd reading-app
supabase link --project-ref jcribtonvxrwhoixoioo
```
(You'll be asked to log in - follow the prompts)

**Deploy the functions:**
```bash
supabase functions deploy notify-admin-signup
supabase functions deploy send-welcome-email
```

---

## ✅ Step 4: Enable Email Verification (3 minutes)

1. In your Supabase dashboard, click **"Authentication"** in the left sidebar
2. Click **"Settings"** (under Authentication)
3. Scroll down to **"Email Auth"** section
4. Make sure these are set:
   - ✅ **"Enable email confirmations"** - Turn this ON
   - ✅ **"Secure email change"** - Turn this ON (recommended)
5. Scroll down to **"Email Templates"**
6. Click **"Confirm signup"** template
7. Keep the default or customize it if you want
8. Click **"Save"**
9. Scroll back up to **"Site URL"** and set it to:
   ```
   https://marvelous-cendol-1331d6.netlify.app
   ```
10. Click **"Save"**

---

## ✅ Step 5: Test the System! (5 minutes)

1. Go to your live site: **https://marvelous-cendol-1331d6.netlify.app**
2. Click **"Sign Up"**
3. Create a test account with a **real email address you can access**
4. Fill in:
   - Email: (your test email)
   - Password: (at least 6 characters)
   - Display Name: Test User
5. Click **"Sign Up"**
6. Check **TWO inboxes**:
   - ✉️ **Your test email** should receive the welcome email with verification link
   - 📧 **Your admin email** (from Step 2) should receive the signup notification

---

## ⚠️ Troubleshooting

### Not receiving emails?

**Check Resend Dashboard:**
1. Go to https://resend.com/emails
2. Look for recent emails
3. Check if they show as "Delivered" or if there are errors

**Check Supabase Logs:**
1. In Supabase Dashboard → Edge Functions
2. Click on `notify-admin-signup` or `send-welcome-email`
3. Click **"Logs"** tab
4. Look for any error messages

**Check Supabase Auth Logs:**
1. In Supabase Dashboard → Authentication → Logs
2. Look for signup events
3. Check if there are any errors

### Verification link not working?

1. Check that Site URL is set correctly in Authentication settings
2. Make sure email confirmation is enabled
3. Try the verification link again (they expire after 24 hours)

### Admin email not arriving?

1. Check your spam/junk folder
2. Verify `ADMIN_EMAIL` secret is set correctly in Edge Functions
3. Check Edge Function logs for errors

---

## 🎉 What Happens When Someone Signs Up

1. User fills out the signup form
2. Account is created in Supabase
3. **Welcome email** sent to user with:
   - Personalized greeting
   - Email verification link
   - Feature highlights
4. **Admin notification** sent to you with:
   - User's email and name
   - User ID
   - Signup timestamp
5. User clicks verification link in email
6. Account is verified and fully activated!

---

## 📝 Quick Reference

### Your Supabase Project
- **Project ID**: jcribtonvxrwhoixoioo
- **URL**: https://jcribtonvxrwhoixoioo.supabase.co
- **Dashboard**: https://supabase.com/dashboard/project/jcribtonvxrwhoixoioo

### Required Secrets (in Supabase Edge Functions)
- `RESEND_API_KEY` - Your Resend API key
- `ADMIN_EMAIL` - Your email for notifications

### Edge Functions to Deploy
- `notify-admin-signup` - Sends you notifications
- `send-welcome-email` - Sends welcome emails to users

---

## 🆘 Need Help?

If you get stuck:
1. Check the troubleshooting section above
2. Review the logs in Supabase and Resend
3. Make sure all secrets are set correctly
4. Try creating a new test account

---

**Ready to start? Begin with Step 1! 🚀**
