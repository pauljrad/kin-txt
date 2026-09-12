import { useEffect, useState, useCallback } from 'react';
import { Icon } from '@/components/art/Icon';
import { useKidAuth } from '@/hooks/useKidAuth';
import { updateKidVoice } from '@/lib/kidAuth';
import { listVoices, previewVoice, speechAvailable, voiceQuality } from '@/lib/speech';

const SAMPLE = "Hello! I'm going to help you read today.";

/**
 * Pick the reading voice. Voices come from the device, so what's on
 * offer differs between an iPhone, an iPad and a laptop. The best
 * iPhone voices have to be downloaded first — the note at the bottom
 * says where.
 */
export function VoicePicker() {
  const { kid, updateVoice } = useKidAuth();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => listVoices());
  const [playing, setPlaying] = useState<string | null>(null);

  const refresh = useCallback(() => setVoices(listVoices()), []);

  useEffect(() => {
    if (!speechAvailable()) return;
    refresh();
    window.speechSynthesis.addEventListener('voiceschanged', refresh);
    // iOS sometimes only fills the list after a moment
    const t = setTimeout(refresh, 600);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', refresh);
      clearTimeout(t);
    };
  }, [refresh]);

  if (!kid) return null;

  if (!speechAvailable()) {
    return (
      <p style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-muted)' }}>
        This device can't read aloud.
      </p>
    );
  }

  const chosenURI = kid.voiceURI ?? null;
  const best = voices[0]?.voiceURI ?? null;

  const choose = (uri: string | null) => {
    updateVoice(uri);
    updateKidVoice(uri);
  };

  const tryVoice = (v: SpeechSynthesisVoice) => {
    setPlaying(v.voiceURI);
    previewVoice(v, SAMPLE);
    setTimeout(() => setPlaying((p) => (p === v.voiceURI ? null : p)), 3200);
  };

  const label = (v: SpeechSynthesisVoice) => {
    const q = voiceQuality(v);
    if (/premium/i.test(v.name)) return 'Premium';
    if (/enhanced/i.test(v.name)) return 'Enhanced';
    if (/siri/i.test(v.name)) return 'Siri';
    if (q >= 25) return 'Natural';
    return null;
  };

  // Voices carry their region in the name on some devices, not others
  const region = (v: SpeechSynthesisVoice) => {
    const tag = v.lang.replace('_', '-').toUpperCase();
    return tag === 'EN-GB' ? 'British' : tag === 'EN-US' ? 'American' : tag === 'EN-AU' ? 'Australian' : tag === 'EN-IE' ? 'Irish' : tag === 'EN-ZA' ? 'South African' : tag === 'EN-IN' ? 'Indian' : v.lang;
  };

  return (
    <div>
      {voices.length === 0 ? (
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '19rem', overflowY: 'auto', paddingRight: '2px' }}>
          {/* Automatic: whatever the device's best is */}
          <VoiceRow
            name="Automatic"
            detail={voices[0] ? `Currently ${voices[0].name.replace(/\s*\(.*\)$/, '')}` : 'Best voice on this device'}
            badge={null}
            selected={chosenURI === null}
            playing={best !== null && playing === best}
            onSelect={() => choose(null)}
            onTry={voices[0] ? () => tryVoice(voices[0]) : undefined}
          />
          {voices.map((v) => (
            <VoiceRow
              key={v.voiceURI}
              name={v.name.replace(/\s*\((Enhanced|Premium)\)$/i, '')}
              detail={region(v)}
              badge={label(v)}
              selected={chosenURI === v.voiceURI}
              playing={playing === v.voiceURI}
              onSelect={() => choose(v.voiceURI)}
              onTry={() => tryVoice(v)}
            />
          ))}
        </div>
      )}

      <div className="note" style={{ marginTop: '12px' }}>
        <Icon name="lightbulb" size={19} />
        <div>
          The friendliest voices on an iPhone or iPad are the <strong>Enhanced</strong> ones,
          which are a free download: Settings → Accessibility → Spoken Content → Voices →
          English → choose a voice → download its Enhanced version. Then come back here and
          look again.
        </div>
      </div>
    </div>
  );
}

function VoiceRow({
  name, detail, badge, selected, playing, onSelect, onTry,
}: {
  name: string;
  detail: string;
  badge: string | null;
  selected: boolean;
  playing: boolean;
  onSelect: () => void;
  onTry?: () => void;
}) {
  return (
    <div
      className="voice-row"
      data-selected={selected}
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
    >
      <div className="voice-dot" aria-hidden="true">
        {selected && <Icon name="check" size={14} strokeWidth={3.2} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
          <span style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 600, fontSize: '0.98rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </span>
          {badge && (
            <span className="mini-tag" style={{ color: 'var(--correct)', fontSize: '0.62rem' }}>{badge}</span>
          )}
        </div>
        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>{detail}</div>
      </div>

      {onTry && (
        <button
          onClick={(e) => { e.stopPropagation(); onTry(); }}
          className="icon-btn"
          style={{ width: '42px', height: '42px', background: playing ? 'var(--sun)' : undefined }}
          aria-label={`Hear ${name}`}
        >
          <Icon name="sound" size={19} />
        </button>
      )}
    </div>
  );
}
