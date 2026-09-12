import { useEffect, useState, useCallback } from 'react';
import { Icon } from '@/components/art/Icon';
import { useKidAuth } from '@/hooks/useKidAuth';
import { updateKidVoice, updateKidAiVoice } from '@/lib/kidAuth';
import {
  listVoices, previewVoice, speechAvailable, voiceQuality, letterNames,
} from '@/lib/speech';
import {
  AI_VOICES, aiVoicesSupported, storedAiVoices, downloadAiVoice,
  synthesise, play, warm, unlockAudio, type AiVoice,
} from '@/lib/aiVoice';

const SAMPLE = "Hello! I'm going to help you read today.";

type DownloadState = { status: 'idle' } | { status: 'downloading'; fraction: number } | { status: 'ready' } | { status: 'error'; message: string };

/**
 * Pick the reading voice.
 *
 * Two kinds. AI voices are free neural voices that download once
 * (about 60MB) and then run on the device — the same on every phone,
 * and much friendlier than the built-in default. Device voices are
 * whatever the phone already has, which varies and is often robotic
 * until an Enhanced voice is downloaded in iOS settings.
 */
export function VoicePicker() {
  const { kid, updateVoice, updateAiVoice } = useKidAuth();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => listVoices());
  const [playing, setPlaying] = useState<string | null>(null);
  const [stored, setStored] = useState<Set<string>>(new Set());
  const [downloads, setDownloads] = useState<Record<string, DownloadState>>({});
  const [preparing, setPreparing] = useState<string | null>(null);

  const refresh = useCallback(() => setVoices(listVoices()), []);

  useEffect(() => {
    if (speechAvailable()) {
      refresh();
      window.speechSynthesis.addEventListener('voiceschanged', refresh);
    }
    const t = setTimeout(refresh, 600);
    if (aiVoicesSupported()) {
      storedAiVoices().then((ids) => setStored(new Set(ids))).catch(() => {});
    }
    return () => {
      if (speechAvailable()) window.speechSynthesis.removeEventListener('voiceschanged', refresh);
      clearTimeout(t);
    };
  }, [refresh]);

  if (!kid) return null;

  const chosenDevice = kid.voiceURI ?? null;
  const chosenAi = kid.aiVoiceId ?? null;
  const best = voices[0]?.voiceURI ?? null;

  // ── choosing ──
  const chooseDevice = (uri: string | null) => {
    updateAiVoice(null); updateKidAiVoice(null);
    updateVoice(uri); updateKidVoice(uri);
  };

  const chooseAi = (id: string) => {
    updateAiVoice(id); updateKidAiVoice(id);
    // Make the letter names now, so the first spelling lesson is instant
    void warm(letterNames(), id);
  };

  // ── AI voice download ──
  const getAi = async (v: AiVoice) => {
    unlockAudio();
    setDownloads((d) => ({ ...d, [v.id]: { status: 'downloading', fraction: 0 } }));
    try {
      await downloadAiVoice(v.id, (f) => {
        setDownloads((d) => ({ ...d, [v.id]: { status: 'downloading', fraction: f } }));
      });
      setStored((s) => new Set(s).add(v.id));
      setDownloads((d) => ({ ...d, [v.id]: { status: 'ready' } }));
      chooseAi(v.id);
    } catch (e) {
      setDownloads((d) => ({ ...d, [v.id]: { status: 'error', message: e instanceof Error ? e.message : 'Download failed' } }));
    }
  };

  const tryAi = async (v: AiVoice) => {
    unlockAudio();
    setPreparing(v.id);
    try {
      const buffer = await synthesise(SAMPLE, v.id);
      setPreparing(null);
      setPlaying(v.id);
      await play(buffer);
    } catch { /* nothing to play */ }
    setPreparing(null);
    setPlaying((p) => (p === v.id ? null : p));
  };

  const tryDevice = (v: SpeechSynthesisVoice) => {
    setPlaying(v.voiceURI);
    previewVoice(v, SAMPLE);
    setTimeout(() => setPlaying((p) => (p === v.voiceURI ? null : p)), 3200);
  };

  const label = (v: SpeechSynthesisVoice) => {
    if (/premium/i.test(v.name)) return 'Premium';
    if (/enhanced/i.test(v.name)) return 'Enhanced';
    if (/siri/i.test(v.name)) return 'Siri';
    if (voiceQuality(v) >= 25) return 'Natural';
    return null;
  };

  const region = (v: SpeechSynthesisVoice) => {
    const tag = v.lang.replace('_', '-').toUpperCase();
    return tag === 'EN-GB' ? 'British' : tag === 'EN-US' ? 'American' : tag === 'EN-AU' ? 'Australian' : tag === 'EN-IE' ? 'Irish' : tag === 'EN-ZA' ? 'South African' : tag === 'EN-IN' ? 'Indian' : v.lang;
  };

  return (
    <div>
      {/* ── AI voices ── */}
      {aiVoicesSupported() && (
        <>
          <div className="voice-group">
            <span>AI voices</span>
            <span className="voice-group-note">Free · download once · work offline</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {AI_VOICES.map((v) => {
              const ready = stored.has(v.id);
              const dl = downloads[v.id] ?? { status: ready ? 'ready' : 'idle' };
              const selected = chosenAi === v.id;
              return (
                <VoiceRow
                  key={v.id}
                  name={v.name}
                  detail={`${v.accent} · ${v.blurb}`}
                  badge={ready ? 'AI' : null}
                  selected={selected}
                  playing={playing === v.id}
                  busy={preparing === v.id}
                  onSelect={ready ? () => chooseAi(v.id) : undefined}
                  onTry={ready ? () => tryAi(v) : undefined}
                  action={
                    dl.status === 'downloading' ? (
                      <div className="dl-track" aria-label={`Downloading ${Math.round(dl.fraction * 100)}%`}>
                        <div className="dl-fill" style={{ width: `${Math.round(dl.fraction * 100)}%` }} />
                        <span>{Math.round(dl.fraction * 100)}%</span>
                      </div>
                    ) : dl.status === 'error' ? (
                      <button onClick={(e) => { e.stopPropagation(); void getAi(v); }} className="kid-btn kid-btn-ghost dl-btn" style={{ color: 'var(--wrong)' }}>
                        Try again
                      </button>
                    ) : !ready ? (
                      <button onClick={(e) => { e.stopPropagation(); void getAi(v); }} className="kid-btn kid-btn-primary dl-btn">
                        Get · {v.sizeMB}MB
                      </button>
                    ) : null
                  }
                />
              );
            })}
          </div>
        </>
      )}

      {/* ── Device voices ── */}
      <div className="voice-group">
        <span>On this device</span>
        <span className="voice-group-note">{voices.length === 0 ? 'None found' : `${voices.length} found`}</span>
      </div>

      {!speechAvailable() ? (
        <p style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-muted)' }}>This device can't read aloud on its own.</p>
      ) : voices.length === 0 ? (
        <div className="note" style={{ marginBottom: '12px' }}>
          <Icon name="sound" size={19} />
          <div>
            No voices found yet.{' '}
            <button onClick={refresh} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 800, cursor: 'pointer', padding: 0, font: 'inherit' }}>
              Look again
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '17rem', overflowY: 'auto', paddingRight: '2px' }}>
          <VoiceRow
            name="Automatic"
            detail={voices[0] ? `Currently ${voices[0].name.replace(/\s*\(.*\)$/, '')}` : 'Best voice on this device'}
            badge={null}
            selected={chosenAi === null && chosenDevice === null}
            playing={best !== null && playing === best}
            onSelect={() => chooseDevice(null)}
            onTry={voices[0] ? () => tryDevice(voices[0]) : undefined}
          />
          {voices.map((v) => (
            <VoiceRow
              key={v.voiceURI}
              name={v.name.replace(/\s*\((Enhanced|Premium)\)$/i, '')}
              detail={region(v)}
              badge={label(v)}
              selected={chosenAi === null && chosenDevice === v.voiceURI}
              playing={playing === v.voiceURI}
              onSelect={() => chooseDevice(v.voiceURI)}
              onTry={() => tryDevice(v)}
            />
          ))}
        </div>
      )}

      <div className="note" style={{ marginTop: '12px' }}>
        <Icon name="lightbulb" size={19} />
        <div>
          An AI voice sounds the same on every phone and tablet. If you'd rather use a
          built-in one, the friendliest on iPhone are the <strong>Enhanced</strong> voices:
          Settings → Accessibility → Spoken Content → Voices → English → download the
          Enhanced version, then come back and look again.
        </div>
      </div>
    </div>
  );
}

