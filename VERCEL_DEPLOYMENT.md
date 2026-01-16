# 🚀 Deploy KiN-TXT to Vercel (Free!)

## Quick Setup (5 minutes)

### Step 1: Sign Up for Vercel

1. Go to: **https://vercel.com**
2. Click **"Sign Up"**
3. Choose **"Continue with GitHub"** (easiest!)
4. Authorize Vercel to access your GitHub

### Step 2: Import Your Project

1. Once logged in, click **"Add New..."** → **"Project"**
2. You'll see a list of your GitHub repositories
3. Find **"kin-txt"** (or "reading-app")
4. Click **"Import"**

### Step 3: Configure Build Settings

Vercel should auto-detect your settings, but verify:

- **Framework Preset:** Vite
- **Root Directory:** `reading-app` (if prompted)
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

### Step 4: Add Environment Variables

Before deploying, add your Supabase environment variables:

1. Click **"Environment Variables"** section
2. Add each variable from your `.env` file:

```
VITE_SUPABASE_URL=https://jcribtonvxrwhoixoioo.supabase.co
VITE_SUPABASE_ANON_KEY=(your anon key)
VITE_SUPABASE_PROJECT_ID=jcribtonvxrwhoixoioo
```

### Step 5: Deploy!

1. Click **"Deploy"**
2. Wait 1-2 minutes for the build
3. You'll get a free URL like: `kin-txt.vercel.app`
4. Done! 🎉

## After Deployment

### Get Your New URL

Your app will be live at something like:
- `https://kin-txt.vercel.app`
- Or `https://kin-txt-yourname.vercel.app`

### Update Supabase Settings

Important! Update your Supabase Auth settings with the new URL:

1. Go to: https://supabase.com/dashboard/project/jcribtonvxrwhoixoioo
2. Click **Authentication** → **URL Configuration**
3. Update **Site URL** to your new Vercel URL
4. Add to **Redirect URLs**: `https://your-vercel-url.vercel.app/**`
5. Save

## Automatic Deployments

Great news! Every time you push to GitHub, Vercel will automatically:
- Build your app
- Deploy the new version
- Give you a preview URL

## Custom Domain (Optional)

Want to use your own domain?
1. In Vercel dashboard, go to your project
2. Click **Settings** → **Domains**
3. Add your custom domain
4. Follow the DNS instructions

## Benefits Over Netlify

✅ Unlimited bandwidth (Netlify limits this)
✅ No credit card required
✅ Faster build times
✅ Better for React/Vite apps
✅ Generous free tier with no hidden costs

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Your Vercel Dashboard: https://vercel.com/dashboard
