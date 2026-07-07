import { supabase } from '@/integrations/supabase/client';

// The moderation tables aren't in the generated Supabase types yet, so use a
// loosely-typed client for these calls.
const sb = supabase as any;

export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'other';

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam or scam' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'inappropriate', label: 'Inappropriate / offensive content' },
  { value: 'other', label: 'Something else' },
];

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Ids of users the current user has blocked (used to filter them out everywhere). */
export async function getBlockedUserIds(): Promise<string[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  const { data } = await sb.from('user_blocks').select('blocked_id').eq('blocker_id', uid);
  return (data ?? []).map((r: { blocked_id: string }) => r.blocked_id);
}

export async function isUserBlocked(blockedId: string): Promise<boolean> {
  const uid = await currentUserId();
  if (!uid) return false;
  const { data } = await sb
    .from('user_blocks')
    .select('id')
    .eq('blocker_id', uid)
    .eq('blocked_id', blockedId)
    .maybeSingle();
  return !!data;
}

export async function blockUser(blockedId: string): Promise<{ error: Error | null }> {
  const uid = await currentUserId();
  if (!uid) return { error: new Error('Not signed in') };
  const { error } = await sb.from('user_blocks').insert({ blocker_id: uid, blocked_id: blockedId });
  return { error: (error as Error) ?? null };
}

export async function unblockUser(blockedId: string): Promise<{ error: Error | null }> {
  const uid = await currentUserId();
  if (!uid) return { error: new Error('Not signed in') };
  const { error } = await sb
    .from('user_blocks')
    .delete()
    .eq('blocker_id', uid)
    .eq('blocked_id', blockedId);
  return { error: (error as Error) ?? null };
}

export async function reportContent(opts: {
  reportedUserId: string;
  reason: ReportReason;
  details?: string;
  itemType?: string;
  itemId?: string;
}): Promise<{ error: Error | null }> {
  const uid = await currentUserId();
  if (!uid) return { error: new Error('Not signed in') };
  const { error } = await sb.from('content_reports').insert({
    reporter_id: uid,
    reported_user_id: opts.reportedUserId,
    reason: opts.reason,
    details: opts.details ?? null,
    item_type: opts.itemType ?? 'profile',
    item_id: opts.itemId ?? null,
  });
  return { error: (error as Error) ?? null };
}
