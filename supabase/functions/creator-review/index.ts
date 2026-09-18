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
      .select("id, creator_user_id, creator_name, creator_email, content_type, title, body, word_count, status, submitted_at, experience")
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
        },
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "approve") {
      const { data: publication, error: publishError } = await admin
        .from("creator_publications")
        .upsert({
          submission_id: submission.id,
          creator_user_id: submission.creator_user_id,
          creator_name: submission.creator_name,
          content_type: submission.content_type,
          title: submission.title,
          body: submission.body,
          word_count: submission.word_count,
          experience: submission.experience ?? {},
        }, { onConflict: "submission_id" })
        .select("id")
        .single();

      if (publishError || !publication) throw publishError ?? new Error("Could not publish this TXT.");

      const { error: reviewError } = await admin
        .from("creator_submissions")
        .update({
          status: "approved",
          approval_token_hash: null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", submission.id)
        .eq("approval_token_hash", tokenHash)
        .eq("status", "pending");

      if (reviewError) throw reviewError;

      return new Response(JSON.stringify({ success: true, status: "approved", publicationId: publication.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reject") {
      const { error: rejectError } = await admin
        .from("creator_submissions")
        .update({
          status: "rejected",
          approval_token_hash: null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", submission.id)
        .eq("approval_token_hash", tokenHash)
        .eq("status", "pending");

      if (rejectError) throw rejectError;

      return new Response(JSON.stringify({ success: true, status: "rejected" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
