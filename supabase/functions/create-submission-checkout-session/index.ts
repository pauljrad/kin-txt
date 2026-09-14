import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Stripe metadata values are capped at 500 chars each — clip defensively so a
// long pitch can never make the checkout session creation fail.
function clip(value: unknown, max: number): string {
  const s = typeof value === 'string' ? value : '';
  return s.trim().slice(0, max);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2024-04-10',
    });

    const body = await req.json();
    const authorName = clip(body.authorName, 200);
    const authorEmail = clip(body.authorEmail, 200);
    const bookTitle = clip(body.bookTitle, 300);
    const genre = clip(body.genre, 200);
    const wordCount = clip(body.wordCount, 30);
    const manuscriptLink = clip(body.manuscriptLink, 490);
    const pitch = clip(body.pitch, 490);

    if (!authorName || !authorEmail || !bookTitle || !manuscriptLink) {
      return new Response(
        JSON.stringify({ error: 'Author name, email, book title, and a manuscript link are required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const origin = req.headers.get('origin') ?? 'https://kin-txt.com';

    // One-off £10 charge, created inline — no pre-existing Stripe Price object
    // needed, since this is the only place this specific fee is sold.
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'gbp',
          unit_amount: 1000,
          product_data: {
            name: 'KiN-TXT — First Book Open Call submission fee',
            description: `Manuscript submission: ${bookTitle}`,
          },
        },
        quantity: 1,
      }],
      customer_email: authorEmail,
      success_url: `${origin}/submissions?paid=success`,
      cancel_url: `${origin}/submissions?paid=cancelled`,
      billing_address_collection: 'auto',
      metadata: {
        type: 'first-book-submission',
        authorName,
        authorEmail,
        bookTitle,
        genre,
        wordCount,
        manuscriptLink,
        pitch,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('create-submission-checkout-session error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
