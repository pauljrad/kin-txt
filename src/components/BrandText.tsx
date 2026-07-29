/**
 * Brand wordmark helper.
 *
 * The display font (Bebas Neue) is caps-only — it has no lowercase glyphs — so
 * plain text "KiN-TXT" renders as "KIN-TXT". To keep the brand's signature
 * lowercase "i" everywhere (matching the home/splash logo), we hand-draw the
 * "i" as a dot + stem for any "KiN" token in the string. Everything is sized in
 * `em` and painted with `currentColor`, so it scales with font-size and adapts
 * to the surrounding text colour / theme automatically.
 */

interface BrandTextProps {
  /** Brand string, e.g. "KiN-TXT" or "KiN-TXT Pro" or a product title like "KiN Pro (Monthly)". */
  children: string;
  className?: string;
}

/** The hand-drawn lowercase "i" (dot + stem), matching the home logo (AnimatedTitle). */
function LowercaseI() {
  return (
    <span
      aria-hidden
      className="relative inline-flex flex-col items-center"
      style={{ width: '0.42em' }}
    >
      <span
        className="absolute block rounded-full"
        style={{ width: '0.12em', height: '0.12em', top: '0.02em', backgroundColor: 'currentColor' }}
      />
      <span
        className="block rounded-sm"
        style={{ width: '0.12em', height: '0.52em', marginTop: '0.18em', backgroundColor: 'currentColor' }}
      />
    </span>
  );
}

export function BrandText({ children, className }: BrandTextProps) {
  // Split so each "KiN" token gets the hand-drawn "i"; other text renders as-is.
  const parts = children.split(/(KiN)/g);
  return (
    <span className={`inline-flex items-baseline ${className ?? ''}`} aria-label={children}>
      {parts.map((part, i) =>
        part === 'KiN' ? (
          <span key={i} className="inline-flex items-baseline">
            K<LowercaseI />N
          </span>
        ) : part ? (
          <span key={i} style={{ whiteSpace: 'pre' }}>{part}</span>
        ) : null,
      )}
    </span>
  );
}
