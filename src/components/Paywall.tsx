import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { OFFERING_ID, ENTITLEMENT_ID } from '@/lib/revenuecat';

/** A purchasable package surfaced from RevenueCat / StoreKit. */
interface PaywallPackage {
  identifier: string;
  title: string;
  priceString: string;
  // The raw RevenueCat package object passed back to purchasePackage().
  raw: any;
  badge?: string;
}

interface PaywallProps {
  /** Called after a successful purchase or restore that grants the entitlement. */
  onSuccess: () => void;
  /** Dismiss the paywall and continue with the limited free experience. */
  onClose: () => void;
}

const PRO_FEATURES = [
  'Save your place — pick up exactly where you left off',
  'Build your library — keep unlimited TXTs & books',
  'KiN social — clubs, connections & shared reading',
  'Streaks, reading stats & achievements',
  'Sync across all your devices',
];

/**
 * Native-only paywall backed by Apple In-App Purchase via RevenueCat.
 * All prices are pulled live from StoreKit — never hard-coded — per App Store rules.
 */
export function Paywall({ onSuccess, onClose }: PaywallProps) {
  const [packages, setPackages] = useState<PaywallPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        const offerings = await Purchases.getOfferings();
        const offering = OFFERING_ID
          ? offerings.all[OFFERING_ID]
          : offerings.current;

        const pkgs: PaywallPackage[] = (offering?.availablePackages ?? []).map((p: any) => ({
          identifier: p.identifier,
          title: p.product?.title ?? p.identifier,
          priceString: p.product?.priceString ?? '',
          raw: p,
          // Highlight the annual / longest plan as best value.
          badge: /annual|year/i.test(p.packageType ?? p.identifier) ? 'Best value' : undefined,
        }));

        if (!cancelled) {
          setPackages(pkgs);
          setLoadError(pkgs.length === 0);
        }
      } catch (err) {
        console.warn('Paywall: failed to load offerings', err);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handlePurchase = async (pkg: PaywallPackage) => {
    setBusyId(pkg.identifier);
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const result: any = await Purchases.purchasePackage({ aPackage: pkg.raw });
      const active = result?.customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
      if (active) {
        toast.success('Welcome to KiN-TXT Pro!');
        onSuccess();
      } else {
        toast.error('Purchase completed but access was not granted. Try Restore Purchases.');
      }
    } catch (err: any) {
      if (!err?.userCancelled) {
        toast.error(err?.message ?? 'Purchase failed. Please try again.');
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const { customerInfo }: any = await Purchases.restorePurchases();
      if (customerInfo?.entitlements?.active?.[ENTITLEMENT_ID]) {
        toast.success('Purchases restored.');
        onSuccess();
      } else {
        toast.info('No previous purchases found for this Apple ID.');
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not restore purchases.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex flex-col bg-background"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute right-4 z-50 p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex-1 overflow-y-auto px-6 pt-16 pb-10 flex flex-col items-center">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-muted-foreground">KiN-TXT</p>
        <h1 className="font-display text-3xl tracking-wide text-foreground mt-2 mb-1 text-center">
          KiN-TXT Pro
        </h1>
        <p className="text-sm text-muted-foreground text-center max-w-xs mb-8">
          Unlock the full kinetic reading experience.
        </p>

        {/* Features */}
        <ul className="w-full max-w-sm space-y-2.5 mb-8">
          {PRO_FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-3 text-sm text-foreground/90">
              <Check className="w-4 h-4 text-foreground shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        {/* Packages */}
        <div className="w-full max-w-sm space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : loadError ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              Subscriptions are unavailable right now. Please check your connection and try again.
            </p>
          ) : (
            packages.map((pkg) => (
              <button
                key={pkg.identifier}
                onClick={() => handlePurchase(pkg)}
                disabled={busyId !== null}
                className="relative w-full rounded-2xl border border-foreground/30 bg-foreground/5 px-5 py-4 flex items-center justify-between hover:bg-foreground/10 transition-colors disabled:opacity-50"
              >
                {pkg.badge && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-bold font-display tracking-widest px-2.5 py-0.5 rounded-full uppercase">
                    {pkg.badge}
                  </span>
                )}
                <span className="font-display tracking-wide text-foreground">{pkg.title}</span>
                <span className="text-foreground font-medium">
                  {busyId === pkg.identifier ? <Loader2 className="w-4 h-4 animate-spin" /> : pkg.priceString}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Restore */}
        <button
          onClick={handleRestore}
          disabled={restoring}
          className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {restoring ? 'Restoring…' : 'Restore Purchases'}
        </button>

        {/* Legal / renewal disclosure (required by App Store for subscriptions) */}
        <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground/70 text-center max-w-xs">
          Subscriptions are billed through your Apple ID and renew automatically unless cancelled
          at least 24 hours before the end of the current period. Manage or cancel anytime in your
          device Settings.{' '}
          <a href="/terms" className="underline underline-offset-2">Terms</a>
          {' · '}
          <a href="/privacy" className="underline underline-offset-2">Privacy</a>
        </p>
      </div>
    </motion.div>
  );
}
