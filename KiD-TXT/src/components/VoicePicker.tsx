import { useEffect, useState, useCallback } from 'react';
import { Icon } from '@/components/art/Icon';
import { useKidAuth } from '@/hooks/useKidAuth';
import { updateKidVoice, updateKidCloudVoice } from '@/lib/kidAuth';
import { listVoices, previewVoice, speechAvailable, voiceQuality } from '@/lib/speech';
import { BUNDLED_VOICES, AZURE_VOICES, cloudConfigured, prepare, play, unlockAudio, stop } from '@/lib/cloudVoice';

const SAMPLE = "Hello! I'm going to help you read today.";

/** Pick the reading voice from those the device has. Tap the speaker to hear one. */
export function VoicePicker() {
  const { kid, updateVoice, updateCloudVoice } = useKidAuth();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => listVoices());
  const [playing, setPlaying] = useState<string | null>(null);
  const [cloudOn, setCloudOn] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { cloudConfigured().then(setCloudOn); }, []);

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

  const chosen = kid.voiceURI ?? null;
  const chosenCloud = kid.cloudVoice ?? null;
  const best = voices[0]?.voiceURI ?? null;

  const choose = (uri: string | null) => {
    updateCloudVoice(null); updateKidCloudVoice(null);
    updateVoice(uri); updateKidVoice(uri);
  };

  const chooseCloud = (id: string) => {
    updateCloudVoice(id); updateKidCloudVoice(id);
  };

  const tryCloud = async (id: string) => {
    unlockAudio();
    stop();
    setBusy(id);
    try {
      const buffer = await prepare(SAMPLE, id, 'normal');
      setBusy(null);
      setPlaying(id);
      await play(buffer);
    } catch { /* nothing to play */ }
    setBusy(null);
    setPlaying((p) => (p === id ? null : p));
  };

  const tryVoice = (v: SpeechSynthesisVoice) => {
    setPlaying(v.voiceURI);
    previewVoice(v, SAMPLE);
    setTimeout(() => setPlaying((p) => (p === v.voiceURI ? null : p)), 3200);
  };

  const badge = (v: SpeechSynthesisVoice) => {
    if (/premium/i.test(v.name)) return 'Premium';
    if (/enhanced/i.test(v.name)) return 'Enhanced';
    if (/siri/i.test(v.name)) return 'Siri';
    if (voiceQuality(v) >= 25) return 'Natural';
    return null;
  };

  const region = (v: SpeechSynthesisVoice) => {
    const tag = v.lang.replace('_', '-').toUpperCase();
    return tag === 'EN-GB' ? 'British' : tag === 'EN-US' ? 'American' : tag === 'EN-AU' ? 'Australian'
      : tag === 'EN-IE' ? 'Irish' : tag === 'EN-ZA' ? 'South African' : tag === 'EN-IN' ? 'Indian' : v.lang;
  };

  const deviceList = !speechAvailable() ? (
    <p style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-muted)' }}>This device can't read aloud on its own.</p>
  ) : voices.length === 0 ? (
    <div className="note">
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
      <VoiceRow
        name="Automatic"
        detail={voices[0] ? `Currently ${voices[0].name.replace(/\s*\(.*\)$/, '')}` : 'Best voice on this device'}
        badge={null}
        selected={chosenCloud === null && chosen === null}
        playing={best !== null && playing === best}
        onSelect={() => choose(null)}
        onTry={voices[0] ? () => tryVoice(voices[0]) : undefined}
      />
      {voices.map((v) => (
        <VoiceRow
          key={v.voiceURI}
          name={v.name.replace(/\s*\((Enhanced|Premium)\)$/i, '')}
          detail={region(v)}
          badge={badge(v)}
          selected={chosenCloud === null && chosen === v.voiceURI}
          playing={playing === v.voiceURI}
          onSelect={() => choose(v.voiceURI)}
          onTry={() => tryVoice(v)}
        />
      ))}
    </div>
  );

  return (
    <div>
      <div className="voice-group">
        <span>Realistic voices</span>
        <span className="voice-group-note">Recommended</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        {[...BUNDLED_VOICES, ...(cloudOn ? AZURE_VOICES : [])].map((v) => (
              <VoiceRow
                key={v.id}
                name={v.name}
                detail={`${v.accent} · ${v.blurb}`}
                badge={v.child ? 'Child' : null}
                selected={chosenCloud === v.id}
                playing={playing === v.id}
                busy={busy === v.id}
                onSelect={() => chooseCloud(v.id)}
                onTry={() => tryCloud(v.id)}
          />
        ))}
      </div>
      <div className="voice-group">
        <span>On this device</span>
        <span className="voice-group-note">Built in</span>
      </div>
      {deviceList}
    </div>
  );
}

function VoiceRow({
  name, detail, badge, selected, playing, busy, onSelect, onTry,
}: {
  name: string;
  detail: string;
  badge: string | null;
  selected: boolean;
  playing: boolean;
  busy?: boolean;
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
          {badge && <span className="mini-tag" style={{ color: 'var(--correct)', fontSize: '0.62rem' }}>{badge}</span>}
        </div>
        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)' }}>{detail}</div>
      </div>

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
