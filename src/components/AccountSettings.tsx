import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, LogOut, RefreshCw, Crown, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/hooks/useAuth';
import { ENTITLEMENT_ID, getManagementURL } from '@/lib/revenuecat';
import { useHasAccess } from '@/hooks/useHasAccess';

interface AccountSettingsProps {
  onClose: () => void;
  /** Open the in-app paywall (native only). */
  onUpgrade?: () => void;
}

const LEGAL_LINKS = [
  { label: 'Terms of Use', href: '/terms' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Data Policy', href: '/data' },
  { label: 'Copyright Policy', href: '/copyright' },
  { label: 'Payment Policy', href: '/payment-policy' },
];

/**
 * Account & settings panel. Reachable from the home toolbar.
 *
 * Pre-Pro (native): upgrade + Restore Purchases. Active subscribers instead get
 * subscription management, which hands off to Apple. Plus sign-out and links to
 * all legal policies.
 *
 * Replaying the tutorial lives on the "i" button in the home toolbar, not here.
 *
 * NOTE: in-app account deletion was removed on the user's instruction. Apple
 * Review Guideline 5.1.1(v) requires apps that support account creation to
 * offer deletion in-app, so this is a known review risk, accepted deliberately.
 * The `deleteAccount` implementation is still in `useAuth` if it needs to come
 * back — only the UI was removed.
 */
export function AccountSettings({ onClose, onUpgrade }: AccountSettingsProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const isNative = Capacitor.isNativePlatform();

  const { hasAccess } = useHasAccess();
  const isPro = isNative && hasAccess;

  const [restoring, setRestoring] = useState(false);

  // App Store subscriptions can only be cancelled through Apple, so this hands
  // the user off to Apple's own subscription page rather than trying to cancel
  // in-app (which Apple does not permit for StoreKit purchases).
  const handleManageSubscription = async () => {
    const url = await getManagementURL();
    if (url) {
      window.open(url, '_blank');
      return;
    }
    // No management URL — send them to Apple's subscriptions page directly.
    window.location.href = 'itms-apps://apps.apple.com/account/subscriptions';
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
    navigate('/login');
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const { customerInfo }: any = await Purchases.restorePurchases();
      if (customerInfo?.entitlements?.active?.[ENTITLEMENT_ID]) {
        toast.success('Purchases restored.');
        onClose();
      } else {
        toast.info('No previous purchases found for this Apple ID.');
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not restore purchases.');
    } finally {
      setRestoring(false);
    }
  };

  const Row = ({ icon: Icon, label, onClick, danger }: {
    icon: any; label: string; onClick: () => void; danger?: boolean;
  }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-colors text-left ${
        danger
          ? 'border-destructive/30 text-destructive hover:bg-destructive/10'
          : 'border-border bg-card/50 text-foreground hover:bg-card'
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="text-sm">{label}</span>
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex flex-col bg-background"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <button
        onClick={onClose}
        className="absolute right-4 z-50 p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex-1 overflow-y-auto px-6 pt-16 pb-10 w-full max-w-md mx-auto">
        <h1 className="font-display text-3xl tracking-wide text-foreground mb-1">Account</h1>
        {user ? (
          <p className="text-sm text-muted-foreground mb-8 truncate">{user.email}</p>
        ) : (
          <p className="text-sm text-muted-foreground mb-8">You are browsing as a guest.</p>
        )}

        <div className="space-y-3">
          {/* Upgrade and Restore are only meaningful before Pro is active. Once
              the entitlement is granted, the subscriber needs the opposite:
              a way to review or cancel, which on iOS lives in Apple's own
              subscription settings. */}
          {isNative && onUpgrade && !isPro && (
            <Row icon={Crown} label="Unlock KiN-TXT Pro" onClick={() => { onClose(); onUpgrade(); }} />
          )}
          {isNative && !isPro && (
            <Row icon={RefreshCw} label={restoring ? 'Restoring…' : 'Restore Purchases'} onClick={handleRestore} />
          )}
          {isPro && (
            <Row icon={CreditCard} label="Manage subscription" onClick={handleManageSubscription} />
          )}
          {user && <Row icon={LogOut} label="Sign out" onClick={handleSignOut} />}
        </div>

        {/* Legal */}
        <div className="mt-10">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-display mb-3">Legal</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </div>

    </motion.div>
  );
}
