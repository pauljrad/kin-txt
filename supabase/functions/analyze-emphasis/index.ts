import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Maximum text size for analysis (50KB)
const MAX_TEXT_SIZE = 50000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Auth error: Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', emphasisWords: [], whisperedWords: [] }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jwt = authHeader.replace('Bearer ', '');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Explicitly pass the JWT to getUser for reliable auth
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      console.error('Auth error:', userError?.message || 'Auth session missing!');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', emphasisWords: [], whisperedWords: [] }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    const body = await req.json();
    const { text } = body;

    // Input validation
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({
        error: 'Invalid input: text is required and must be a string',
        emphasisWords: [],
        whisperedWords: []
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If text is too large, analyze a sample instead of rejecting
    let textToAnalyze = text;
    let wasTruncated = false;

    if (text.length > MAX_TEXT_SIZE) {
      console.log(`Text too large (${text.length} chars), analyzing first ${MAX_TEXT_SIZE} characters`);
      textToAnalyze = text.substring(0, MAX_TEXT_SIZE);
      wasTruncated = true;
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      // Return empty arrays gracefully - emphasis is optional
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ emphasisWords: [], whisperedWords: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse the text to get words
    const words = textToAnalyze.split(/\\s+/).filter((w: string) => w.length > 0);

    // First, find words that are in ALL CAPS (3+ letters, all uppercase)
    const allCapsWords = words
      .filter((w: string) => {
        // Must be at least 3 letters, all letters uppercase, may have punctuation at end
        const cleanWord = w.replace(/[.,!?;:""'""']/g, '');
        return cleanWord.length >= 3 && /^[A-Z]+$/.test(cleanWord);
      })
      .map((w: string) => w); // Keep original with potential punctuation

    // Create a prompt to identify emphatic words AND whispered/quiet words
    const prompt = `Analyze the following text and identify words that should be emphasized for dramatic effect. Return TWO categories:

1. LOUD/EMPHASIS words (displayed LARGER) - ONLY include truly dramatic words:
- Loud onomatopoeia (BANG, CRASH, BOOM, THUD, etc.)
- Violent/Urgent actions (STAB, SHOT, KILL, RUN, FIRE, EXPLODE)
- Intense exclamations that carry high dramatic weight.
- CRITICAL: DO NOT include names of people or places.
- CRITICAL: DO NOT include common nouns or descriptive adjectives unless they are violent/loud.

2. QUIET/WHISPERED words (displayed SMALLER) - typically:
- Specific words indicating whispers (whispered, muttered, hushed).
- Secretive or subtle words.

Text: \"${textToAnalyze}\"

Return ONLY a JSON object with two arrays:
{
  \"emphasis\": [\"word1\", \"word2\"],
  \"whispered\": [\"word3\", \"word4\"]
}

Match the exact spelling and case from the text. Include no more than 10-15 truly high-impact words per category for the entire text. Quality over quantity.

Example response: {\"emphasis\": [\"BANG\", \"crash\", \"fire\"], \"whispered\": [\"secret\", \"quietly\", \"hush\"]}`;

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
            content: "You are a text analyzer that identifies emphatic words. Respond only with a valid JSON array."
          },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      // Log detailed error server-side only (no response body in logs)
      console.error("AI gateway error - status:", response.status);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded", emphasisWords: [], whisperedWords: [] }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Return empty arrays on error so the app still works
      return new Response(JSON.stringify({ emphasisWords: [], whisperedWords: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";

    // Parse the JSON response
    let emphasisWords: string[] = [];
    let whisperedWords: string[] = [];
    try {
      // Clean the response - remove markdown code blocks if present
      const cleaned = content.replace(/```json\\n?|\\n?```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      // Handle both old array format and new object format
      if (Array.isArray(parsed)) {
        emphasisWords = parsed;
      } else if (typeof parsed === 'object') {
        emphasisWords = Array.isArray(parsed.emphasis) ? parsed.emphasis : [];
        whisperedWords = Array.isArray(parsed.whispered) ? parsed.whispered : [];
      }
    } catch (parseError) {
      // Log parse error server-side without exposing content
      console.error("Failed to parse AI response");
      emphasisWords = [];
      whisperedWords = [];
    }

    // Merge ALL CAPS words with AI-identified emphasis words
    // Remove duplicates by converting to a Set and back
    const mergedEmphasis = Array.from(new Set([...allCapsWords, ...emphasisWords]));

    return new Response(JSON.stringify({ emphasisWords: mergedEmphasis, whisperedWords }), {
      headers: {
        ...corsHeaders, "Content-Type": "application/json"
      },
    });
  } catch (error) {
    // Log detailed error server-side
    console.error("Error in analyze-emphasis function");

    // Return generic error to client
    return new Response(JSON.stringify({ error: "An error occurred while processing your request", emphasisWords: [], whisperedWords: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
