# KiN-TXT — iOS App Store Submission Checklist

This is the step-by-step guide to get KiN-TXT approved on the App Store. The code
changes for review-readiness are **done** (see "What was changed in code" at the
bottom). The remaining items below are things only you can do — they involve your
Apple Developer account, App Store Connect, RevenueCat, and Xcode.

> Rule of thumb that keeps wrapped apps approved: the app must feel like an app
> (it now boots into onboarding + the reader, not the marketing site), it must let
> users delete their account (done), and it must not point users to an external
> website to pay (done — iOS now uses Apple In-App Purchase).

---

## 1. Apple Developer account & App Store Connect
- [ ] Paid Apple Developer Program membership active ($99/yr).
- [ ] In App Store Connect, create the app record with Bundle ID `com.kintxt.app`.
- [ ] Set the **Privacy Policy URL**: `https://kin-txt.com/privacy`
- [ ] Set the **Support URL**: `https://kin-txt.com`
- [ ] Age rating questionnaire (KiN has user-to-user "KiNs" + news → likely 12+).

## 2. Create the subscription products (required before IAP works)
- [ ] App Store Connect → your app → **Subscriptions** → create a Subscription Group.
- [ ] Add auto-renewable subscriptions, e.g.:
  - `com.kintxt.app.pro.monthly`  — £3.99 / month
  - `com.kintxt.app.pro.annual`   — £30 / year
- [ ] Add a localized display name, description, and review screenshot for each.
- [ ] Fill in the **Paid Apps Agreement** + banking/tax in Agreements, Tax, and Banking
      (IAP will NOT load until this is "Active").

## 3. RevenueCat setup
- [ ] Create a project at https://app.revenuecat.com and add your iOS app
      (Bundle ID `com.kintxt.app`), uploading the App Store Connect API key.
- [ ] Create an **Entitlement** — its identifier must match `ENTITLEMENT_ID`
      in `src/lib/revenuecat.ts` (currently `"pro"`).
- [ ] Create an **Offering** with the monthly + annual products attached.
- [ ] Copy the **iOS Public SDK key** (starts `appl_`) into `REVENUECAT_IOS_API_KEY`
      in `src/lib/revenuecat.ts`.
- [ ] RevenueCat → Integrations → **Webhooks**: point it at
      `https://<your-project>.supabase.co/functions/v1/revenuecat-webhook`
      and set an Authorization header value.

### Code config to fill in — `src/lib/revenuecat.ts`
```
REVENUECAT_IOS_API_KEY = 'appl_...'   // ← from RevenueCat
ENTITLEMENT_ID         = 'pro'         // ← must match RevenueCat entitlement id
OFFERING_ID            = null          // ← only set if not using the default offering
```

## 4. Supabase — deploy the new edge functions & secrets
From the project folder:
```
npx supabase functions deploy delete-account
npx supabase functions deploy revenuecat-webhook
```
Set secrets (Supabase dashboard → Edge Functions → Secrets):
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (already present for stripe-webhook)
- [ ] `SUPABASE_ANON_KEY`
- [ ] `REVENUECAT_WEBHOOK_AUTH` — the exact value you set in the RevenueCat webhook.

## 5. Build the iOS app
```
npm run cap:sync          # build web + copy into iOS project
cd ios/App && pod install # install native pods incl. RevenueCat (needs CocoaPods)
npm run cap:open          # open in Xcode
```
In Xcode:
- [ ] Signing & Capabilities → select your Team, confirm Bundle ID `com.kintxt.app`.
- [ ] Add the **In-App Purchase** capability.
- [ ] Set Version (e.g. `1.0.0`) and Build (`1`).
- [ ] Generate app icons (`npx @capacitor/assets generate --ios` from a 1024² icon).

## 6. Test IAP in the sandbox (do NOT skip — this is what reviewers do)
- [ ] App Store Connect → Users and Access → **Sandbox Testers** → create one.
- [ ] On a real device signed into the sandbox Apple ID, run the app:
  - Tap a locked tab (Ebooks/News) → paywall appears with live prices.
  - Purchase → access unlocks, lock icons disappear.
  - Kill & relaunch → still unlocked.
  - **Restore Purchases** works on a fresh install.
  - Confirm the `subscriptions` row in Supabase updates (RevenueCat webhook).

## 7. App Privacy "nutrition label" (App Store Connect → App Privacy)
Declare (matches the Privacy Policy):
- [ ] **Contact Info → Email** — linked to identity, app functionality.
- [ ] **User Content** (the texts users add) — app functionality.
- [ ] **Identifiers / Purchases** — handled by Apple/RevenueCat for subscriptions.
- [ ] Not used for tracking; no ads.

## 8. App Review information (the box reviewers actually read)
- [ ] Provide a **demo account** (email + password) with Pro already granted, OR a
      note that the reviewer can browse as guest + buy via sandbox. A working demo
      account is the safest — reviewers must be able to see the gated content.
- [ ] Review notes suggestion:
      > "Subscriptions are sold via Apple In-App Purchase (RevenueCat). The free
      >  tier has full reading functionality but nothing is saved: reading progress
      >  is not retained after closing the app, only one document at a time, and no
      >  KiN social, streaks or reading stats. Pro unlocks saved progress, an
      >  unlimited library, KiN social, and streaks/achievements. A demo Pro account
      >  is provided. Account deletion is in Account & Settings → Delete account."

## 9. Screenshots & metadata
- [ ] 6.7" iPhone screenshots (required) — onboarding, reader, library, paywall.
- [ ] Description, keywords, promotional text.
- [ ] Submit for review.

---

## What was changed in code (already done)
- **Boots into the app, not the website** — native `/` now redirects to `/home`
  (`src/App.tsx`). Web (kin-txt.com) still shows the marketing landing.
- **Onboarding** — the existing (previously unused) onboarding now runs on first
  native launch (`src/pages/Index.tsx`, `src/components/Onboarding.tsx`); replayable
  from Account & Settings.
- **Apple IAP via RevenueCat** — `src/lib/revenuecat.ts`, `src/hooks/useHasAccess.ts`,
  `src/components/Paywall.tsx`. Native Pricing page now shows the IAP paywall instead
  of "visit kin-txt.com" (`src/pages/Pricing.tsx`). Web still uses Stripe unchanged.
- **Free vs Pro gating (native)** — free users get full reading but nothing is
  saved: ephemeral progress, a single document, no KiN social, no streaks/stats.
  Enforced by a `freeMode` flag in `src/lib/documentDatabase.ts` (reuses the
  existing guest storage path) that is enabled only on native for non-Pro users
  (`proGate` in `src/pages/Index.tsx`). Attempting a Pro action opens the paywall.
- **Account deletion (Guideline 5.1.1(v))** — `supabase/functions/delete-account`,
  `deleteAccount()` in `src/hooks/useAuth.tsx`, UI in `src/components/AccountSettings.tsx`.
- **Entitlement sync** — `supabase/functions/revenuecat-webhook` updates the existing
  `subscriptions` table so `useSubscription` keeps working.
- **Legal** — Terms/Privacy/Data/Payment updated with auto-renewable subscription
  disclosure and in-app account/data deletion; reachable from Account & Settings.
- **Info.plist** — `ITSAppUsesNonExemptEncryption=false` (skips the export question).

All changes are gated by `Capacitor.isNativePlatform()` so the web app is unaffected,
except the shared legal pages, which were intentionally improved for both.
