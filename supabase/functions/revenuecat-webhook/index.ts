import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * RevenueCat webhook → Supabase `subscriptions` sync.
 *
 * Mirrors the existing Stripe webhook so the rest of the app (useSubscription,
 * useHasAccess) keeps working unchanged regardless of where the purchase came from.
 *
 * Setup:
 *   - In the RevenueCat dashboard → Integrations → Webhooks, point the webhook at
 *     this function's URL and set an Authorization header value.
 *   - Store that same value as the `REVENUECAT_WEBHOOK_AUTH` secret on Supabase.
 *   - RevenueCat `app_user_id` is the Supabase user id (set client-side at sign-in).
 *
 * Note: this function verifies the shared secret itself, so deploy it with
 *   verify_jwt = false (RevenueCat does not send a Supabase JWT).
 */

// Event types that GRANT access.
const GRANTING = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
  'SUBSCRIPTION_EXTENDED',
]);
// Event types that REVOKE access immediately.
const REVOKING = new Set([
  'EXPIRATION',
  'SUBSCRIPTION_PAUSED',
]);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify the shared secret configured in the RevenueCat dashboard.
  const expectedAuth = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');
  const gotAuth = req.headers.get('Authorization');
  if (expectedAuth && gotAuth !== expectedAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const payload = await req.json();
    const event = payload?.event ?? payload;
    const userId: string | undefined = event?.app_user_id;
    const type: string = event?.type ?? '';

    // Ignore anonymous purchases or events without a mappable user.
    if (!userId || userId.startsWith('$RCAnonymousID:')) {
      return new Response(JSON.stringify({ received: true, skipped: 'no app_user_id' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let status: string | null = null;
    if (GRANTING.has(type)) {
      status = event?.period_type === 'TRIAL' ? 'trialing' : 'active';
    } else if (REVOKING.has(type)) {
      status = 'canceled';
    }
    // CANCELLATION / BILLING_ISSUE: auto-renew off but access continues until
    // expiry — leave status unchanged (we only revoke on EXPIRATION).

    if (status === null) {
      return new Response(JSON.stringify({ received: true, ignored: type }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const plan = mapPlan(event?.product_id);
    const periodEnd = event?.expiration_at_ms
      ? new Date(Number(event.expiration_at_ms)).toISOString()
      : null;

    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        status,
        plan,
        current_period_end: periodEnd,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('revenuecat-webhook: upsert failed', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('revenuecat-webhook error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/** Best-effort mapping from an Apple product id to our `plan` column. */
function mapPlan(productId?: string): string {
  if (!productId) return 'monthly';
  const id = productId.toLowerCase();
  if (id.includes('annual') || id.includes('year')) return 'annual';
  if (id.includes('life')) return 'lifetime';
  return 'monthly';
}
