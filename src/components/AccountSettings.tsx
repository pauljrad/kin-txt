import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, LogOut, Trash2, RotateCcw, RefreshCw, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ENTITLEMENT_ID } from '@/lib/revenuecat';

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
 * Houses the Apple-mandated account deletion, Restore Purchases (native),
 * a tutorial replay, sign-out, and links to all legal policies.
 */
export function AccountSettings({ onClose, onUpgrade }: AccountSettingsProps) {
  const navigate = useNavigate();
  const { user, signOut, deleteAccount } = useAuth();
  const { resetOnboarding } = useOnboarding();
  const isNative = Capacitor.isNativePlatform();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    onClose();
    navigate('/login');
  };

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await deleteAccount();
    setDeleting(false);
    if (error) {
      toast.error(error.message || 'Could not delete your account. Please try again.');
      return;
    }
    toast.success('Your account has been deleted.');
    onClose();
    navigate(isNative ? '/home' : '/');
  };

  const handleReplayTutorial = () => {
    resetOnboarding();
    onClose();
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
          {isNative && onUpgrade && (
            <Row icon={Crown} label="Unlock KiN-TXT Pro" onClick={() => { onClose(); onUpgrade(); }} />
          )}
          {isNative && (
            <Row icon={RefreshCw} label={restoring ? 'Restoring…' : 'Restore Purchases'} onClick={handleRestore} />
          )}
          <Row icon={RotateCcw} label="Replay tutorial" onClick={handleReplayTutorial} />
          {user && <Row icon={LogOut} label="Sign out" onClick={handleSignOut} />}
          {user && (
            <Row icon={Trash2} label="Delete account" onClick={() => setConfirmDelete(true)} danger />
          )}
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

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes your account and all associated data — your saved TXTs,
              reading progress, and connections. This cannot be undone.
              {isNative && ' Any active subscription must be cancelled separately in your device Settings.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
