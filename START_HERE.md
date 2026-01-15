# 🎯 START HERE - Email Notifications Setup

## What This Does

When someone signs up for KiN-TXT:
1. ✉️ **They get** a beautiful welcome email with a verification link
2. 📧 **You get** an email notification with their details

---

## Quick Setup (15 minutes)

### 1️⃣ Get Resend Account
- Go to: https://resend.com
- Sign up (it's free!)
- Create an API key
- Copy it (starts with `re_`)

### 2️⃣ Configure Supabase
- Go to: https://supabase.com/dashboard/project/jcribtonvxrwhoixoioo
- Click **Edge Functions** → **Manage secrets**
- Add two secrets:
  - `RESEND_API_KEY` = (your Resend key)
  - `ADMIN_EMAIL` = (your email)

### 3️⃣ Deploy Functions
**Option A - Dashboard (Easiest):**
- In Supabase → Edge Functions → Deploy new function
- Create `notify-admin-signup` (copy from `supabase/functions/notify-admin-signup/index.ts`)
- Create `send-welcome-email` (copy from `supabase/functions/send-welcome-email/index.ts`)

**Option B - Command Line:**
```bash
npm install -g supabase
cd reading-app
supabase link --project-ref jcribtonvxrwhoixoioo
supabase functions deploy notify-admin-signup
supabase functions deploy send-welcome-email
```

### 4️⃣ Enable Email Verification
- Supabase → **Authentication** → **Settings**
- Turn ON "Enable email confirmations"
- Set Site URL: `https://marvelous-cendol-1331d6.netlify.app`
- Save

### 5️⃣ Test It!
- Go to your site: https://marvelous-cendol-1331d6.netlify.app
- Sign up with a real email
- Check both inboxes (user + admin)

---

## Need More Help?

- 📖 **SETUP_GUIDE.md** - Detailed instructions with explanations
- ✅ **QUICK_START.txt** - Simple checklist format
- 🔍 **Run `./check_setup.sh`** - Verify your setup automatically

---

## ⚡ Quick Links

- **Supabase Dashboard:** https://supabase.com/dashboard/project/jcribtonvxrwhoixoioo
- **Resend Dashboard:** https://resend.com
- **Your Live Site:** https://marvelous-cendol-1331d6.netlify.app

---

**Ready? Start with Step 1 - Get your Resend account! 🚀**
