// ─── AI voice worker ─────────────────────────────────────────────
// Runs Piper (a neural text-to-speech model) in a Web Worker so the
// interface never stalls while a word is synthesised. Models are
// fetched once from HuggingFace and kept in the origin's private file
// system, so after the first download a voice works offline.
// ──────────────────────────────────────────────────────────────────

import * as tts from '@diffusionstudio/vits-web';

export type WorkerRequest =
  | { id: number; type: 'stored' }
  | { id: number; type: 'download'; voiceId: string }
  | { id: number; type: 'remove'; voiceId: string }
  | { id: number; type: 'predict'; voiceId: string; text: string };

export type WorkerResponse =
  | { id: number; type: 'progress'; loaded: number; total: number }
  | { id: number; type: 'done'; stored?: string[]; wav?: ArrayBuffer }
  | { id: number; type: 'error'; message: string };

const post = (msg: WorkerResponse, transfer?: Transferable[]) =>
  (self as unknown as Worker).postMessage(msg, transfer ?? []);

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  try {
    switch (req.type) {
      case 'stored': {
        post({ id: req.id, type: 'done', stored: await tts.stored() });
        break;
      }
      case 'download': {
        await tts.download(req.voiceId as tts.VoiceId, (p) => {
          post({ id: req.id, type: 'progress', loaded: p.loaded, total: p.total });
        });
        post({ id: req.id, type: 'done' });
        break;
      }
      case 'remove': {
        await tts.remove(req.voiceId as tts.VoiceId);
        post({ id: req.id, type: 'done' });
        break;
      }
      case 'predict': {
        const wav = await tts.predict({ text: req.text, voiceId: req.voiceId as tts.VoiceId });
        const buf = await wav.arrayBuffer();
        post({ id: req.id, type: 'done', wav: buf }, [buf]);
        break;
      }
    }
  } catch (err) {
    post({ id: req.id, type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
