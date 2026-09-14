import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2024-04-10',
    });

    const { priceId, email, returnTo } = await req.json();

    if (!priceId) {
      return new Response(JSON.stringify({ error: 'priceId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const origin = req.headers.get('origin') ?? 'https://kin-txt.com';
    // Only allow known in-app return destinations; never accept an arbitrary
    // URL from the browser as a Stripe redirect target.
    const returningToSubmissions = returnTo === 'submissions';
    const successUrl = returningToSubmissions
      ? `${origin}/submissions?upgraded=success`
      : `${origin}/login?checkout=success`;
    const cancelUrl = returningToSubmissions
      ? `${origin}/submissions`
      : `${origin}/pricing`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
      },
      // Pre-fill email if provided
      ...(email ? { customer_email: email } : {}),
      success_url: successUrl,
      cancel_url: cancelUrl,
      // Collect billing address for UK compliance
      billing_address_collection: 'auto',
      // Allow promo codes
      allow_promotion_codes: true,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
