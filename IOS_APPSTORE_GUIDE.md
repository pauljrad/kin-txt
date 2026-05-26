# KiN-TXT → iOS App Store Setup Guide

Everything in this file is what **you** will do once your Apple Developer account is approved and Xcode is installed.

---

## Step 1: Install Xcode

1. Open the **Mac App Store**
2. Search for **Xcode** → Install (it's ~15GB, takes a while)
3. After install, open Xcode once to accept the licence agreement
4. Run in Terminal: `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`

---

## Step 2: Install CocoaPods

CocoaPods manages the native iOS dependencies for Capacitor.

```bash
sudo gem install cocoapods
```

---

## Step 3: Add the iOS Platform

Run these commands from the `reading-app` folder:

```bash
npx cap init          # only needed once — already done
npx cap add ios       # creates the ios/ Xcode project
```

This creates an `ios/` folder in your project. It's in `.gitignore` so it stays local.

---

## Step 4: Build & Sync

Every time you update the web app and want to test/submit the iOS build:

```bash
npm run cap:sync
```

This runs `npm run build` (builds the web app) then `npx cap sync ios` (copies the built files into the Xcode project).

---

## Step 5: App Icons

The iOS app needs icons in specific sizes. Once you have the `ios/` project:

1. Use [**Capacitor Assets**](https://github.com/ionic-team/capacitor-assets) to auto-generate all sizes from your 1024×1024 icon:
   ```bash
   npx @capacitor/assets generate --ios
   ```
   It will use `assets/icon.png` (1024×1024) — copy your `public/pwa-512x512-v3.png` to `assets/icon.png` and upscale it to 1024px first.

---

## Step 6: Open Xcode

```bash
npm run cap:open
```

In Xcode:
1. Select your project in the left panel
2. Go to **Signing & Capabilities** tab
3. Set **Team** to your Apple Developer account
4. Confirm **Bundle Identifier** is `com.kintxt.app`
5. Set **Version** (e.g. `1.0.0`) and **Build** (e.g. `1`)

---

## Step 7: Test on a Device or Simulator

```bash
npm run cap:run
```

Or press the **▶ Play** button in Xcode with a Simulator or plugged-in iPhone selected.

---

## Step 8: Archive & Submit

1. In Xcode: **Product → Archive**
2. When the Organizer opens: click **Distribute App → App Store Connect**
3. Follow the prompts — Xcode uploads it automatically

---

## Step 9: App Store Connect

Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com) and:
- Create a new App (Bundle ID: `com.kintxt.app`)
- Add screenshots (6.5" iPhone required, 5.5" optional)
- Write description, keywords, support URL (`https://kin-txt.com`)
- Set privacy policy URL: `https://kin-txt.com/privacy`
- Set age rating
- Submit for review (usually 1–3 days)

---

## Key Notes

- **Your Vercel site (kin-txt.com) is completely unaffected** — the iOS app and web app are independent
- **Subscriptions**: In the iOS app, the payment buttons are hidden. Users see "visit kin-txt.com to subscribe". This is fully App Store compliant.
- **The `ios/` folder is gitignored** — to recreate it on a new machine: `npx cap add ios && npx cap sync ios`
- **Capacitor version**: 8.x (installed)
- **Bundle ID**: `com.kintxt.app` (set in `capacitor.config.ts`)