function VoiceRow({
  name, detail, badge, selected, playing, busy, onSelect, onTry, action,
}: {
  name: string;
  detail: string;
  badge: string | null;
  selected: boolean;
  playing: boolean;
  busy?: boolean;
  onSelect?: () => void;
  onTry?: () => void;
  action?: React.ReactNode;
}) {
  const selectable = !!onSelect;
  return (
    <div
      className="voice-row"
      data-selected={selected}
      data-selectable={selectable}
      role={selectable ? 'radio' : undefined}
      aria-checked={selectable ? selected : undefined}
      tabIndex={selectable ? 0 : -1}
      onClick={onSelect}
      onKeyDown={(e) => { if (onSelect && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(); } }}
    >
      <div className="voice-dot" aria-hidden="true" style={{ opacity: selectable ? 1 : 0.35 }}>
        {selected && <Icon name="check" size={14} strokeWidth={3.2} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
          <span style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 600, fontSize: '0.98rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </span>
          {badge && <span className="mini-tag" style={{ color: 'var(--correct)', fontSize: '0.62rem' }}>{badge}</span>}
        </div>
        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail}</div>
      </div>

      {action}

      {onTry && (
        <button
          onClick={(e) => { e.stopPropagation(); onTry(); }}
          className="icon-btn"
          style={{ width: '42px', height: '42px', background: playing ? 'var(--sun)' : undefined }}
          aria-label={`Hear ${name}`}
          disabled={busy}
        >
          {busy ? <span className="spinner" aria-hidden="true" /> : <Icon name="sound" size={19} />}
        </button>
      )}
    </div>
  );
}
