import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type SubscriptionStatus = 'trialing' | 'active' | 'canceled' | 'past_due' | 'lifetime' | 'none';

export function useSubscription() {
  const { user, isLoading: authLoading } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>('none');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setStatus('none');
      setLoading(false);
      return;
    }

    async function checkSubscription() {
      try {
        const { data, error } = await (supabase as any)
          .from('subscriptions')
          .select('status')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          setStatus(data.status as SubscriptionStatus);
        } else {
          setStatus('none');
        }
      } catch (err) {
        console.error('Error checking subscription:', err);
        setStatus('none');
      } finally {
        setLoading(false);
      }
    }

    checkSubscription();
  }, [user, authLoading]);

  const isSubscribed = ['active', 'trialing', 'lifetime'].includes(status);

  return { status, loading, isSubscribed };
}
