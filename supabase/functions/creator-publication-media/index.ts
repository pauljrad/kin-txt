import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    images: images.map((image: any) => ({ ...image, url: urls.get(image.storagePath) })),
    music: music.kind === "upload" ? { ...music, url: urls.get(music.storagePath) } : music,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = await req.json();
    const publicationId = typeof payload?.publicationId === "string" ? payload.publicationId.trim() : "";
    if (!/^[0-9a-f-]{36}$/i.test(publicationId)) {
      return new Response(JSON.stringify({ error: "Invalid publication." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: publication, error } = await admin
      .from("creator_publications")
      .select("id, experience, published_at")
      .eq("id", publicationId)
      .not("published_at", "is", null)
      .maybeSingle();

    if (error) throw error;
    if (!publication) {
      return new Response(JSON.stringify({ error: "Creator publication not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const experience = await resolveExperienceMedia(admin, publication.experience);
    return new Response(JSON.stringify({ success: true, experience }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    console.error("creator-publication-media error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
