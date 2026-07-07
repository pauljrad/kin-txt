import { useEffect, useState } from 'react';
import { Flag, Ban, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  REPORT_REASONS,
  ReportReason,
  blockUser,
  unblockUser,
  isUserBlocked,
  reportContent,
} from '@/lib/moderation';

interface ModerationActionsProps {
  userId: string;
  displayName?: string | null;
  /** What is being reported, e.g. 'profile' | 'shared_item'. Defaults to 'profile'. */
  itemType?: string;
  itemId?: string;
  /** Called after the user is blocked (e.g. to close a profile sheet). */
  onBlocked?: () => void;
}

/**
 * Report + Block controls for any KiN user / their content.
 * Required for App Store Guideline 1.2 (user-generated content & social).
 */
export const ModerationActions = ({ userId, displayName, itemType = 'profile', itemId, onBlocked }: ModerationActionsProps) => {
  const [blocked, setBlocked] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const name = displayName || 'this user';

  useEffect(() => {
    let active = true;
    isUserBlocked(userId).then((b) => active && setBlocked(b));
    return () => {
      active = false;
    };
  }, [userId]);

  const doBlock = async () => {
    setBusy(true);
    const { error } = await blockUser(userId);
    setBusy(false);
    setConfirmBlock(false);
    if (error) {
      toast.error('Could not block. Please try again.');
      return;
    }
    setBlocked(true);
    toast.success(`You've blocked ${name}.`);
    onBlocked?.();
  };

  const doUnblock = async () => {
    setBusy(true);
    const { error } = await unblockUser(userId);
    setBusy(false);
    if (error) {
      toast.error('Could not unblock. Please try again.');
      return;
    }
    setBlocked(false);
    toast.success(`You've unblocked ${name}.`);
  };

  const submitReport = async (reason: ReportReason) => {
    setBusy(true);
    const { error } = await reportContent({ reportedUserId: userId, reason, itemType, itemId });
    setBusy(false);
    setReportOpen(false);
    if (error) {
      toast.error('Could not send report. Please try again.');
      return;
    }
    toast.success('Thanks — our team will review this within 24 hours.');
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setReportOpen(true)}
        className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
      >
        <Flag className="w-3.5 h-3.5" />
        Report
      </button>
      <span className="text-muted-foreground/30">·</span>
      {blocked ? (
        <button
          onClick={doUnblock}
          disabled={busy}
          className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <Ban className="w-3.5 h-3.5" />
          Unblock
        </button>
      ) : (
        <button
          onClick={() => setConfirmBlock(true)}
          disabled={busy || blocked === null}
          className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-destructive/80 hover:text-destructive transition-colors disabled:opacity-50"
        >
          <Ban className="w-3.5 h-3.5" />
          Block
        </button>
      )}

      {/* Block confirm */}
      <AlertDialog open={confirmBlock} onOpenChange={setConfirmBlock}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              You won't see {name} in search, your network, shared items or notifications, and they
              won't be able to reach you. You can unblock them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doBlock} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Block'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report reasons */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Report {name}</DialogTitle>
            <DialogDescription>
              Tell us what's wrong. Reports are reviewed within 24 hours and offending content or
              users are removed.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-2">
            {REPORT_REASONS.map((r) => (
              <button
                key={r.value}
                onClick={() => submitReport(r.value)}
                disabled={busy}
                className="w-full text-left px-4 py-3 rounded-xl border border-border bg-secondary/40 hover:bg-secondary text-sm transition-colors disabled:opacity-50"
              >
                {r.label}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
