import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type SubscriptionStatus = 'trialing' | 'active' | 'canceled' | 'past_due' | 'lifetime' | 'none';

export function useSubscription() {
  const { user, isLoading: authLoading } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>('none');
  const [plan, setPlan] = useState<string | null>(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setStatus('none');
      setPlan(null);
      setCurrentPeriodEnd(null);
      setStripeCustomerId(null);
      setLoading(false);
      return;
    }

    async function checkSubscription() {
      try {
        const { data, error } = await (supabase as any)
          .from('subscriptions')
          .select('status, plan, current_period_end, stripe_customer_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        
        let resultingStatus: SubscriptionStatus = 'none';
        let resultingPlan = null;
        let resultingPeriodEnd = null;
        let resultingCustomerId = null;
        
        if (data) {
          if (Array.isArray(data)) {
            if (data.length > 0) {
              resultingStatus = data[0]?.status || 'none';
              resultingPlan = data[0]?.plan || null;
              resultingPeriodEnd = data[0]?.current_period_end || null;
              resultingCustomerId = data[0]?.stripe_customer_id || null;
            }
          } else {
            resultingStatus = (data as any).status || 'none';
            resultingPlan = (data as any).plan || null;
            resultingPeriodEnd = (data as any).current_period_end || null;
            resultingCustomerId = (data as any).stripe_customer_id || null;
          }
        }
        
        setStatus(resultingStatus as SubscriptionStatus);
        setPlan(resultingPlan);
        setCurrentPeriodEnd(resultingPeriodEnd);
        setStripeCustomerId(resultingCustomerId);
      } catch (err) {
        console.error('Error checking subscription:', err);
        setStatus('none');
        setPlan(null);
        setCurrentPeriodEnd(null);
        setStripeCustomerId(null);
      } finally {
        setLoading(false);
      }
    }

    checkSubscription();
  }, [user, authLoading]);

  const isSubscribed = ['active', 'trialing', 'lifetime'].includes(status);

  return { status, loading, isSubscribed, plan, currentPeriodEnd, stripeCustomerId };
}
