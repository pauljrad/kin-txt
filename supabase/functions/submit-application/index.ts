import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function clip(value: unknown, max: number): string {
  const s = typeof value === "string" ? value : "";
  return s.trim().slice(0, max);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapEmail(title: string, rows: [string, string][]): string {
  const body = rows
    .filter(([, v]) => v)
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #262626;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #8a8a8a; margin-bottom: 4px;">${escapeHtml(label)}</div>
            <div style="font-size: 14px; color: #ffffff; white-space: pre-wrap; line-height: 1.6;">${escapeHtml(value)}</div>
          </td>
        </tr>`,
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0; padding:0; background-color:#000000; font-family: 'Inter', sans-serif; color:#ffffff;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#000000;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" width="100%" style="max-width: 560px;">
              <tr>
                <td style="padding-bottom: 24px;">
                  <div style="font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #8a8a8a;">KiN-TXT</div>
                  <div style="font-size: 22px; font-weight: 700; margin-top: 6px;">${escapeHtml(title)}</div>
                </td>
              </tr>
              ${body}
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function markNotification(
  admin: ReturnType<typeof adminClient>,
  submissionId: string,
  status: "sent" | "failed",
  resendEmailId?: string,
  errorMessage?: string,
) {
  const { error } = await admin
    .from("submissions")
    .update({
      email_status: status,
      resend_email_id: resendEmailId ?? null,
      last_error: errorMessage ?? null,
      last_notification_attempt_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  if (error) console.error("Could not update submission notification state:", error);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const type = payload?.type;
    const admin = adminClient();

    if (type === "writer") {
      const name = clip(payload.name, 200);
      const email = clip(payload.email, 200);
      const links = clip(payload.links, 1000);
      const pitch = clip(payload.pitch, 20000);

      if (!name || !email || (!links && !pitch)) {
        return new Response(JSON.stringify({ error: "Name, email, and either a work link or writing sample are required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: submission, error: insertError } = await admin
        .from("submissions")
        .insert({
          submission_type: "writer",
          entry_method: "writer_form",
          payment_status: "not_required",
          email_status: "sending",
          author_name: name,
          email,
          links: links || null,
          pitch,
          notification_attempts: 1,
          last_notification_attempt_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError || !submission) {
        console.error("Could not persist writer application:", insertError);
        throw new Error("Could not save the writer application.");
      }

      const { data: emailData, error: resendError } = await resend.emails.send({
        from: "KiN-TXT Submissions <hello@kin-txt.com>",
        to: ["hello@kin-txt.com"],
        replyTo: email,
        subject: `Writers Wanted — ${name}`,
        html: wrapEmail("New writer application", [
          ["Submission ID", submission.id],
          ["Name", name],
          ["Email", email],
          ["Portfolio / published work", links],
          ["Writing sample", pitch],
        ]),
      });

      if (resendError) {
        console.error("Resend rejected writer application notification:", resendError);
        await markNotification(admin, submission.id, "failed", undefined, JSON.stringify(resendError));
      } else {
        await markNotification(admin, submission.id, "sent", emailData?.id);
      }

      return new Response(JSON.stringify({ success: true, submissionId: submission.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "first-book-paid-pending") {
      const authorName = clip(payload.authorName, 200);
      const authorEmail = clip(payload.authorEmail, 200);
      const bookTitle = clip(payload.bookTitle, 300);
      const genre = clip(payload.genre, 200);
      const wordCount = clip(payload.wordCount, 30);
      const manuscriptLink = clip(payload.manuscriptLink, 1000);
      const pitch = clip(payload.pitch, 6000);

      if (!authorName || !authorEmail || !bookTitle || !manuscriptLink || !pitch) {
        return new Response(
          JSON.stringify({ error: "Author name, email, book title, manuscript link, and pitch are required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: submission, error: insertError } = await admin
        .from("submissions")
        .insert({
          submission_type: "first_book",
          entry_method: "paid",
          payment_status: "pending",
          email_status: "pending",
          author_name: authorName,
          email: authorEmail,
          book_title: bookTitle,
          genre: genre || null,
          word_count: wordCount || null,
          manuscript_link: manuscriptLink,
          pitch,
        })
        .select("id")
        .single();

      if (insertError || !submission) {
        console.error("Could not persist pending paid submission:", insertError);
        throw new Error("Could not save the submission before checkout.");
      }

      return new Response(JSON.stringify({ success: true, submissionId: submission.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "first-book-free") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Sign in to submit for free." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
      );
      const jwt = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Your session has expired. Sign in again." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: subRow } = await admin
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();
      const isPro = !!subRow && ["active", "trialing", "lifetime"].includes(subRow.status);
      if (!isPro) {
        return new Response(
          JSON.stringify({ error: "Free entry needs an active KiN-TXT Pro membership. Upgrade, or submit for £10 instead." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const authorName = clip(payload.authorName, 200);
      const bookTitle = clip(payload.bookTitle, 300);
      const genre = clip(payload.genre, 200);
      const wordCount = clip(payload.wordCount, 30);
      const manuscriptLink = clip(payload.manuscriptLink, 1000);
      const pitch = clip(payload.pitch, 6000);

      if (!authorName || !bookTitle || !manuscriptLink || !pitch) {
        return new Response(
          JSON.stringify({ error: "Author name, book title, a link to the manuscript, and a short pitch are required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const email = user.email ?? "";
      const { data: submission, error: insertError } = await admin
        .from("submissions")
        .insert({
          submission_type: "first_book",
          entry_method: "pro_free",
          payment_status: "not_required",
          email_status: "sending",
          user_id: user.id,
          author_name: authorName,
          email,
          book_title: bookTitle,
          genre: genre || null,
          word_count: wordCount || null,
          manuscript_link: manuscriptLink,
          pitch,
          notification_attempts: 1,
          last_notification_attempt_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError || !submission) {
        console.error("Could not persist free book submission:", insertError);
        throw new Error("Could not save the book submission.");
      }

      const { data: emailData, error: resendError } = await resend.emails.send({
        from: "KiN-TXT Submissions <hello@kin-txt.com>",
        to: ["hello@kin-txt.com"],
        replyTo: email || undefined,
        subject: `First Book Open Call — ${bookTitle} (free entry, Pro member)`,
        html: wrapEmail("First Book Open Call — free entry (Pro member)", [
          ["Submission ID", submission.id],
          ["Author", authorName],
          ["Account email", email],
          ["Book title", bookTitle],
          ["Genre / theme", genre],
          ["Word count", wordCount],
          ["Manuscript link", manuscriptLink],
          ["Pitch", pitch],
        ]),
      });

      if (resendError) {
        console.error("Resend rejected free book submission notification:", resendError);
        await markNotification(admin, submission.id, "failed", undefined, JSON.stringify(resendError));
      } else {
        await markNotification(admin, submission.id, "sent", emailData?.id);
      }

      return new Response(JSON.stringify({ success: true, submissionId: submission.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown submission type." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("submit-application error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
