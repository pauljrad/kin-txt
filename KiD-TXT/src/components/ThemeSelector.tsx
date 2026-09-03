import { useKidAuth } from '@/hooks/useKidAuth';
import { updateKidTheme } from '@/lib/kidAuth';
import type { KidUser } from '@/lib/kidAuth';

// Named after the album grounds they're taken from, not "blue" / "pink".
const THEMES: { key: KidUser['theme']; label: string; bg: string; ink: string }[] = [
  { key: 'cream', label: 'Sand',   bg: '#F4E7D0', ink: '#C8322B' },
  { key: 'blue',  label: 'Marine', bg: '#CFE3EE', ink: '#1D5C86' },
  { key: 'green', label: 'Jungle', bg: '#D9E8D4', ink: '#3E8563' },
  { key: 'pink',  label: 'Poppy',  bg: '#F6DED9', ink: '#A6432F' },
];

export function ThemeSelector() {
  const { kid, updateTheme } = useKidAuth();
  const current = kid?.theme ?? 'cream';

  const handleChange = (theme: KidUser['theme']) => {
    updateTheme(theme);
    updateKidTheme(theme);
  };

  return (
    <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexShrink: 0 }}>
      {THEMES.map((t) => {
        const active = current === t.key;
        return (
          <button
            key={t.key}
            title={t.label}
            aria-label={`${t.label} theme`}
            aria-pressed={active}
            onClick={() => handleChange(t.key)}
            style={{
              width: active ? '26px' : '22px',
              height: active ? '26px' : '22px',
              borderRadius: '50%',
              background: t.bg,
              border: `2.5px solid ${active ? t.ink : 'var(--border)'}`,
              boxShadow: active ? `0 2px 0 ${t.ink}` : 'none',
              cursor: 'pointer',
              padding: 0,
              transition: 'width 0.15s ease, height 0.15s ease',
              flexShrink: 0,
            }}
          />
        );
      })}
    </div>
  );
}
