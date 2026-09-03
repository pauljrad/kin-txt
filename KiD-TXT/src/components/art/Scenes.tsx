// ─── KiD-TXT Cover Art ───────────────────────────────────────────
// Ligne claire, drawn the way Hergé actually builds a panel:
//
//   • Three depth planes — a framing element in front, the subject in
//     the middle, scenery behind. Never one flat band.
//   • Two tones per mass. Flat colour, but a lit side and a shadow
//     side, so a rock reads as a rock and not a grey shape.
//   • Graded line weight: a heavy contour around each silhouette, a
//     medium line for interior divisions, a fine line for texture.
//     A single weight everywhere is what makes art look like an icon.
//   • Something is happening. A subject mid-action beats a symbol.
//
// 16:9 so each one is a poster, not a thumbnail.
// ──────────────────────────────────────────────────────────────────

// ── Palette ──
const INK = '#17171B';

const RED = '#C8322B', RED_D = '#95221C', RED_L = '#E0604E';
const SEA = '#2E7FA8', SEA_D = '#1A5175', SEA_L = '#63A8C9';
const NIGHT = '#16294A', NIGHT_D = '#0C1930';
const SUN = '#EDB230', SUN_D = '#C4881A', SUN_L = '#F7D370';
const LEAF = '#3E8563', LEAF_D = '#295C44', LEAF_L = '#63A683';
const SAND = '#DFC08A', SAND_D = '#BE9A5E', SAND_L = '#F0DDB6';
const STONE = '#8C8F94', STONE_D = '#63666B', STONE_L = '#B6B9BE';
const BARK = '#8A5A3B', BARK_D = '#633F28';
const BONE = '#F2E8D5', PAPER = '#FFFBF0';
const SKY = '#8FC4DF', SKY_D = '#6BA9C9';

// ── Line weights ──
const OUT = 2.6;   // outer silhouette
const MID = 1.5;   // interior division
const FINE = 0.8;  // texture

