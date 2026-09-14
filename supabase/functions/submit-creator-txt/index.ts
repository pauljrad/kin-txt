import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function clip(value: unknown, max: number): string {
  return (typeof value === "string" ? value : "").trim().slice(0, max);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  bytes.forEach((b) => binary += String.fromCharCode(b));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Sign in as a KiN-Creator to submit." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const jwt = authHeader.slice(7);
    const { data: { user }, error: userError } = await anon.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Your session has expired. Sign in again." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: creator, error: creatorError } = await admin
      .from("kin_creators")
      .select("display_name, active")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle();

    if (creatorError || !creator) {
      return new Response(JSON.stringify({ error: "This account is not enabled as a KiN-Creator." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const title = clip(payload?.title, 220);
    const contentType = clip(payload?.contentType, 30).toLowerCase();
    const body = clip(payload?.body, 150000);
    const allowedTypes = new Set(["essay", "story", "news", "article", "other"]);
    const wordCount = body.replace(/[*_]/g, " ").split(/\s+/).filter(Boolean).length;

    if (!title || !body || wordCount < 20 || !allowedTypes.has(contentType)) {
      return new Response(JSON.stringify({ error: "Add a title, valid content type, and at least 20 words." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = randomToken();
    const tokenHash = await sha256Hex(token);
    const creatorEmail = user.email ?? "";

    const { data: submission, error: insertError } = await admin
      .from("creator_submissions")
      .insert({
        creator_user_id: user.id,
        creator_name: creator.display_name,
        creator_email: creatorEmail,
        content_type: contentType,
        title,
        body,
        word_count: wordCount,
        status: "pending",
        approval_token_hash: tokenHash,
        notification_status: "pending",
      })
      .select("id")
      .single();

    if (insertError || !submission) {
      console.error("Could not store Creator TXT:", insertError);
      throw new Error("Could not store the Creator TXT.");
    }

    const reviewUrl = `${Deno.env.get("KIN_TXT_SITE_URL") ?? "https://kin-txt.com"}/creator-review#${token}`;
    const excerpt = body.replace(/[*_]/g, "").replace(/\s+/g, " ").slice(0, 420);

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY") ?? ""}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `creator-submission/${submission.id}`,
        },
        body: JSON.stringify({
          from: "KiN-TXT Creators <hello@kin-txt.com>",
          to: ["hello@kin-txt.com"],
          reply_to: creatorEmail || undefined,
          subject: `KiN-Creator review — ${title}`,
          html: `<!doctype html><html><body style="margin:0;background:#000;color:#fff;font-family:Arial,sans-serif"><div style="max-width:620px;margin:auto;padding:40px 24px"><div style="font-size:12px;letter-spacing:2px;color:#999;text-transform:uppercase">KiN-TXT · Creator Review</div><h1 style="font-size:26px;margin:10px 0 4px">${escapeHtml(title)}</h1><p style="color:#aaa;margin:0 0 24px">${escapeHtml(creator.display_name)} · ${escapeHtml(contentType)} · ${wordCount} words</p><p style="color:#ddd;line-height:1.6">${escapeHtml(excerpt)}${body.length > excerpt.length ? "…" : ""}</p><p style="margin:30px 0"><a href="${reviewUrl}" style="display:inline-block;padding:13px 18px;background:#fff;color:#000;text-decoration:none;border-radius:10px;font-weight:700">Open TXT &amp; review</a></p><p style="color:#777;font-size:12px;line-height:1.5">This is a private, single-use approval link. Approval publishes the TXT to Journal → KiN-Creators.</p></div></body></html>`,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`Resend ${response.status}: ${JSON.stringify(result)}`);

      await admin.from("creator_submissions").update({
        notification_status: "sent",
        resend_email_id: result.id ?? null,
        last_error: null,
      }).eq("id", submission.id);
    } catch (emailError) {
      console.error("Creator review notification failed:", emailError);
      await admin.from("creator_submissions").update({
        notification_status: "failed",
        last_error: (emailError as Error).message,
      }).eq("id", submission.id);
    }

    return new Response(JSON.stringify({ success: true, submissionId: submission.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("submit-creator-txt error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
