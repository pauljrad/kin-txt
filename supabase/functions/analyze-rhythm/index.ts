import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate rhythm speeds locally using heuristics - no AI call needed for speed
function generateLocalRhythm(words: string[]): Array<{word: string, speed: number}> {
  const results: Array<{word: string, speed: number}> = [];
  
  // Quick function words - read faster
  const quickWords = new Set([
    'the','a','an','and','or','but','in','on','at','to','for','of','with','by','is','it','as','be',
    'was','were','been','are','have','has','had','do','does','did','will','would','could','should',
    'may','might','must','shall','can','that','this','these','those','i','you','he','she','we','they',
    'my','your','his','her','its','our','their','me','him','us','them','so','if','then','than','just',
    'not','no','yes','all','any','some','each','every','into','onto','from','about','through'
  ]);
  
  // Slow down for important/heavy words
  const slowWords = new Set([
    'however','therefore','nevertheless','furthermore','consequently','meanwhile','although',
    'because','suddenly','immediately','finally','always','never','perhaps','probably'
  ]);

  let prevEndedSentence = false;
  let prevHadComma = false;
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const cleanWord = word.toLowerCase().replace(/[.,!?;:'"—–\-()[\]]/g, '');
    
    // Base speed - slightly faster baseline
    let speed = 1.1;
    
    // After sentence end, slow down for new thought
    if (prevEndedSentence) {
      speed = 0.75;
      prevEndedSentence = false;
      prevHadComma = false;
    } else if (prevHadComma) {
      speed = 0.9;
      prevHadComma = false;
    }
    
    // Quick function words
    if (quickWords.has(cleanWord) && cleanWord.length <= 4) {
      speed = Math.min(speed + 0.25, 1.4);
    } else if (quickWords.has(cleanWord)) {
      speed = Math.min(speed + 0.15, 1.3);
    }
    
    // Slow words
    if (slowWords.has(cleanWord)) {
      speed = 0.8;
    }
    
    // Word length adjustments
    if (cleanWord.length >= 10) {
      speed -= 0.25;
    } else if (cleanWord.length >= 7) {
      speed -= 0.1;
    } else if (cleanWord.length <= 2 && !quickWords.has(cleanWord)) {
      speed += 0.1;
    }
    
    // First word - slightly slower
    if (i === 0) {
      speed = 0.85;
    }
    
    // Capitalized words mid-sentence
    if (word[0] && word[0] === word[0].toUpperCase() && i > 0 && !prevEndedSentence) {
      speed -= 0.08;
    }
    
    // Punctuation handling
    if (/[.!?]$/.test(word)) {
      speed -= 0.15;
      prevEndedSentence = true;
    } else if (/[,;:]$/.test(word)) {
      speed -= 0.08;
      prevHadComma = true;
    } else if (/[—–\-]$/.test(word)) {
      speed -= 0.12;
      prevHadComma = true;
    }
    
    if (/!$/.test(word)) {
      speed -= 0.1;
    }
    
    if (/^["']/.test(word)) {
      speed -= 0.05;
    }
    
    // Tighter clamp for consistent flow
    speed = Math.max(0.65, Math.min(1.45, speed));
    results.push({ word, speed });
  }
  
  return results;
}

// Maximum text size for rhythm analysis (500KB - local heuristics, no AI call)
const MAX_TEXT_SIZE = 500000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', wordSpeeds: [] }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError?.message || 'No user');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', wordSpeeds: [] }),
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
        wordSpeeds: [] 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (text.length > MAX_TEXT_SIZE) {
      return new Response(JSON.stringify({ 
        error: `Text too large (max ${MAX_TEXT_SIZE} characters)`, 
        wordSpeeds: [] 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Split text into words
    const words = text.split(/\s+/).filter((w: string) => w.length > 0);
    
    // Generate rhythm using fast local heuristics
    const wordSpeeds = generateLocalRhythm(words);
    
    console.log(`Generated rhythm for ${wordSpeeds.length} words using heuristics`);

    return new Response(JSON.stringify({ wordSpeeds }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-rhythm function:", error);
    
    return new Response(JSON.stringify({ error: "An error occurred", wordSpeeds: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