const heavy = { stroke: INK, strokeWidth: OUT, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const mid = { stroke: INK, strokeWidth: MID, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const, fill: 'none' };
const fine = { stroke: INK, strokeWidth: FINE, strokeLinecap: 'round' as const, fill: 'none' };

export type SceneKey =
  | 'jungle-book' | 'owl-and-pussycat' | 'lighthouse-dawn' | 'great-fire'
  | 'school-library' | 'paper-aeroplane' | 'trip-to-coast'
  | 'day-and-night' | 'blue-whale' | 'mary-anning';

interface SceneProps {
  className?: string;
  title?: string;
}

function Frame({ children, title, className }: SceneProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 200 112"
      className={className}
      role="img"
      aria-label={title}
      preserveAspectRatio="xMidYMid slice"
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/* ═══ Narrative — the wolf on the ridge ═══════════════════════════ */
function JungleBook(p: SceneProps) {
  return (
    <Frame {...p}>
      <rect width="200" height="112" fill={NIGHT_D} />
      {/* sky wash + moon */}
      <rect y="0" width="200" height="62" fill={NIGHT} />
      <circle cx="148" cy="30" r="19" fill={BONE} />
      <circle cx="141" cy="25" r="3" fill="#E2D6BE" />
      <circle cx="152" cy="36" r="2" fill="#E2D6BE" />
      <g fill={BONE}>
        <circle cx="30" cy="14" r="1.3" /><circle cx="58" cy="26" r="1" />
        <circle cx="96" cy="12" r="1.1" /><circle cx="178" cy="56" r="1" />
        <circle cx="14" cy="40" r="1" /><circle cx="118" cy="30" r="0.9" />
      </g>

      {/* far canopy, two depths */}
      <path d="M0 58 q14 -12 28 -3 q16 -13 32 -2 q14 -11 28 -1 q18 -12 34 -2 q16 -10 30 0 q10 -6 18 -2 L200 70 L0 70 Z" fill="#0F2038" />
      <path d="M0 66 q18 -10 34 -2 q14 -9 30 -1 q20 -11 38 -1 q16 -8 30 0 q14 -6 26 -1 q12 -4 22 0 L200 80 L0 80 Z" fill="#132a45" />

      {/* ridge the wolf stands on */}
      <path d="M0 92 L26 80 L52 88 L78 76 L108 86 L142 78 L172 88 L200 82 L200 112 L0 112 Z" fill="#101E33" {...heavy} />
      <path d="M52 88 L78 76 L108 86 L108 112 L52 112 Z" fill="#0B1728" stroke="none" />

      {/* the wolf, mid-howl */}
      <g>
        <path
          d="M62 46 L72 49 L76 55
             C 79 62 79 66 81 72
             L81 84 L86 84 L86 72
             L95 73 L96 84 L101 84
             C 106 79 107 69 103 63
             C 109 64 113 55 110 48
             C 112 57 108 66 100 66
             C 93 61 85 56 80 50
             L77 42 L81 34 L75 40 Z"
          fill={INK}
          stroke={INK}
          strokeWidth={OUT}
          strokeLinejoin="round"
        />
        {/* rim light down the back, the one thing that lifts it off the sky */}
        <path d="M77 42 L80 50 C 85 56 93 61 100 66" stroke="#3C5878" strokeWidth={MID} fill="none" strokeLinecap="round" />
        <circle cx="72" cy="46" r="1.5" fill={SUN} />
      </g>

      {/* foreground leaves, framing */}
      <g>
        <path d="M-4 112 C 8 90 34 84 48 100 C 34 112 12 116 -4 112 Z" fill={LEAF_D} {...heavy} />
        <path d="M2 108 C 14 96 30 92 42 100" {...mid} />
        <g {...fine}>
          <path d="M10 105 L14 99" /><path d="M20 103 L23 97" /><path d="M30 101 L32 96" />
        </g>

        <path d="M204 108 C 190 84 162 80 148 98 C 164 112 188 114 204 108 Z" fill={LEAF} {...heavy} />
        <path d="M198 104 C 186 92 170 89 156 97" {...mid} />
        <g {...fine}>
          <path d="M188 100 L185 94" /><path d="M177 97 L175 92" /><path d="M167 95 L166 91" />
        </g>
      </g>
    </Frame>
  );
}

/* ═══ Poetry — the pea-green boat ═════════════════════════════════ */
function OwlAndPussycat(p: SceneProps) {
  return (
    <Frame {...p}>
      <rect width="200" height="112" fill="#1B3B5C" />
      <rect width="200" height="34" fill="#152F4B" />
      <circle cx="44" cy="28" r="16" fill={BONE} />
      <circle cx="39" cy="24" r="2.4" fill="#E0D4BC" />
      <g fill={BONE}>
        <circle cx="120" cy="16" r="1.2" /><circle cx="150" cy="30" r="1" />
        <circle cx="94" cy="26" r="0.9" /><circle cx="176" cy="14" r="1.1" />
      </g>

      {/* sea, three depths */}
      <rect y="62" width="200" height="50" fill={SEA_D} />
      <path d="M0 62 q12 -4 24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t32 0 L200 78 L0 78 Z" fill={SEA} />
      <path d="M0 82 q14 -4 28 0 t28 0 t28 0 t28 0 t28 0 t32 0 L200 112 L0 112 Z" fill={SEA_D} />
      {/* moon glitter */}
      <g fill={BONE} opacity="0.55">
        <rect x="38" y="66" width="14" height="2" rx="1" />
        <rect x="30" y="74" width="24" height="2" rx="1" />
        <rect x="36" y="84" width="18" height="2" rx="1" />
        <rect x="28" y="94" width="28" height="2" rx="1" />
      </g>
      <g stroke={SEA_L} strokeWidth={MID} fill="none" strokeLinecap="round">
        <path d="M120 70 q6 -3 12 0 t12 0" />
        <path d="M150 88 q6 -3 12 0 t12 0" />
        <path d="M76 100 q6 -3 12 0 t12 0" />
      </g>

      {/* boat */}
      <g>
        {/* mast + sail */}
        <path d="M104 62 L104 22" stroke={INK} strokeWidth={OUT} strokeLinecap="round" />
        <path d="M106 24 L132 46 L106 52 Z" fill={PAPER} {...heavy} />
        <path d="M102 26 L86 44 L102 48 Z" fill={BONE} {...heavy} />
        {/* hull, lit side and shadow side */}
        <path d="M68 62 L140 62 L128 82 L80 82 Z" fill="#7FBF6A" {...heavy} />
        <path d="M104 62 L140 62 L128 82 L104 82 Z" fill="#5E9E4C" stroke="none" />
        <path d="M68 62 L140 62" stroke={INK} strokeWidth={OUT} strokeLinecap="round" />
        <path d="M74 70 L134 70" {...mid} />
      </g>

      {/* owl and cat aboard */}
      <g>
        <path d="M82 62 L82 48 a7 7 0 0 1 14 0 L96 62 Z" fill={BARK} {...heavy} />
        <path d="M89 62 L89 41 a7 7 0 0 1 7 7 L96 62 Z" fill={BARK_D} stroke="none" />
        <path d="M82.5 48 L85 41 L88 46" fill={BARK} {...heavy} />
        <path d="M95.5 48 L93 41 L90 46" fill={BARK} {...heavy} />
        <circle cx="85.5" cy="52" r="2.4" {...fine} fill={PAPER} />
        <circle cx="92.5" cy="52" r="2.4" {...fine} fill={PAPER} />
        <circle cx="85.5" cy="52" r="1" fill={INK} />
        <circle cx="92.5" cy="52" r="1" fill={INK} />
        <path d="M89 55 L87 58 L91 58 Z" {...fine} fill={SUN} />

        <path d="M114 62 L114 50 a6 6 0 0 1 12 0 L126 62 Z" fill={PAPER} {...heavy} />
        <path d="M120 62 L120 44 a6 6 0 0 1 6 6 L126 62 Z" fill="#E0D6C2" stroke="none" />
        <path d="M114.5 50 L116 44 L119 48.5" fill={PAPER} {...heavy} />
        <path d="M125.5 50 L124 44 L121 48.5" fill={PAPER} {...heavy} />
        <circle cx="117.5" cy="54" r="1.1" fill={INK} />
        <circle cx="122.5" cy="54" r="1.1" fill={INK} />
        <path d="M120 57 l-2 2 M120 57 l2 2" {...fine} />
        {/* tail over the gunwale */}
        <path d="M126 60 C 134 58 138 64 134 70" stroke={INK} strokeWidth={OUT} fill="none" strokeLinecap="round" />
      </g>
    </Frame>
  );
}

/* ═══ Descriptive — the lighthouse at dawn ════════════════════════ */
function LighthouseDawn(p: SceneProps) {
  return (
    <Frame {...p}>
      {/* sky in flat bands, not a gradient */}
      <rect width="200" height="112" fill="#F6D5A2" />
      <rect width="200" height="26" fill="#E8B27E" />
      <rect y="26" width="200" height="18" fill="#F0C48F" />
      <circle cx="42" cy="52" r="17" fill={SUN} />
      <circle cx="42" cy="52" r="17" fill="none" stroke={SUN_D} strokeWidth={MID} />

      {/* beam */}
      <path d="M118 40 L200 16 L200 62 Z" fill={SUN_L} opacity="0.5" />

      {/* gulls */}
      <g {...mid} stroke={INK}>
        <path d="M150 24 q4 -4 8 0 q4 -4 8 0" />
        <path d="M168 36 q3 -3 6 0 q3 -3 6 0" />
      </g>

      {/* sea, three bands */}
      <rect y="66" width="200" height="46" fill={SEA} />
      <path d="M0 66 L200 66" {...heavy} />
      <rect y="80" width="200" height="32" fill={SEA_D} />
      <g stroke={SEA_L} strokeWidth={MID} fill="none" strokeLinecap="round">
        <path d="M8 72 q7 -3 14 0 t14 0" />
        <path d="M150 74 q7 -3 14 0 t14 0" />
        <path d="M40 90 q7 -3 14 0 t14 0" />
        <path d="M140 98 q7 -3 14 0 t14 0" />
      </g>

      {/* rock, lit and shadow */}
      <path d="M74 96 q12 -16 26 -8 q14 -12 30 2 q10 -4 16 6 L152 104 L68 104 Z" fill={STONE} {...heavy} />
      <path d="M112 90 q10 -6 18 0 q10 -4 16 6 L152 104 L106 104 Z" fill={STONE_D} stroke="none" />
      <g {...fine}>
        <path d="M84 96 L90 92" /><path d="M96 98 L102 93" /><path d="M126 96 L132 93" />
      </g>
      {/* foam where sea meets rock */}
      <g stroke={PAPER} strokeWidth={MID} fill="none" strokeLinecap="round">
        <path d="M66 102 q6 -4 12 0 t12 0" />
        <path d="M136 102 q6 -4 12 0 t12 0" />
      </g>

      {/* tower */}
      <g>
        <path d="M84 96 L90 34 L114 34 L120 96 Z" fill={PAPER} {...heavy} />
        {/* shadow side */}
        <path d="M102 96 L102 34 L114 34 L120 96 Z" fill="#E2D8C4" stroke="none" />
        {/* red bands, following the taper */}
        <path d="M88.6 52 L115.4 52 L116.4 62 L87.6 62 Z" {...mid} fill={RED} stroke={INK} />
        <path d="M102 52 L115.4 52 L116.4 62 L102 62 Z" fill={RED_D} stroke="none" />
        <path d="M86.4 76 L117.6 76 L118.6 88 L85.4 88 Z" {...mid} fill={RED} stroke={INK} />
        <path d="M102 76 L117.6 76 L118.6 88 L102 88 Z" fill={RED_D} stroke="none" />
        <path d="M84 96 L90 34 L114 34 L120 96 Z" fill="none" {...heavy} />
        {/* gallery */}
        <path d="M86 34 L118 34 L116 28 L88 28 Z" fill={STONE} {...heavy} />
        <g {...fine}><path d="M94 34 L94 28" /><path d="M102 34 L102 28" /><path d="M110 34 L110 28" /></g>
        {/* lamp room */}
        <path d="M92 28 L112 28 L110 16 L94 16 Z" fill={SUN_L} {...heavy} />
        <g {...mid} stroke={INK}><path d="M98 28 L98 16" /><path d="M106 28 L106 16" /></g>
        {/* cap */}
        <path d="M90 16 L114 16 L102 6 Z" fill={RED} {...heavy} />
        <path d="M102 6 L102 16 L114 16 Z" fill={RED_D} stroke="none" />
        <path d="M102 6 L102 2" stroke={INK} strokeWidth={MID} strokeLinecap="round" />
      </g>
    </Frame>
  );
}

/* ═══ Expository — the Great Fire ═════════════════════════════════ */
function GreatFire(p: SceneProps) {
  return (
    <Frame {...p}>
      <rect width="200" height="112" fill="#2B1520" />
      <rect width="200" height="46" fill="#3A1A24" />
      {/* embers */}
      <g fill={SUN}>
        <circle cx="30" cy="18" r="1.1" /><circle cx="62" cy="10" r="0.9" />
        <circle cx="118" cy="14" r="1.2" /><circle cx="158" cy="22" r="1" />
        <circle cx="88" cy="8" r="0.8" /><circle cx="180" cy="12" r="1" />
      </g>

      {/* flames, back to front in three heats */}
      <g>
        <path d="M22 76 C 8 52 34 44 26 20 C 52 38 58 62 46 78 Z" fill={RED_D} {...heavy} />
        <path d="M150 78 C 136 50 166 42 158 18 C 186 38 190 64 176 78 Z" fill={RED_D} {...heavy} />
        <path d="M60 80 C 42 50 78 38 68 12 C 102 34 106 66 92 82 Z" fill={RED} {...heavy} />
        <path d="M104 80 C 90 54 118 44 110 24 C 138 42 140 66 128 82 Z" fill="#E8621F" {...heavy} />
        <path d="M74 82 C 64 62 84 54 78 38 C 96 52 98 70 90 84 Z" fill={SUN} {...heavy} />
        <path d="M116 82 C 108 66 122 60 118 48 C 132 60 132 74 126 84 Z" fill={SUN_L} {...heavy} />
      </g>

      {/* the city, two depths — St Paul's dome centre */}
      <g fill="#150C12" {...heavy}>
        <path d="M0 88 L0 70 L10 62 L20 70 L20 88 Z" />
        <path d="M22 88 L22 66 L30 58 L38 66 L38 88 Z" />
        <path d="M170 88 L170 64 L180 56 L190 64 L190 88 Z" />
      </g>
      <g fill={INK} {...heavy}>
        <path d="M40 92 L40 74 L52 66 L64 74 L64 92 Z" />
        <path d="M66 92 L66 80 L74 72 L82 80 L82 92 Z" />
        {/* dome */}
        <path d="M86 92 L86 66 L114 66 L114 92 Z" />
        <path d="M88 66 C 88 48 112 48 112 66 Z" />
        <path d="M100 48 L100 40" strokeLinecap="round" />
        <circle cx="100" cy="38" r="2.4" />
        {/* spire */}
        <path d="M118 92 L118 72 L124 72 L124 56 L127 46 L130 56 L130 72 L136 72 L136 92 Z" />
        <path d="M140 92 L140 76 L152 68 L164 76 L164 92 Z" />
      </g>
      {/* lit windows */}
      <g fill={SUN}>
        <rect x="45" y="79" width="3" height="4" /><rect x="55" y="79" width="3" height="4" />
        <rect x="93" y="76" width="3" height="4" /><rect x="104" y="76" width="3" height="4" />
        <rect x="146" y="82" width="3" height="4" /><rect x="156" y="82" width="3" height="4" />
      </g>

      {/* the river, carrying the fire */}
      <rect y="92" width="200" height="20" fill="#1B2733" />
      <path d="M0 92 L200 92" {...heavy} />
      <g fill={RED} opacity="0.75">
        <rect x="20" y="96" width="30" height="2.4" rx="1.2" />
        <rect x="70" y="101" width="46" height="2.4" rx="1.2" />
        <rect x="130" y="97" width="36" height="2.4" rx="1.2" />
        <rect x="46" y="106" width="40" height="2.4" rx="1.2" />
        <rect x="122" y="106" width="30" height="2.4" rx="1.2" />
      </g>
    </Frame>
  );
}

/* ═══ Persuasive — the library ════════════════════════════════════ */
function SchoolLibrary(p: SceneProps) {
  const spine = (x: number, y: number, w: number, h: number, fill: string, dark: string) => (
    <g key={`${x}-${y}`}>
      <path d={`M${x} ${y + h} L${x} ${y} L${x + w} ${y} L${x + w} ${y + h} Z`} fill={fill} {...heavy} />
      <path d={`M${x + w - 2.2} ${y} L${x + w} ${y} L${x + w} ${y + h} L${x + w - 2.2} ${y + h} Z`} fill={dark} stroke="none" />
      <path d={`M${x + 1.5} ${y + 4} L${x + w - 3} ${y + 4}`} {...fine} />
    </g>
  );

  return (
    <Frame {...p}>
      <rect width="200" height="112" fill={SAND_L} />
      {/* back wall + arched window with daylight */}
      <rect width="200" height="96" fill="#EBD9B4" />
      <path d="M78 62 L78 30 a22 22 0 0 1 44 0 L122 62 Z" fill={SKY} {...heavy} />
      <path d="M100 62 L100 8 a22 22 0 0 1 22 22 L122 62 Z" fill={SKY_D} stroke="none" />
      <g {...mid} stroke={INK}>
        <path d="M100 8 L100 62" /><path d="M78 40 L122 40" />
      </g>

      {/* shelves, two units, lit from the window */}
      <g>
        {spine(10, 26, 8, 36, RED, RED_D)}
        {spine(19, 30, 7, 32, SEA, SEA_D)}
        {spine(27, 24, 9, 38, SUN, SUN_D)}
        {spine(37, 28, 7, 34, LEAF, LEAF_D)}
        {spine(45, 25, 8, 37, BARK, BARK_D)}
        {spine(54, 31, 7, 31, RED, RED_D)}
        {spine(62, 27, 9, 35, SEA, SEA_D)}
        {/* one pulled out, mid-choice */}
        <g transform="rotate(-14 132 44)">{spine(128, 22, 9, 40, SUN, SUN_D)}</g>
        {spine(139, 28, 8, 34, LEAF, LEAF_D)}
        {spine(148, 24, 7, 38, RED, RED_D)}
        {spine(156, 30, 9, 32, BARK, BARK_D)}
        {spine(166, 26, 8, 36, SEA, SEA_D)}
        {spine(175, 29, 7, 33, SUN, SUN_D)}
        {spine(183, 25, 8, 37, LEAF, LEAF_D)}
      </g>
      <path d="M4 62 L196 62" {...heavy} />
      <path d="M4 62 L196 62 L196 68 L4 68 Z" fill={BARK} {...heavy} />

      {/* lower shelf */}
      <g>
        {spine(10, 72, 8, 24, SEA, SEA_D)}
        {spine(19, 76, 7, 20, SUN, SUN_D)}
        {spine(27, 71, 9, 25, RED, RED_D)}
        {spine(37, 75, 7, 21, LEAF, LEAF_D)}
        {spine(45, 72, 8, 24, BARK, BARK_D)}
        {spine(160, 73, 8, 23, RED, RED_D)}
        {spine(169, 76, 7, 20, SEA, SEA_D)}
        {spine(177, 71, 9, 25, SUN, SUN_D)}
        {spine(187, 75, 7, 21, LEAF, LEAF_D)}
      </g>

      {/* foreground: a table with an open book, left page lit */}
      <rect y="94" width="200" height="18" fill={BARK_D} />
      <path d="M0 94 L200 94" {...heavy} />
      <g>
        <path d="M68 100 L100 86 L100 99 L70 104 Z" fill={PAPER} {...heavy} />
        <path d="M100 86 L132 100 L130 104 L100 99 Z" fill="#E2D8C4" {...heavy} />
        <path d="M100 86 L100 99" stroke={INK} strokeWidth={MID} strokeLinecap="round" />
        <g {...fine}>
          <path d="M78 98 L96 90" /><path d="M80 100.5 L96 93" />
          <path d="M104 90 L122 98" /><path d="M104 93 L120 100.5" />
        </g>
      </g>
    </Frame>
  );
}

/* ═══ Procedural — the paper aeroplane ════════════════════════════ */
function PaperAeroplane(p: SceneProps) {
  return (
    <Frame {...p}>
      <rect width="200" height="112" fill={SKY} />
      <rect width="200" height="40" fill="#A5D2E8" />

      {/* clouds, lit top and shadow underside */}
      <g>
        <path d="M14 40 a11 11 0 0 1 22 0 a9 9 0 0 1 14 0 L50 48 L10 48 Z" fill={PAPER} {...heavy} />
        <path d="M10 44 L50 44 L50 48 L10 48 Z" fill="#DCE9F0" stroke="none" />
        <path d="M138 26 a9 9 0 0 1 18 0 a7 7 0 0 1 11 0 L167 33 L134 33 Z" fill={PAPER} {...heavy} />
        <path d="M134 30 L167 30 L167 33 L134 33 Z" fill="#DCE9F0" stroke="none" />
      </g>

      {/* the throw, traced */}
      <path
        d="M6 96 C 34 90 22 46 62 42 C 96 39 104 58 128 54"
        fill="none" stroke={PAPER} strokeWidth="2.2" strokeLinecap="round" strokeDasharray="1 7"
      />

      {/* town below, for altitude */}
      <path d="M0 98 L200 98 L200 112 L0 112 Z" fill={LEAF} {...heavy} />
      <g fill={LEAF_D} stroke="none">
        <path d="M14 98 L14 92 L22 86 L30 92 L30 98 Z" />
        <path d="M44 98 L44 90 L52 84 L60 90 L60 98 Z" />
        <path d="M150 98 L150 91 L158 85 L166 91 L166 98 Z" />
        <path d="M176 98 L176 93 L182 88 L188 93 L188 98 Z" />
      </g>
      <g {...fine}><path d="M0 104 L200 104" /></g>

      {/* the plane, three facets */}
      <g transform="rotate(-8 128 54)">
        <path d="M128 54 L188 32 L150 84 Z" fill={PAPER} {...heavy} />
        <path d="M128 54 L156 64 L150 84 Z" fill="#DFD5C0" stroke="none" />
        <path d="M128 54 L156 64 L150 84 Z" fill="none" {...heavy} />
        <path d="M188 32 L156 64" stroke={INK} strokeWidth={MID} fill="none" strokeLinecap="round" />
        <path d="M136 57 L172 43" {...fine} />
      </g>
    </Frame>
  );
}

/* ═══ Recount — the coast ═════════════════════════════════════════ */
function TripToCoast(p: SceneProps) {
  return (
    <Frame {...p}>
      <rect width="200" height="112" fill={SKY} />
      <rect width="200" height="30" fill="#A8D4E8" />
      <circle cx="104" cy="24" r="13" {...mid} fill={SUN} stroke={SUN_D} />
      <g {...mid} stroke={INK}>
        <path d="M30 20 q4 -4 8 0 q4 -4 8 0" />
        <path d="M54 30 q3 -3 6 0 q3 -3 6 0" />
      </g>

      {/* headland with the lighthouse from the other story */}
      <path d="M0 54 q18 -14 40 -8 q14 -6 26 4 L66 60 L0 60 Z" fill={STONE_D} {...heavy} />
      <path d="M22 46 L24 34 L30 34 L32 46 Z" {...mid} fill={PAPER} stroke={INK} />
      <path d="M23 38 L31 38" stroke={RED} strokeWidth="2" />

      {/* sea, three bands, then wet then dry sand */}
      <rect y="54" width="200" height="18" fill={SEA} />
      <rect y="62" width="200" height="10" fill={SEA_D} />
      <path d="M0 54 L200 54" {...heavy} />
      <g stroke={PAPER} strokeWidth={MID} fill="none" strokeLinecap="round">
        <path d="M84 60 q7 -3 14 0 t14 0" />
        <path d="M140 66 q7 -3 14 0 t14 0" />
      </g>
      {/* surf line */}
      <path d="M0 72 q16 5 32 0 t32 0 t32 0 t32 0 t32 0 t40 0 L200 78 L0 78 Z" fill={PAPER} {...heavy} />
      <rect y="78" width="200" height="12" fill={SAND_D} />
      <rect y="88" width="200" height="24" fill={SAND} />
      <g {...fine}>
        <path d="M20 96 q6 -2 12 0" /><path d="M120 100 q6 -2 12 0" /><path d="M62 104 q6 -2 12 0" />
      </g>

      {/* windbreak */}
      <g>
        <path d="M96 92 L96 62 M112 92 L112 60 M128 92 L128 62 M144 92 L144 64" stroke={INK} strokeWidth={MID} strokeLinecap="round" />
        <path d="M96 66 L144 68 L144 82 L96 80 Z" fill={RED} {...heavy} />
        <path d="M112 67 L112 81" stroke={PAPER} strokeWidth="4" />
        <path d="M136 67.5 L136 81.5" stroke={PAPER} strokeWidth="4" />
        <path d="M96 66 L144 68 L144 82 L96 80 Z" fill="none" {...heavy} />
      </g>

      {/* bucket, spade, rock pool */}
      <g>
        <path d="M28 108 L24 90 L46 90 L42 108 Z" fill={RED} {...heavy} />
        <path d="M35 90 L42 90 L38 108 L35 108 Z" fill={RED_D} stroke="none" />
        <path d="M25 90 a10 6 0 0 1 20 0" {...mid} stroke={INK} />
        <path d="M58 108 L58 82" stroke={INK} strokeWidth={OUT} strokeLinecap="round" />
        <path d="M52 82 L64 82 L62 68 L54 68 Z" fill={SEA} {...heavy} />
        <path d="M58 82 L64 82 L62 68 L58 68 Z" fill={SEA_D} stroke="none" />
      </g>
      <g>
        <path d="M158 104 a18 7 0 0 1 36 0 a18 7 0 0 1 -36 0 Z" fill={SEA} {...heavy} />
        <path d="M164 102 q5 -2 10 0" stroke={SEA_L} strokeWidth={MID} fill="none" />
        {/* a crab, because a rock pool without one is just a puddle */}
        <ellipse cx="176" cy="103" rx="5" ry="3.4" {...mid} fill={RED} stroke={INK} />
        <g stroke={INK} strokeWidth={MID} strokeLinecap="round">
          <path d="M171 102 l-4 -2" /><path d="M181 102 l4 -2" />
          <path d="M172 105 l-3 2" /><path d="M180 105 l3 2" />
        </g>
        <circle cx="174" cy="101" r="0.9" fill={INK} />
        <circle cx="178" cy="101" r="0.9" fill={INK} />
      </g>
    </Frame>
  );
}

/* ═══ Explanation — day and night ═════════════════════════════════ */
function DayAndNight(p: SceneProps) {
  return (
    <Frame {...p}>
      <rect width="200" height="112" fill="#070E1C" />
      <g fill={BONE}>
        <circle cx="24" cy="14" r="1.3" /><circle cx="60" cy="96" r="1" />
        <circle cx="180" cy="18" r="1.2" /><circle cx="192" cy="70" r="1" />
        <circle cx="106" cy="8" r="0.9" /><circle cx="150" cy="102" r="1.1" />
        <circle cx="14" cy="82" r="1" /><circle cx="86" cy="104" r="0.8" />
      </g>

      {/* sun */}
      <g>
        <circle cx="26" cy="56" r="20" fill={SUN} {...heavy} />
        <circle cx="26" cy="56" r="20" fill="none" stroke={SUN_D} strokeWidth={MID} />
        <path d="M26 40 a16 16 0 0 0 0 32 Z" fill={SUN_L} stroke="none" />
        <g stroke={SUN} strokeWidth="2.4" strokeLinecap="round">
          <path d="M26 30 L26 22" /><path d="M26 82 L26 90" />
          <path d="M6 36 L1 31" /><path d="M6 76 L1 81" />
          <path d="M46 36 L51 31" /><path d="M46 76 L51 81" />
        </g>
      </g>

      {/* light crossing to the Earth */}
      <g stroke={SUN} strokeWidth={FINE} opacity="0.55">
        <path d="M50 46 L104 40" /><path d="M50 56 L104 56" /><path d="M50 66 L104 72" />
      </g>

      {/* Earth, lit half and night half */}
      <g>
        <circle cx="134" cy="56" r="34" fill="#22385E" {...heavy} />
        <path d="M134 22 a34 34 0 0 0 0 68 Z" fill={SEA} stroke="none" />
        {/* continents on the day side */}
        <path d="M116 34 q12 5 6 16 q-12 3 -14 -8 Z" {...fine} fill={LEAF} />
        <path d="M106 60 q14 3 11 17 q-14 1 -17 -11 Z" {...fine} fill={LEAF} />
        <path d="M126 46 q8 4 4 12 q-9 1 -9 -8 Z" {...fine} fill={LEAF_D} />
        {/* city lights on the night side */}
        <g fill={SUN}>
          <circle cx="146" cy="40" r="1.1" /><circle cx="156" cy="52" r="1" />
          <circle cx="150" cy="66" r="1.2" /><circle cx="160" cy="34" r="0.9" />
          <circle cx="142" cy="76" r="1" /><circle cx="158" cy="72" r="0.9" />
        </g>
        {/* terminator */}
        <path d="M134 22 L134 90" stroke={INK} strokeWidth={OUT} fill="none" />
        <circle cx="134" cy="56" r="34" fill="none" {...heavy} />
      </g>

      {/* the moon, keeping its distance */}
      <circle cx="184" cy="96" r="7" {...mid} fill={BONE} stroke={INK} />
      <circle cx="182" cy="94" r="1.6" fill="#DDD2BA" />
      <circle cx="186" cy="99" r="1.1" fill="#DDD2BA" />
    </Frame>
  );
}

/* ═══ Report — the blue whale ═════════════════════════════════════ */
function BlueWhale(p: SceneProps) {
  return (
    <Frame {...p}>
      <rect width="200" height="112" fill={SEA_D} />
      <rect width="200" height="40" fill={SEA} />
      <rect width="200" height="14" fill={SEA_L} />
      {/* light shafts from the surface */}
      <g fill={SEA_L} opacity="0.3">
        <path d="M30 14 L44 14 L58 112 L36 112 Z" />
        <path d="M96 14 L106 14 L114 112 L98 112 Z" />
        <path d="M156 14 L168 14 L182 112 L162 112 Z" />
      </g>
      {/* a boat at the surface, for scale */}
      <g>
        <path d="M84 14 L108 14 L104 20 L88 20 Z" fill={INK} />
        <path d="M96 14 L96 6" stroke={INK} strokeWidth={MID} strokeLinecap="round" />
      </g>
      <path d="M0 14 L200 14" {...heavy} />

      {/* krill */}
      <g fill="#F0A868">
        <circle cx="18" cy="40" r="1.2" /><circle cx="26" cy="48" r="1" />
        <circle cx="14" cy="54" r="1.1" /><circle cx="30" cy="36" r="0.9" />
        <circle cx="22" cy="60" r="1" /><circle cx="34" cy="56" r="0.8" />
      </g>

      {/* the whale */}
      <g>
        <path
          d="M20 62
             C 24 42 56 32 92 36
             C 124 40 146 50 158 62
             L184 44
             C 179 58 179 74 186 90
             L156 74
             C 142 88 112 96 84 94
             C 48 92 22 78 20 62 Z"
          fill={SEA}
          {...heavy}
        />
        {/* dark back */}
        <path
          d="M20 62 C 24 42 56 32 92 36 C 124 40 146 50 158 62 C 130 50 60 44 20 62 Z"
          fill={SEA_D}
          stroke="none"
        />
        {/* pale grooved underside */}
        <path
          d="M24 70 C 44 86 62 92 86 93 C 110 94 138 86 154 72 C 128 82 56 84 24 70 Z"
          fill={BONE}
          stroke="none"
        />
        <path d="M24 70 C 44 86 62 92 86 93 C 110 94 138 86 154 72" {...mid} stroke={INK} />
        <g stroke={INK} strokeWidth={FINE}>
          <path d="M40 78 L42 90" /><path d="M54 82 L56 93" /><path d="M68 85 L69 95" />
          <path d="M82 86 L83 96" /><path d="M96 86 L97 95" /><path d="M110 84 L111 93" />
        </g>
        {/* flipper */}
        <path d="M86 82 C 98 88 104 96 100 106 C 88 100 80 92 78 82 Z" fill={SEA_D} {...heavy} />
        {/* fluke edge */}
        <path d="M184 44 C 179 58 179 74 186 90" {...mid} stroke={INK} />
        {/* jaw + eye */}
        <path d="M20 63 C 38 72 58 76 80 76" {...mid} stroke={INK} />
        <circle cx="36" cy="58" r="2.4" fill={INK} />
        <circle cx="36.8" cy="57.2" r="0.8" fill={PAPER} />
        {/* blowhole spout */}
        <g fill="none" stroke={SEA_L} strokeWidth="2" strokeLinecap="round">
          <path d="M62 36 C 58 28 58 24 60 20" />
          <path d="M68 36 C 70 28 73 25 77 22" />
        </g>
      </g>
    </Frame>
  );
}

/* ═══ Biography — Mary Anning working the cliff ═══════════════════ */
function MaryAnning(p: SceneProps) {
  return (
    <Frame {...p}>
      <rect width="200" height="112" fill="#C9D6DE" />
      <rect width="200" height="30" fill="#B3C4D0" />
      {/* gulls kept left, clear of the band pill */}
      <g {...mid} stroke={INK}>
        <path d="M34 16 q4 -4 8 0 q4 -4 8 0" />
        <path d="M58 26 q3 -3 6 0 q3 -3 6 0" />
      </g>

      {/* sea on the right */}
      <rect x="122" y="52" width="78" height="20" fill={SEA} />
      <rect x="122" y="64" width="78" height="8" fill={SEA_D} />
      <path d="M122 52 L200 52" {...heavy} />
      <path d="M138 60 q6 -3 12 0 t12 0" stroke={SEA_L} strokeWidth={MID} fill="none" strokeLinecap="round" />

      {/* the cliff, banded the way Lyme actually is */}
      <g>
        <path d="M0 16 L34 10 L72 22 L104 18 L124 34 L124 84 L0 84 Z" fill={SAND} {...heavy} />
        <path d="M0 34 L36 28 L74 40 L106 36 L124 48" {...mid} stroke={INK} />
        <path d="M0 34 L36 28 L74 40 L106 36 L124 48 L124 60 L0 60 Z" fill={SAND_D} stroke="none" />
        <path d="M0 60 L36 54 L74 66 L106 62 L124 70" {...mid} stroke={INK} />
        <path d="M0 60 L36 54 L74 66 L106 62 L124 70 L124 84 L0 84 Z" fill={BARK} stroke="none" />
        <path d="M0 16 L34 10 L72 22 L104 18 L124 34 L124 84 L0 84 Z" fill="none" {...heavy} />
        <g {...fine}>
          <path d="M16 26 L24 23" /><path d="M52 32 L60 30" /><path d="M88 26 L96 24" />
          <path d="M20 50 L28 48" /><path d="M64 54 L72 52" /><path d="M98 50 L106 49" />
          <path d="M14 72 L22 70" /><path d="M76 76 L84 74" />
        </g>
      </g>

      {/* the ammonite she is cutting out — chambered spiral, no outer ring */}
      <g transform="translate(52 46)">
        <circle cx="0" cy="0" r="15" fill={BONE} {...heavy} />
        {/* whorl */}
        <path
          d="M2 -13 A13 13 0 1 1 -9.2 3.8 A9.2 9.2 0 1 0 4.6 -2.4 A5.6 5.6 0 1 1 -1 3"
          fill="none" stroke={INK} strokeWidth={MID} strokeLinecap="round"
        />
        {/* Ribs curve along the outer whorl. Straight radial ticks
            read as a clock face, which is the wrong fossil entirely. */}
        <g stroke={INK} strokeWidth={FINE} fill="none" strokeLinecap="round">
          <path d="M1 -13 Q 4 -8 3.4 -4.2" />
          <path d="M7 -11 Q 8 -6.4 6.2 -3.2" />
          <path d="M11.4 -6.6 Q 10.4 -2.8 8 -1.2" />
          <path d="M13 0 Q 9 1.4 7.6 2.6" />
          <path d="M11.4 6.6 Q 7.4 5.4 5.4 6.2" />
          <path d="M7 11 Q 4.6 7.6 2.4 8" />
        </g>
      </g>
      {/* chips of rock where she has been working */}
      <g {...fine} fill={STONE} stroke={INK}>
        <path d="M74 80 l5 -5 l6 5 Z" />
        <path d="M96 82 l4 -4 l5 4 Z" />
      </g>

      {/* beach */}
      <rect y="84" width="200" height="28" fill={SAND_L} />
      <path d="M0 84 L200 84" {...heavy} />
      <g {...fine} fill={STONE_L} stroke={INK}>
        <circle cx="30" cy="98" r="2.6" /><circle cx="60" cy="104" r="2" />
        <circle cx="110" cy="100" r="2.4" />
      </g>

      {/* Mary — the subject of the biography, so drawn to be read */}
      <g transform="translate(148 50)">
        {/* skirt */}
        <path d="M-9 46 L-6 20 L6 20 L9 46 Z" fill="#3E4A5E" {...heavy} />
        <path d="M0 20 L6 20 L9 46 L0 46 Z" fill="#2C3646" stroke="none" />
        <path d="M-9 46 L-6 20 L6 20 L9 46 Z" fill="none" {...heavy} />
        {/* bodice + shawl */}
        <path d="M-6 20 L-5 8 L5 8 L6 20 Z" fill="#7A4A62" {...heavy} />
        <path d="M-5 9 L0 20 L5 9 Z" {...mid} fill={BONE} stroke={INK} />
        {/* head and bonnet */}
        <circle cx="0" cy="3" r="4.4" fill={BONE} {...heavy} />
        <path d="M-4.6 2 a4.6 4.6 0 0 1 9.2 0 L5.6 5 L2 5 L2 1 Z" fill="#7A4A62" {...heavy} />
        <circle cx="-1.6" cy="3.4" r="0.9" fill={INK} />
        {/* arm raised, hammer in hand */}
        <path d="M-5 12 L-13 6" stroke={BONE} strokeWidth="3.2" strokeLinecap="round" />
        <path d="M-13 6 L-19 2" stroke={BARK_D} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M-21 5 L-17 -1 L-14 1 L-18 7 Z" {...mid} fill={STONE_D} stroke={INK} />
        {/* the fossil basket */}
        <path d="M11 34 L22 34 L20 44 L13 44 Z" fill={BARK} {...heavy} />
        <path d="M12 34 a5.5 4 0 0 1 9 0" {...mid} stroke={INK} />
        <path d="M14 38 L19 38" {...fine} />
      </g>

      {/* Tray, who went everywhere with her */}
      <g transform="translate(176 84)">
        <path d="M-9 6 L-9 0 a4 4 0 0 1 4 -4 L5 -4 a4 4 0 0 1 4 4 L9 6 L6 6 L6 1 L2 1 L2 6 L-1 6 L-1 1 L-5 1 L-5 6 Z"
              fill={PAPER} {...heavy} />
        <circle cx="10" cy="-6" r="4.2" fill={PAPER} {...heavy} />
        <path d="M12 -9.5 L15 -6 L11.5 -5.5 Z" {...mid} fill={PAPER} stroke={INK} />
        <circle cx="11.4" cy="-6.4" r="0.9" fill={INK} />
        <circle cx="13.6" cy="-5" r="0.8" fill={INK} />
        <path d="M-9 -1 C -13 -3 -13 -7 -10 -9" stroke={INK} strokeWidth={OUT} fill="none" strokeLinecap="round" />
      </g>
    </Frame>
  );
}

const SCENES: Record<SceneKey, (p: SceneProps) => React.ReactElement> = {
  'jungle-book': JungleBook,
  'owl-and-pussycat': OwlAndPussycat,
  'lighthouse-dawn': LighthouseDawn,
  'great-fire': GreatFire,
  'school-library': SchoolLibrary,
  'paper-aeroplane': PaperAeroplane,
  'trip-to-coast': TripToCoast,
  'day-and-night': DayAndNight,
  'blue-whale': BlueWhale,
  'mary-anning': MaryAnning,
};

export function Scene({ name, className, title }: { name: SceneKey } & SceneProps) {
  const Component = SCENES[name];
  if (!Component) return null;
  return <Component className={className} title={title} />;
}
