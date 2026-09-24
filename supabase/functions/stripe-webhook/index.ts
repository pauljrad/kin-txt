import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const MANUSCRIPT_BUCKET = "manuscript-submissions";
const MANUSCRIPT_PREFIX = `storage://${MANUSCRIPT_BUCKET}/`;

async function manuscriptForReview(
  supabase: ReturnType<typeof createClient>,
  manuscriptRef: string,
): Promise<string> {
  if (!manuscriptRef.startsWith(MANUSCRIPT_PREFIX)) return manuscriptRef;
  const path = manuscriptRef.slice(MANUSCRIPT_PREFIX.length);
  if (!path || path.includes("..")) return manuscriptRef;

  const { data, error } = await supabase.storage
    .from(MANUSCRIPT_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 30);

  if (error || !data?.signedUrl) {
    console.error("Could not create paid manuscript review URL:", error);
    return manuscriptRef;
  }

  const storedName = path.split("/").pop() || "manuscript";
  const filename = storedName.replace(/^[0-9a-f-]{36}-/i, "");
  return `Uploaded manuscript: ${filename}\nReview link (valid for 30 days): ${data.signedUrl}`;
}

function renderPaidSubmissionEmail(submission: Record<string, unknown>): string {
  const rows: [string, string][] = [
    ["Submission ID", String(submission.id ?? "")],
    ["Author", String(submission.author_name ?? "")],
    ["Email", String(submission.email ?? "")],
    ["Book title", String(submission.book_title ?? "")],
    ["Genre / theme", String(submission.genre ?? "")],
    ["Word count", String(submission.word_count ?? "")],
    ["Manuscript", String(submission.manuscript_link ?? "")],
    ["Pitch", String(submission.pitch ?? "")],
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

  return `
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
  `;
}

async function sendPaidSubmissionEmail(submission: Record<string, unknown>) {
  const apiKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `first-book-paid/${String(submission.id)}`,
    },
    body: JSON.stringify({
      from: "KiN-TXT Submissions <hello@kin-txt.com>",
      to: ["hello@kin-txt.com"],
      reply_to: submission.email || undefined,
      subject: `First Book Open Call — ${String(submission.book_title ?? "Untitled")} (£10 fee paid)`,
      html: renderPaidSubmissionEmail(submission),
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Resend ${response.status}: ${JSON.stringify(result)}`);
  }
  return result as { id?: string };
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

        if (session.mode === 'payment' && session.metadata?.type === 'first-book-submission') {
          const markerMatch = session.metadata.pitch?.match(/^submission:([0-9a-f-]{36})$/i);
          let submissionId = session.metadata.submissionId ?? markerMatch?.[1] ?? null;

          if (!submissionId) {
            const { data: legacySubmission, error: legacyInsertError } = await supabase
              .from('submissions')
              .insert({
                submission_type: 'first_book',
                entry_method: 'paid',
                payment_status: 'pending',
                email_status: 'pending',
                author_name: session.metadata.authorName ?? 'Unknown',
                email: session.metadata.authorEmail ?? session.customer_details?.email ?? '',
                book_title: session.metadata.bookTitle ?? 'Untitled',
                genre: session.metadata.genre || null,
                word_count: session.metadata.wordCount || null,
                manuscript_link: session.metadata.manuscriptLink ?? '',
                pitch: session.metadata.pitch ?? '',
              })
              .select('id')
              .single();

            if (legacyInsertError || !legacySubmission) {
              throw legacyInsertError ?? new Error('Could not persist legacy paid submission');
            }
            submissionId = legacySubmission.id;
          }

          const paymentIntentId = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null;

          const { error: paidUpdateError } = await supabase
            .from('submissions')
            .update({
              payment_status: 'paid',
              stripe_checkout_session_id: session.id,
              stripe_payment_intent_id: paymentIntentId,
              paid_at: new Date().toISOString(),
              last_error: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', submissionId)
            .eq('entry_method', 'paid');

          if (paidUpdateError) throw paidUpdateError;

          const { data: submission, error: loadError } = await supabase
            .from('submissions')
            .select('*')
            .eq('id', submissionId)
            .eq('entry_method', 'paid')
            .maybeSingle();

          if (loadError || !submission) {
            throw loadError ?? new Error(`Submission ${submissionId} not found`);
          }

          if (submission.email_status === 'sent') {
            console.log('Paid submission notification already sent for', submissionId);
            break;
          }

          if (submission.email_status === 'sending') {
            const lastAttempt = submission.last_notification_attempt_at
              ? new Date(submission.last_notification_attempt_at).getTime()
              : 0;
            if (Date.now() - lastAttempt < 10 * 60 * 1000) {
              console.log('Paid submission notification already in progress for', submissionId);
              break;
            }
          }

          const { data: claimed, error: claimError } = await supabase
            .from('submissions')
            .update({
              email_status: 'sending',
              notification_attempts: (submission.notification_attempts ?? 0) + 1,
              last_notification_attempt_at: new Date().toISOString(),
              last_error: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', submissionId)
            .neq('email_status', 'sent')
            .select('*')
            .maybeSingle();

          if (claimError) throw claimError;
          if (!claimed) {
            console.log('Paid submission notification claim skipped for', submissionId);
            break;
          }

          try {
            const manuscriptReview = await manuscriptForReview(
              supabase,
              String(claimed.manuscript_link ?? ""),
            );
            const emailResult = await sendPaidSubmissionEmail({
              ...claimed,
              manuscript_link: manuscriptReview,
            });
            const { error: sentUpdateError } = await supabase
              .from('submissions')
              .update({
                email_status: 'sent',
                resend_email_id: emailResult.id ?? null,
                last_error: null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', submissionId);
            if (sentUpdateError) throw sentUpdateError;
            console.log('First Book Open Call submission stored, paid and emailed for session', session.id);
          } catch (emailError) {
            await supabase
              .from('submissions')
              .update({
                email_status: 'failed',
                last_error: (emailError as Error).message,
                updated_at: new Date().toISOString(),
              })
              .eq('id', submissionId);
            throw emailError;
          }
          break;
        }

        if (session.mode !== 'subscription') break;

        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const customerEmail = session.customer_email ?? session.customer_details?.email ?? '';

        const { data: userData } = await supabase.auth.admin.listUsers();
        const matchedUser = userData?.users?.find(u => u.email === customerEmail);

        if (!matchedUser) {
          console.warn('No user found for email:', customerEmail);
          break;
        }

        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
        const periodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;

        const priceId = sub.items.data[0]?.price?.id ?? '';
        const plan = priceId === 'price_1TIXbZRuFCnPyOr91szBn2Aq' ? 'annual' : 'monthly';

        await supabase.from('subscriptions').upsert({
          user_id: matchedUser.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status: sub.status,
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
