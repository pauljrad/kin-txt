import { useState, useEffect, useCallback } from 'react';
import { useSubscription } from './useSubscription';
import { isNativeApp, ENTITLEMENT_ID } from '@/lib/revenuecat';

/**
 * Single source of truth for "does this user have full access?".
 *
 * - Web (kin-txt.com): unchanged — derived purely from the Supabase
 *   `subscriptions` table via {@link useSubscription}.
 * - Native iOS app: access is granted when the RevenueCat entitlement is active,
 *   OR when the Supabase record already marks them subscribed (so existing
 *   "lifetime"/grandfathered users are never locked out).
 *
 * Returns a `refresh()` so the paywall can re-check immediately after a purchase
 * or restore without waiting for a listener.
 */
export function useHasAccess() {
  const { isSubscribed, loading: subLoading } = useSubscription();
  const [entitled, setEntitled] = useState(false);
  const [nativeLoading, setNativeLoading] = useState(isNativeApp());

  const refresh = useCallback(async () => {
    if (!isNativeApp()) return;
    setNativeLoading(true);
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const { customerInfo } = await Purchases.getCustomerInfo();
      setEntitled(Boolean(customerInfo.entitlements.active[ENTITLEMENT_ID]));
    } catch (err) {
      console.warn('useHasAccess: entitlement check failed', err);
      setEntitled(false);
    } finally {
      setNativeLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isNativeApp()) return;

    let cancelled = false;
    // Callback id returned by addCustomerInfoUpdateListener, used to remove it.
    let listenerId: string | undefined;

    (async () => {
      await refresh();
      try {
        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        // Keep entitlement state live as purchases/renewals happen.
        listenerId = await Purchases.addCustomerInfoUpdateListener((info) => {
          if (!cancelled) {
            setEntitled(Boolean(info?.entitlements?.active?.[ENTITLEMENT_ID]));
          }
        });
      } catch {
        /* listener unavailable — refresh() already set initial state */
      }
    })();

    return () => {
      cancelled = true;
      if (listenerId) {
        import('@revenuecat/purchases-capacitor')
          .then(({ Purchases }) =>
            Purchases.removeCustomerInfoUpdateListener({ listenerToRemove: listenerId! }),
          )
          .catch(() => { /* nothing to remove */ });
      }
    };
  }, [refresh]);

  if (!isNativeApp()) {
    return { hasAccess: isSubscribed, loading: subLoading, refresh };
  }

  // Native: entitlement OR existing DB subscription (grandfathered users).
  return {
    hasAccess: entitled || isSubscribed,
    loading: nativeLoading || subLoading,
    refresh,
  };
}
