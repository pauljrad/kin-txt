import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function sendFirstBookSubmissionEmail(metadata: Record<string, string>) {
  const rows: [string, string][] = [
    ["Author", metadata.authorName ?? ""],
    ["Email", metadata.authorEmail ?? ""],
    ["Book title", metadata.bookTitle ?? ""],
    ["Genre / theme", metadata.genre ?? ""],
    ["Word count", metadata.wordCount ?? ""],
    ["Manuscript link", metadata.manuscriptLink ?? ""],
    ["Pitch", metadata.pitch ?? ""],
  ];
  const body = rows
    .filter(([, v]) => v)
    .map(
      ([label, value]) => `
        <tr><td style="padding:10px 0; border-bottom:1px solid #262626;">
          <div style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#8a8a8a; margin-bottom:4px;">${escapeHtml(label)}</div>
          <div style="font-size:14px; color:#ffffff; white-space:pre-wrap; line-height:1.6;">${escapeHtml(value)}</div>
        </td></tr>`,
    )
    .join("");

  const { error: resendError } = await resend.emails.send({
    from: "KiN-TXT Submissions <hello@kin-txt.com>",
    to: ["hello@kin-txt.com"],
    replyTo: metadata.authorEmail || undefined,
    subject: `First Book Open Call — ${metadata.bookTitle ?? "Untitled"} (£10 fee paid)`,
    html: `
      <!DOCTYPE html><html><body style="margin:0; padding:0; background-color:#000000; font-family:'Inter',sans-serif; color:#ffffff;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#000000;">
          <tr><td align="center" style="padding:40px 20px;">
            <table role="presentation" width="100%" style="max-width:560px;">
              <tr><td style="padding-bottom:24px;">
                <div style="font-size:12px; letter-spacing:2px; text-transform:uppercase; color:#8a8a8a;">KiN-TXT</div>
                <div style="font-size:22px; font-weight:700; margin-top:6px;">First Book Open Call — £10 fee paid</div>
              </td></tr>
              ${body}
            </table>
          </td></tr>
        </table>
      </body></html>
    `,
  });

  if (resendError) {
    console.error("Resend rejected paid submission email:", resendError);
    throw new Error("Paid submission email could not be delivered.");
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2024-04-10',
  });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const body = await req.text();

  let event: Stripe.Event;

  try {
    if (!signature || !webhookSecret) {
      throw new Error('Missing stripe-signature or webhook secret');
    }
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('Stripe webhook event:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // First Book Open Call £10 submission fee — a one-off payment, not a
        // subscription. The email only goes out here, once Stripe confirms the
        // charge actually succeeded, so this is the real enforcement of the
        // "£10, or free if signed in" rule — not the client-side form.
        if (session.mode === 'payment' && session.metadata?.type === 'first-book-submission') {
          await sendFirstBookSubmissionEmail(session.metadata as Record<string, string>);
          console.log('First Book Open Call submission emailed for session', session.id);
          break;
        }

        if (session.mode !== 'subscription') break;

        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const customerEmail = session.customer_email ?? session.customer_details?.email ?? '';

        // Look up the user by email
        const { data: userData } = await supabase.auth.admin.listUsers();
        const matchedUser = userData?.users?.find(u => u.email === customerEmail);

        if (!matchedUser) {
          console.warn('No user found for email:', customerEmail);
          break;
        }

        // Fetch the subscription to get trial end date
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
        const periodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;

        // Determine plan label from price
        const priceId = sub.items.data[0]?.price?.id ?? '';
        const plan = priceId === 'price_1TIXbZRuFCnPyOr91szBn2Aq' ? 'annual' : 'monthly';

        // Upsert into subscriptions table
        await supabase.from('subscriptions').upsert({
          user_id: matchedUser.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status: sub.status, // 'trialing' or 'active'
          plan,
          trial_ends_at: trialEnd,
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

        console.log(`Subscription created for user ${matchedUser.id}, plan: ${plan}, status: ${sub.status}`);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const periodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;
        const trialEnd = sub.trial_end
          ? new Date(sub.trial_end * 1000).toISOString()
          : null;

        await supabase
          .from('subscriptions')
          .update({
            status: sub.status,
            trial_ends_at: trialEnd,
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);

        console.log(`Subscription updated for customer ${customerId}, status: ${sub.status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);

        console.log(`Subscription cancelled for customer ${customerId}`);
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
