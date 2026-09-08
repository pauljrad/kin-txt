import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Keep every field to a sane length regardless of what the client sends —
// this ends up in an email, not a database row.
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const type = payload?.type;

    if (type === "writer") {
      const name = clip(payload.name, 200);
      const email = clip(payload.email, 200);
      const links = clip(payload.links, 500);
      const pitch = clip(payload.pitch, 4000);

      if (!name || !email || !pitch) {
        return new Response(JSON.stringify({ error: "Name, email, and a note about yourself are required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await resend.emails.send({
        from: "KiN-TXT Submissions <hello@kin-txt.com>",
        to: ["hello@kin-txt.com"],
        replyTo: email,
        subject: `Writers Wanted — ${name}`,
        html: wrapEmail("New writer application", [
          ["Name", name],
          ["Email", email],
          ["Links / portfolio", links],
          ["Message", pitch],
        ]),
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "first-book-free") {
      // Free path is gated on a real, currently-signed-in kin-txt.com account —
      // enforced here server-side, not just hidden client-side, so it can't be
      // used to skip the £10 fee by simply lying in the request body.
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

      await resend.emails.send({
        from: "KiN-TXT Submissions <hello@kin-txt.com>",
        to: ["hello@kin-txt.com"],
        replyTo: user.email,
        subject: `First Book Open Call — ${bookTitle} (free entry, signed-in member)`,
        html: wrapEmail("First Book Open Call — free entry", [
          ["Author", authorName],
          ["Account email", user.email ?? ""],
          ["Book title", bookTitle],
          ["Genre / theme", genre],
          ["Word count", wordCount],
          ["Manuscript link", manuscriptLink],
          ["Pitch", pitch],
        ]),
      });

      return new Response(JSON.stringify({ success: true }), {
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
