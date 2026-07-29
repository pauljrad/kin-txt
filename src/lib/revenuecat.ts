import { Capacitor } from '@capacitor/core';

/**
 * RevenueCat configuration for the native iOS app.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️  YOU MUST FILL THESE IN before the IAP flow will work:
 *   1. Create a RevenueCat project (https://app.revenuecat.com) and add your iOS app.
 *   2. Paste the **iOS Public API key** below (starts with "appl_").
 *   3. In App Store Connect, create your auto-renewable subscription products,
 *      then add them to a RevenueCat "Offering" and an "Entitlement".
 *   4. Set ENTITLEMENT_ID to the entitlement identifier you created (e.g. "pro").
 *   5. (Optional) set OFFERING_ID if you use a non-default offering.
 *
 * These are *public* keys — safe to ship in the client bundle.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const REVENUECAT_IOS_API_KEY = 'appl_UIjbCEoLAJJoYjqESXeKxbYhmvA';

/**
 * The entitlement that, when active, unlocks full access ("Pro").
 * NOTE: must match the RevenueCat entitlement *identifier* exactly — it is
 * case-sensitive. The RevenueCat entitlement was created as "Pro" (capital P)
 * and RevenueCat locks the identifier after creation, so this stays "Pro".
 */
export const ENTITLEMENT_ID = 'Pro';

/** Offering to present in the paywall. `null` uses the RevenueCat default offering. */
export const OFFERING_ID: string | null = null;

let configured = false;

/** True only inside the native iOS/Android shell. */
export const isNativeApp = () => Capacitor.isNativePlatform();

/**
 * Whether a real RevenueCat key has been set. Until you paste your `appl_` key,
 * the free/Pro paywall gating stays OFF (the app "fails open"), so logged-in
 * users keep full access instead of being wrongly treated as free.
 */
export const isRevenueCatConfigured = () =>
  isNativeApp() && !REVENUECAT_IOS_API_KEY.includes('REPLACE_WITH');

/**
 * Initialise the RevenueCat SDK. Safe to call on web (no-op) and safe to call
 * multiple times. Dynamically imported so the web bundle never loads the plugin.
 */
export async function configureRevenueCat(appUserID?: string | null): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');
    if (!configured) {
      await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
      await Purchases.configure({
        apiKey: REVENUECAT_IOS_API_KEY,
        appUserID: appUserID ?? undefined,
      });
      configured = true;
    } else if (appUserID) {
      // Already configured (e.g. anonymous) — associate the signed-in user.
      await Purchases.logIn({ appUserID });
    }
  } catch (err) {
    console.warn('RevenueCat configure failed:', err);
  }
}

/** Associate purchases with a Supabase user id once they sign in. */
export async function identifyRevenueCatUser(appUserID: string): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    await Purchases.logIn({ appUserID });
  } catch (err) {
    console.warn('RevenueCat logIn failed:', err);
  }
}

/** Reset to an anonymous RevenueCat user (call on sign-out). */
export async function logoutRevenueCatUser(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    await Purchases.logOut();
  } catch (err) {
    // logOut throws if already anonymous — safe to ignore.
  }
}

/** Whether the active entitlement is currently granted. */
export async function hasActiveEntitlement(): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.getCustomerInfo();
    return Boolean(customerInfo.entitlements.active[ENTITLEMENT_ID]);
  } catch (err) {
    console.warn('RevenueCat getCustomerInfo failed:', err);
    return false;
  }
}
