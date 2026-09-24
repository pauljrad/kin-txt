import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "manuscript-submissions";
const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["pdf", "doc", "docx", "rtf", "txt", "epub"]);

function safeFilename(input: unknown) {
  const raw = typeof input === "string" ? input.trim() : "";
  const fallback = "manuscript";
  const name = raw.split(/[\\/]/).pop() || fallback;
  return name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 180) || fallback;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const filename = safeFilename(body?.filename);
    const size = Number(body?.size ?? 0);
    const contentType = typeof body?.contentType === "string" && body.contentType
      ? body.contentType
      : "application/octet-stream";

    const extension = filename.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return new Response(JSON.stringify({ error: "Unsupported manuscript file type." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "Manuscripts must be 50 MB or smaller." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const datePrefix = new Date().toISOString().slice(0, 10);
    const path = `${datePrefix}/${crypto.randomUUID()}-${filename}`;

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data?.token) {
      console.error("Could not create manuscript upload URL:", error);
      return new Response(JSON.stringify({ error: "Could not prepare manuscript upload." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      bucket: BUCKET,
      path,
      token: data.token,
      signedUrl: data.signedUrl,
      contentType,
      maxBytes: MAX_BYTES,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-manuscript-upload error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
