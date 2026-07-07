import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_TEXT_SIZE = 40000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { text, chapterTitle } = body;

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid input', summary: null }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const textToAnalyze = text.length > MAX_TEXT_SIZE
      ? text.substring(0, MAX_TEXT_SIZE)
      : text;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ summary: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const titleContext = chapterTitle ? `Chapter: "${chapterTitle}"\n\n` : '';

    const prompt = `${titleContext}Write a single, concise paragraph (2-4 sentences) summarising the key events, themes, or ideas from the following text. Be specific to what actually happens — no vague generalisations. Write in a clear, engaging tone as if briefing an intelligent reader.\n\nText:\n${textToAnalyze}\n\nReturn ONLY the summary paragraph. No headings, no bullet points, no extra commentary.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a literary assistant that writes concise, accurate chapter summaries. Return only the summary paragraph with no additional text."
          },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error - status:", response.status);
      return new Response(JSON.stringify({ summary: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim() || null;

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in summarize-chapter function:", error);
    return new Response(JSON.stringify({ summary: null }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
