import { motion } from 'framer-motion';

// Badge tiers — thresholds are in MINUTES
export const LAPEL_TIERS = [
  {
    name: 'Blue',
    label: 'BLUE LAPEL',
    minMins: 600,
    color: '#0EA5E9',
    glow: 'rgba(14,165,233,0.5)',
    bg: 'rgba(14,165,233,0.15)',
    border: 'rgba(14,165,233,0.4)',
  },
  {
    name: 'Bronze',
    label: 'BRONZE LAPEL',
    minMins: 1200,
    color: '#CD7F32',
    glow: 'rgba(205,127,50,0.5)',
    bg: 'rgba(205,127,50,0.15)',
    border: 'rgba(205,127,50,0.4)',
  },
  {
    name: 'Silver',
    label: 'SILVER LAPEL',
    minMins: 2400,
    color: '#C0C0C0',
    glow: 'rgba(192,192,192,0.5)',
    bg: 'rgba(192,192,192,0.12)',
    border: 'rgba(192,192,192,0.4)',
  },
  {
    name: 'Gold',
    label: 'GOLD LAPEL',
    minMins: 6000,
    color: '#FFD600',
    glow: 'rgba(255,214,0,0.55)',
    bg: 'rgba(255,214,0,0.12)',
    border: 'rgba(255,214,0,0.4)',
  },
  {
    name: 'Platinum',
    label: 'PLATINUM LAPEL',
    minMins: 15000,
    color: '#E5E4E2',
    glow: 'rgba(229,228,226,0.6)',
    bg: 'rgba(229,228,226,0.10)',
    border: 'rgba(229,228,226,0.45)',
  },
] as const;

/** Returns the highest earned lapel tier for a given total reading time in seconds. */
export function getHighestLapel(totalReadingTimeSeconds: number) {
  const totalMins = Math.floor(totalReadingTimeSeconds / 60);
  for (let i = LAPEL_TIERS.length - 1; i >= 0; i--) {
    if (totalMins >= LAPEL_TIERS[i].minMins) return LAPEL_TIERS[i];
  }
  return null;
}

function getCurrentTierIndex(totalMins: number) {
  for (let i = LAPEL_TIERS.length - 1; i >= 0; i--) {
    if (totalMins >= LAPEL_TIERS[i].minMins) return i;
  }
  return -1;
}

interface ReadingTimeBadgeProps {
  totalReadingTimeSeconds: number;
}

export function ReadingTimeBadge({ totalReadingTimeSeconds }: ReadingTimeBadgeProps) {
  const totalMins = Math.floor(totalReadingTimeSeconds / 60);
  const tierIndex = getCurrentTierIndex(totalMins);
  const earned = tierIndex >= 0 ? LAPEL_TIERS[tierIndex] : null;
  const nextTier = tierIndex < LAPEL_TIERS.length - 1 ? LAPEL_TIERS[tierIndex + 1] : null;
  const firstTier = LAPEL_TIERS[0];

  // Progress bar
  let progressPct = 0;
  let progressLabel = '';
  let progressColor = '#0EA5E9';

  if (!earned) {
    progressPct = Math.min(100, (totalMins / firstTier.minMins) * 100);
    progressLabel = `${totalMins} / ${firstTier.minMins} mins to ${firstTier.name}`;
    progressColor = firstTier.color;
  } else if (!nextTier) {
    progressPct = 100;
    progressLabel = `${totalMins} mins — Platinum Status`;
    progressColor = earned.color;
  } else {
    progressPct = Math.min(100, ((totalMins - earned.minMins) / (nextTier.minMins - earned.minMins)) * 100);
    progressLabel = `${totalMins} / ${nextTier.minMins} mins to ${nextTier.name}`;
    progressColor = nextTier.color;
  }

  return (
    <div className="w-full space-y-3">
      {/* Label */}
      <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold mb-2 block">Lapels</span>

      {/* Lapel Badge Row */}
      <div className="flex items-center gap-3 flex-wrap">
        {LAPEL_TIERS.map((tier) => {
          const isEarned = totalMins >= tier.minMins;
          const isCurrent = earned?.name === tier.name;
          return (
            <motion.div
              key={tier.name}
              title={`${tier.label} — ${tier.minMins} mins`}
              whileHover={{ scale: 1.1 }}
              className="flex flex-col items-center gap-0.5"
            >
              {/* Coloured circle lapel — greyed when unearned */}
              <div
                className="rounded-full transition-all duration-300"
                style={{
                  width: isCurrent ? 26 : 20,
                  height: isCurrent ? 26 : 20,
                  background: isEarned ? tier.color : 'rgba(255,255,255,0.08)',
                  boxShadow: isCurrent
                    ? `0 0 16px 4px ${tier.glow}, 0 0 4px 1px ${tier.glow}`
                    : isEarned
                    ? `0 0 8px 2px ${tier.glow}`
                    : 'none',
                  border: isEarned
                    ? `2px solid ${tier.border}`
                    : '2px solid rgba(255,255,255,0.1)',
                  opacity: isEarned ? 1 : 0.35,
                }}
              />
              <span
                className="text-[7px] font-bold uppercase tracking-widest leading-none"
                style={{ color: isEarned ? tier.color : 'rgba(255,255,255,0.18)' }}
              >
                {tier.name}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-end items-center">
          <span className="text-[9px] text-muted-foreground tabular-nums">
            {progressLabel}
          </span>
        </div>
        <div className="relative h-1.5 w-full rounded-full bg-secondary/20 overflow-hidden">
          <motion.div
            className="absolute top-0 left-0 h-full rounded-full"
            style={{ background: progressColor }}
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

/** Small lapel pin to overlay on an avatar. Size defaults to 18px. */
export function AvatarLapel({
  totalReadingTimeSeconds,
  size = 18,
}: {
  totalReadingTimeSeconds: number;
  size?: number;
}) {
  const lapel = getHighestLapel(totalReadingTimeSeconds);
  if (!lapel) return null;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.3 }}
      title={lapel.label}
      className="absolute rounded-full pointer-events-none z-10"
      style={{
        width: size,
        height: size,
        bottom: 2,
        right: 2,
        background: lapel.color,
        border: '2.5px solid var(--background, #09090b)',
        boxShadow: `0 0 10px 3px ${lapel.glow}`,
      }}
    />
  );
}
