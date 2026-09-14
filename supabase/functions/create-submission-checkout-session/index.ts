import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function clip(value: unknown, max: number): string {
  const s = typeof value === 'string' ? value : '';
  return s.trim().slice(0, max);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  let submissionId: string | null = null;

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
    const manuscriptLink = clip(body.manuscriptLink, 1000);
    const pitch = clip(body.pitch, 6000);

    if (!authorName || !authorEmail || !bookTitle || !manuscriptLink || !pitch) {
      return new Response(
        JSON.stringify({ error: 'Author name, email, book title, manuscript link, and pitch are required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: submission, error: insertError } = await admin
      .from('submissions')
      .insert({
        submission_type: 'first_book',
        entry_method: 'paid',
        payment_status: 'pending',
        email_status: 'pending',
        author_name: authorName,
        email: authorEmail,
        book_title: bookTitle,
        genre: genre || null,
        word_count: wordCount || null,
        manuscript_link: manuscriptLink,
        pitch,
      })
      .select('id')
      .single();

    if (insertError || !submission) {
      console.error('Could not persist paid submission before checkout:', insertError);
      throw new Error('Could not save the submission before checkout.');
    }

    submissionId = submission.id;
    const origin = req.headers.get('origin') ?? 'https://kin-txt.com';

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
        submissionId,
      },
    });

    const { error: updateError } = await admin
      .from('submissions')
      .update({
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    if (updateError) {
      console.error('Could not attach Stripe session to submission:', updateError);
      throw new Error('Checkout was created but the submission could not be linked to it.');
    }

    return new Response(JSON.stringify({ url: session.url, submissionId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('create-submission-checkout-session error:', err);

    if (submissionId) {
      const { error: recoveryError } = await admin
        .from('submissions')
        .update({
          payment_status: 'failed',
          last_error: (err as Error).message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId);
      if (recoveryError) console.error('Could not mark failed checkout:', recoveryError);
    }

    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
