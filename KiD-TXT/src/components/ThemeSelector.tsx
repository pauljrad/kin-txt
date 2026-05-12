import { useKidAuth } from '@/hooks/useKidAuth';
import { updateKidTheme } from '@/lib/kidAuth';
import type { KidUser } from '@/lib/kidAuth';

const THEMES: { key: KidUser['theme']; label: string; emoji: string; bg: string; border: string }[] = [
  { key: 'cream',  label: 'Cream',  emoji: '🟡', bg: '#FFF2CC', border: '#E8D48A' },
  { key: 'blue',   label: 'Blue',   emoji: '🔵', bg: '#D9EAF7', border: '#93C6E8' },
  { key: 'green',  label: 'Green',  emoji: '🟢', bg: '#E2F0D9', border: '#9DD47F' },
  { key: 'pink',   label: 'Pink',   emoji: '🌸', bg: '#FCE4EC', border: '#F06292' },
];

export function ThemeSelector() {
  const { kid, updateTheme } = useKidAuth();
  const current = kid?.theme ?? 'cream';

  const handleChange = (theme: KidUser['theme']) => {
    updateTheme(theme);
    updateKidTheme(theme);
  };

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      {THEMES.map(t => (
        <button
          key={t.key}
          title={t.label}
          onClick={() => handleChange(t.key)}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: t.bg,
            border: `3px solid ${current === t.key ? '#333' : t.border}`,
            cursor: 'pointer',
            transition: 'transform 0.15s ease, border-color 0.15s ease',
            transform: current === t.key ? 'scale(1.2)' : 'scale(1)',
            outline: 'none',
            flexShrink: 0,
          }}
          aria-label={`Switch to ${t.label} theme`}
        />
      ))}
    </div>
  );
}
