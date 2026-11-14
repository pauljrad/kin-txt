import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}


async function resolveExperienceMedia(admin: any, experience: any) {
  const value = experience && typeof experience === "object" ? experience : {};
  const images = Array.isArray(value.images) ? value.images : [];
  const music = value.music && typeof value.music === "object" ? value.music : { kind: "none" };
  const paths = [
    ...images.map((image: any) => typeof image?.storagePath === "string" ? image.storagePath : "").filter(Boolean),
    ...(music.kind === "upload" && typeof music.storagePath === "string" ? [music.storagePath] : []),
  ];

  if (!paths.length) return { ...value, images, music };

  const { data, error } = await admin.storage.from("creator-media").createSignedUrls(paths, 60 * 60 * 6);
  if (error) throw error;

  const urls = new Map<string, string>();
  (data ?? []).forEach((entry: any, index: number) => {
    if (entry?.signedUrl && paths[index]) urls.set(paths[index], entry.signedUrl);
  });

  return {
    ...value,
    images: images.map((image: any) => ({
      ...image,
      url: urls.get(image.storagePath),
    })),
    music: music.kind === "upload"
      ? { ...music, url: urls.get(music.storagePath) }
      : music,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = await req.json();
    const token = typeof payload?.token === "string" ? payload.token.trim() : "";
    const action = typeof payload?.action === "string" ? payload.action : "view";

    if (token.length < 30) {
      return new Response(JSON.stringify({ error: "This review link is invalid." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const tokenHash = await sha256Hex(token);

    const { data: submission, error: loadError } = await admin
      .from("creator_submissions")
      .select("id, creator_user_id, creator_name, creator_email, content_type, title, body, word_count, status, submitted_at, experience, review_notes")
      .eq("approval_token_hash", tokenHash)
      .eq("status", "pending")
      .maybeSingle();

    if (loadError) throw loadError;
    if (!submission) {
      return new Response(JSON.stringify({ error: "This review link has expired or has already been used." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "view") {
      const resolvedExperience = await resolveExperienceMedia(admin, submission.experience);
      return new Response(JSON.stringify({
        success: true,
        submission: {
          id: submission.id,
          creatorName: submission.creator_name,
          contentType: submission.content_type,
          title: submission.title,
          body: submission.body,
          wordCount: submission.word_count,
          submittedAt: submission.submitted_at,
          experience: resolvedExperience,
          reviewNotes: submission.review_notes || "",
        },
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "save") {
      const title = typeof payload?.title === "string" ? payload.title.trim() : "";
      const body = typeof payload?.body === "string" ? payload.body.trim() : "";
      const notes = typeof payload?.reviewNotes === "string" ? payload.reviewNotes : "";
      const wordCount = body.replace(/[*_]/g, " ").split(/\s+/).filter(Boolean).length;
      if (!title || title.length > 220 || body.length > 150000 || wordCount < 20 || notes.length > 10000) {
        return new Response(JSON.stringify({ error: "Use a title of up to 220 characters, at least 20 words, and notes of up to 10,000 characters." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Retain the token while reviewing: save/preview can be repeated. Only a
      // final approve/reject consumes the private review credential.
      const { data: saved, error: saveError } = await admin.from("creator_submissions")
        .update({ title, body, word_count: wordCount, review_notes: notes })
        .eq("id", submission.id).eq("approval_token_hash", tokenHash).eq("status", "pending")
        .select("id").maybeSingle();
      if (saveError) throw saveError;
      if (!saved) throw new Error("This review has already been completed. Reload the page.");
      return new Response(JSON.stringify({ success: true, status: "pending", wordCount }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (["approve", "reject", "request_revision"].includes(action)) {
      const { data, error } = await admin.rpc("complete_creator_review", {
        p_id: submission.id, p_hash: tokenHash, p_action: action,
        p_notes: typeof payload.reviewNotes === "string" ? payload.reviewNotes : "",
      });
      if (error) throw error;
      let emailSent: boolean | undefined;
      if (action === "approve") {
        emailSent = false;
        try {
          const { data: account, error: accountError } = await admin.auth.admin.getUserById(submission.creator_user_id);
          if (accountError || !account.user?.email) throw new Error("The creator account has no deliverable email address.");
          const email = account.user.email;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              const response = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY") ?? ""}`, "Content-Type": "application/json",
                  "Idempotency-Key": `creator-published/${data.publicationId}` },
                body: JSON.stringify({
                  from: "KiN-TXT Creators <hello@kin-txt.com>", to: [email],
                  subject: "Your TXT has been published",
                  text: `Your TXT, “${submission.title}”, has been published on KiN-TXT.\n\nYou can find it in News → KiN-Creators.\n\nhttps://kin-txt.com/home\n\nThank you for sharing your writing.\nKiN-TXT`,
                }),
                signal: AbortSignal.timeout(10000),
              });
              if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
              emailSent = true;
              break;
            } catch (err) {
              if (attempt === 2) throw err;
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
          await admin.from("creator_submissions").update({ publication_email_status: "sent", publication_email_error: null }).eq("id", submission.id);
        } catch (err) {
          console.error("Publication email failed:", err);
          await admin.from("creator_submissions").update({ publication_email_status: "failed", publication_email_error: (err as Error).message }).eq("id", submission.id);
        }
      }
      return new Response(JSON.stringify({ ...data, emailSent }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown review action." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("creator-review error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
