// ─── KiD-TXT text-to-speech ──────────────────────────────────────
// Turns a word, a letter or a question into audio using Azure's
// neural voices, and keeps every result in Storage so each thing is
// synthesised once for the whole school and served as a plain file
// after that. The free tier is 500k characters a month; the library
// is about 20k characters per voice, so it never gets near it.
//
// Secrets: AZURE_SPEECH_KEY, AZURE_SPEECH_REGION (e.g. "uksouth").
// Health:  GET ?health=1 → { configured: true|false }
// Speak:   POST { text, voice, rate? } → audio/mpeg
// ──────────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const BUCKET = 'kid-tts';
const MAX_CHARS = 400;
const VOICE_OK = /^en-(GB|US|AU|IE)-[A-Za-z]+Neural$/;

const key = Deno.env.get('AZURE_SPEECH_KEY') ?? '';
const region = Deno.env.get('AZURE_SPEECH_REGION') ?? '';
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Same key the client computes, so it can try Storage before calling us. */
async function objectPath(voice: string, rate: string, text: string): Promise<string> {
  return `${voice}/${rate}/${await sha256(text)}.mp3`;
}

let bucketReady = false;
async function ensureBucket(): Promise<void> {
  if (bucketReady) return;
  const r = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true, file_size_limit: 2_000_000, allowed_mime_types: ['audio/mpeg'] }),
  });
  // 409 = already exists, which is the normal case
  if (r.ok || r.status === 409) bucketReady = true;
}

async function fromStorage(path: string): Promise<ArrayBuffer | null> {
  const r = await fetch(`${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`);
  return r.ok ? await r.arrayBuffer() : null;
}

async function toStorage(path: string, audio: ArrayBuffer): Promise<void> {
  await ensureBucket();
  await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'audio/mpeg',
      'x-upsert': 'true',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
    body: audio,
  });
}

/** Ask Azure. Slightly slowed for single words and letters, so each sound is clear. */
async function synthesise(text: string, voice: string, rate: 'slow' | 'normal'): Promise<ArrayBuffer> {
  const prosody = rate === 'slow' ? '-12%' : '0%';
  const ssml =
    `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-GB'>` +
    `<voice name='${voice}'><prosody rate='${prosody}'>${escapeXml(text)}</prosody></voice></speak>`;

  const r = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'kid-txt',
    },
    body: ssml,
  });
  if (!r.ok) throw new Error(`Azure ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return await r.arrayBuffer();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const url = new URL(req.url);
  if (req.method === 'GET' && url.searchParams.has('health')) {
    return json({ configured: Boolean(key && region), region: region || null });
  }
  if (req.method !== 'POST') return json({ error: 'POST { text, voice }' }, 405);
  if (!key || !region) return json({ error: 'Voice service not set up' }, 503);

  let body: { text?: unknown; voice?: unknown; rate?: unknown };
  try { body = await req.json(); } catch { return json({ error: 'Bad JSON' }, 400); }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const voice = typeof body.voice === 'string' ? body.voice : '';
  const rate: 'slow' | 'normal' = body.rate === 'normal' ? 'normal' : 'slow';

  if (!text || text.length > MAX_CHARS) return json({ error: `text must be 1–${MAX_CHARS} characters` }, 400);
  if (!VOICE_OK.test(voice)) return json({ error: 'unknown voice' }, 400);

  const path = await objectPath(voice, rate, text);

  try {
    let audio = await fromStorage(path);
    if (!audio) {
      audio = await synthesise(text, voice, rate);
      // Don't make the child wait on the upload
      const upload = toStorage(path, audio.slice(0));
      // deno-lint-ignore no-explicit-any
      (globalThis as any).EdgeRuntime?.waitUntil?.(upload) ?? await upload;
    }
    return new Response(audio, {
      headers: { ...CORS, 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Tts-Path': path },
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'synthesis failed' }, 502);
  }
});
