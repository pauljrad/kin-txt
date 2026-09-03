// ─── KiD-TXT Icons ───────────────────────────────────────────────
// One stroked icon set, drawn on a 24-grid at a single line weight so
// icons sit beside each other without one looking heavier. Replaces
// every emoji in the interface: emoji render differently on each
// device, can't take a brand colour, and read as filler.
// ──────────────────────────────────────────────────────────────────

export type IconName =
  // UI
  | 'back' | 'play' | 'pause' | 'restart' | 'rewind' | 'sound'
  | 'coin' | 'star' | 'trophy' | 'check' | 'close' | 'chevron'
  | 'person' | 'brush' | 'plus' | 'minus' | 'lightbulb' | 'clipboard'
  // reading skills
  | 'clarify' | 'retrieve' | 'summarise' | 'infer'
  | 'predict' | 'structure' | 'language' | 'compare'
  // text types
  | 'narrative' | 'descriptive' | 'expository' | 'persuasive'
  | 'procedural' | 'recount' | 'explanation' | 'report'
  | 'poetry' | 'biography';

/** Paths are stroked, not filled, unless the entry says otherwise. */
const PATHS: Record<IconName, { d: string; fill?: boolean }[]> = {
  // ── UI ──
  back:     [{ d: 'M15 5 L8 12 L15 19' }],
  chevron:  [{ d: 'M9 5 L16 12 L9 19' }],
  play:     [{ d: 'M8 5 L19 12 L8 19 Z', fill: true }],
  pause:    [{ d: 'M9 5 L9 19 M15 5 L15 19' }],
  restart:  [{ d: 'M20 12 a8 8 0 1 1 -3-6.2' }, { d: 'M20 4 L20 10 L14 10' }],
  rewind:   [{ d: 'M4 12 a8 8 0 1 0 3-6.2' }, { d: 'M4 4 L4 10 L10 10' }],
  sound:    [
    { d: 'M4 9 L8 9 L13 5 L13 19 L8 15 L4 15 Z' },
    { d: 'M17 9.5 a4 4 0 0 1 0 5' },
    { d: 'M19.5 7 a7.5 7.5 0 0 1 0 10' },
  ],
  // Two rings read as a struck coin at 16px; a currency glyph turns to mush
  coin:     [{ d: 'M12 3 a9 9 0 1 1 0 18 a9 9 0 0 1 0-18 Z' }, { d: 'M12 7 a5 5 0 1 1 0 10 a5 5 0 0 1 0-10 Z' }],
  star:     [{ d: 'M12 3 L14.6 9.2 L21 9.8 L16.2 14.2 L17.7 20.5 L12 17.2 L6.3 20.5 L7.8 14.2 L3 9.8 L9.4 9.2 Z' }],
  trophy:   [
    { d: 'M7 4 L17 4 L17 10 a5 5 0 0 1 -10 0 Z' },
    { d: 'M7 5.5 L4 5.5 a3 3 0 0 0 3 4' },
    { d: 'M17 5.5 L20 5.5 a3 3 0 0 1 -3 4' },
    { d: 'M12 15 L12 18 M8.5 20.5 L15.5 20.5' },
  ],
  check:    [{ d: 'M5 12.5 L10 17.5 L19 7' }],
  close:    [{ d: 'M6 6 L18 18 M18 6 L6 18' }],
  person:   [{ d: 'M12 4 a4 4 0 1 1 0 8 a4 4 0 0 1 0-8 Z' }, { d: 'M4.5 20.5 a7.5 7.5 0 0 1 15 0' }],
  brush:    [{ d: 'M4 20 c 0-4 2-5 4-5 a2.5 2.5 0 0 1 1 4.9 C 7.5 20.5 5.5 20.5 4 20 Z' }, { d: 'M9.5 16 L19 6.5 a2 2 0 0 0-2.8-2.8 L6.7 13.2' }],
  plus:     [{ d: 'M12 5 L12 19 M5 12 L19 12' }],
  minus:    [{ d: 'M5 12 L19 12' }],
  lightbulb:[{ d: 'M12 3 a6 6 0 0 1 3.6 10.8 c-.8.7-1.1 1.4-1.1 2.2 L9.5 16 c0-.8-.3-1.5-1.1-2.2 A6 6 0 0 1 12 3 Z' }, { d: 'M9.8 19 L14.2 19 M10.5 21.5 L13.5 21.5' }],
  clipboard:[{ d: 'M8 4.5 L6 4.5 L6 20.5 L18 20.5 L18 4.5 L16 4.5' }, { d: 'M9 3 L15 3 L15 6.5 L9 6.5 Z' }, { d: 'M9.5 11 L14.5 11 M9.5 15 L14.5 15' }],

  // ── Reading skills ──
  // Clarify: a magnifier over a word
  clarify:  [{ d: 'M11 4 a6.5 6.5 0 1 1 0 13 a6.5 6.5 0 0 1 0-13 Z' }, { d: 'M15.8 15.4 L20.5 20.5' }, { d: 'M8.5 10.5 L13.5 10.5' }],
  // Retrieve: a pin marking the spot
  retrieve: [{ d: 'M12 3 a5.5 5.5 0 0 1 5.5 5.5 c0 4-5.5 10.5-5.5 10.5 S6.5 12.5 6.5 8.5 A5.5 5.5 0 0 1 12 3 Z' }, { d: 'M12 6.5 a2 2 0 1 1 0 4 a2 2 0 0 1 0-4 Z' }],
  // Summarise: long lines shortening to a point
  summarise:[{ d: 'M4 6 L20 6 M4 11 L20 11 M4 16 L14 16 M4 21 L9 21' }],
  // Infer: a thought bubble, with the answer implied
  infer:    [{ d: 'M6.5 4.5 L17.5 4.5 a3.5 3.5 0 0 1 0 9 L11 13.5 L6.5 17 L6.5 13.5 a3.5 3.5 0 0 1 0-9 Z' }, { d: 'M9.5 9 L9.6 9 M12 9 L12.1 9 M14.5 9 L14.6 9' }],
  // Predict: an arrow leaving the frame
  predict:  [{ d: 'M3 17 C 8 17, 10 7, 20 7' }, { d: 'M16 3.5 L20.5 7 L16 10.5' }],
  // Structure: stacked blocks
  structure:[{ d: 'M4 4.5 L20 4.5 L20 9.5 L4 9.5 Z' }, { d: 'M4 13 L11 13 L11 19.5 L4 19.5 Z' }, { d: 'M14 13 L20 13 L20 19.5 L14 19.5 Z' }],
  // Language: a nib, for the writer's choice
  language: [{ d: 'M5 20 L8 11 L16.5 3.5 L20.5 7.5 L13 16 Z' }, { d: 'M8 11 L13 16' }, { d: 'M10.2 13.4 L5 20' }],
  // Compare: two pans balancing
  compare:  [{ d: 'M12 4 L12 20 M6 20 L18 20' }, { d: 'M4 8 L20 8' }, { d: 'M1.5 14 a3.5 3.5 0 0 0 7 0 Z' }, { d: 'M15.5 14 a3.5 3.5 0 0 0 7 0 Z' }],

  // ── Text types ──
  narrative:  [{ d: 'M4 5 L11 5 a1.5 1.5 0 0 1 1 1.4 L12 19 a1.5 1.5 0 0 0-1-1.4 L4 17.6 Z' }, { d: 'M20 5 L13 5 a1.5 1.5 0 0 0-1 1.4 L12 19 a1.5 1.5 0 0 1 1-1.4 L20 17.6 Z' }],
  descriptive:[{ d: 'M12 3.5 c 5 0 8.5 3.5 8.5 8 c 0 3-2 4.5-4 4.5 L15 16 a1.8 1.8 0 0 0 0 3.6 c 0 .6-.8 1-3 1 c-4.5 0-8-3.6-8-8.5 A8.4 8.4 0 0 1 12 3.5 Z' }, { d: 'M8.5 10 L8.6 10 M12 8 L12.1 8 M15.5 10 L15.6 10' }],
  expository: [{ d: 'M4 6 L9 6 L9 20 L4 20 Z' }, { d: 'M10.5 6 L15.5 6 L15.5 20 L10.5 20 Z' }, { d: 'M17 7 L20.5 8 L18 20.5 L15.5 19.5 Z' }],
  persuasive: [{ d: 'M4 10 L4 15 L9 15 L18 20 L18 5 L9 10 Z' }, { d: 'M6.5 15 L7.5 20.5 L11 20.5 L10 17' }],
  procedural: [{ d: 'M6 21 L6 3 M18 21 L18 3' }, { d: 'M6 17 L18 17 M6 12 L18 12 M6 7 L18 7' }],
  recount:    [{ d: 'M4 6.5 L20 6.5 L20 20 L4 20 Z' }, { d: 'M4 11 L20 11' }, { d: 'M8.5 3.5 L8.5 8 M15.5 3.5 L15.5 8' }],
  explanation:[{ d: 'M12 8.5 a3.5 3.5 0 1 1 0 7 a3.5 3.5 0 0 1 0-7 Z' }, { d: 'M12 2.5 L12 5.5 M12 18.5 L12 21.5 M2.5 12 L5.5 12 M18.5 12 L21.5 12 M5.3 5.3 L7.4 7.4 M16.6 16.6 L18.7 18.7 M18.7 5.3 L16.6 7.4 M7.4 16.6 L5.3 18.7' }],
  report:     [{ d: 'M4 20.5 L20 20.5' }, { d: 'M6.5 20 L6.5 13 L10 13 L10 20' }, { d: 'M11.5 20 L11.5 7 L15 7 L15 20' }, { d: 'M16.5 20 L16.5 10 L20 10 L20 20' }],
  poetry:     [{ d: 'M6 21 c 0-6 1-11 5-14 c 3-2.2 6-2.6 8-2.5 c .3 4-1 9-4.5 11.5 C 11 18.5 8 19.5 6 21 Z' }, { d: 'M6.5 20.5 C 9 16 12 13 16 10.5' }],
  biography:  [{ d: 'M5 4.5 L19 4.5 L19 20.5 L5 20.5 Z' }, { d: 'M12 8.5 a2.4 2.4 0 1 1 0 4.8 a2.4 2.4 0 0 1 0-4.8 Z' }, { d: 'M8 18 a4 4 0 0 1 8 0' }],
};

interface IconProps {
  name: IconName;
  /** Pixel size; icons are square. */
  size?: number;
  /** Any CSS colour, including a custom property. Defaults to currentColor. */
  colour?: string;
  strokeWidth?: number;
  className?: string;
}

export function Icon({ name, size = 22, colour, strokeWidth = 1.9, className }: IconProps) {
  const paths = PATHS[name];
  if (!paths) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke={colour ?? 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={p.fill ? (colour ?? 'currentColor') : 'none'}
        />
      ))}
    </svg>
  );
}
