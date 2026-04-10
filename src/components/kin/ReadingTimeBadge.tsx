import { motion } from 'framer-motion';

// Badge tiers — thresholds are in MINUTES
const TIERS = [
  {
    name: 'Blue',
    label: 'READER',
    minMins: 600,
    color: '#0EA5E9',
    glow: 'rgba(14,165,233,0.45)',
    bg: 'rgba(14,165,233,0.12)',
    border: 'rgba(14,165,233,0.35)',
    icon: '📖',
  },
  {
    name: 'Bronze',
    label: 'DEVOTED',
    minMins: 1200,
    color: '#CD7F32',
    glow: 'rgba(205,127,50,0.45)',
    bg: 'rgba(205,127,50,0.12)',
    border: 'rgba(205,127,50,0.35)',
    icon: '🔥',
  },
  {
    name: 'Silver',
    label: 'FOCUS',
    minMins: 2400,
    color: '#C0C0C0',
    glow: 'rgba(192,192,192,0.45)',
    bg: 'rgba(192,192,192,0.10)',
    border: 'rgba(192,192,192,0.35)',
    icon: '⚡',
  },
  {
    name: 'Gold',
    label: 'ELITE',
    minMins: 6000,
    color: '#FFD600',
    glow: 'rgba(255,214,0,0.5)',
    bg: 'rgba(255,214,0,0.10)',
    border: 'rgba(255,214,0,0.35)',
    icon: '👑',
  },
  {
    name: 'Platinum',
    label: 'LEGEND',
    minMins: 10000,
    color: '#E5E4E2',
    glow: 'rgba(229,228,226,0.55)',
    bg: 'rgba(229,228,226,0.08)',
    border: 'rgba(229,228,226,0.4)',
    icon: '🏆',
  },
] as const;

interface ReadingTimeBadgeProps {
  totalReadingTimeSeconds: number;
}

function getCurrentTier(totalMins: number) {
  // Walk backwards to find the highest earned tier
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (totalMins >= TIERS[i].minMins) return { earned: TIERS[i], tierIndex: i };
  }
  return { earned: null, tierIndex: -1 };
}

function getNextTier(tierIndex: number) {
  if (tierIndex < TIERS.length - 1) return TIERS[tierIndex + 1];
  return null; // already at max
}

export function ReadingTimeBadge({ totalReadingTimeSeconds }: ReadingTimeBadgeProps) {
  const totalMins = Math.floor(totalReadingTimeSeconds / 60);
  const { earned, tierIndex } = getCurrentTier(totalMins);
  const nextTier = getNextTier(tierIndex);
  // The first milestone is always the first tier even if unearned
  const firstTier = TIERS[0];

  // Progress bar calculation
  let progressPct = 0;
  let progressLabel = '';
  let progressColor = '#0EA5E9';

  if (!earned && nextTier === null) {
    // Edge case: no tiers at all (shouldn't happen)
    progressPct = 0;
  } else if (!earned) {
    // Heading to first tier
    progressPct = Math.min(100, (totalMins / firstTier.minMins) * 100);
    progressLabel = `${totalMins} / ${firstTier.minMins} mins to ${firstTier.label}`;
    progressColor = firstTier.color;
  } else if (!nextTier) {
    // Max tier — full bar
    progressPct = 100;
    progressLabel = `${totalMins} mins — LEGEND STATUS`;
    progressColor = earned.color;
  } else {
    // Between tiers
    const fromMins = earned.minMins;
    const toMins = nextTier.minMins;
    progressPct = Math.min(100, ((totalMins - fromMins) / (toMins - fromMins)) * 100);
    progressLabel = `${totalMins} / ${toMins} mins to ${nextTier.label}`;
    progressColor = nextTier.color;
  }

  return (
    <div className="w-full space-y-3">
      {/* Badge Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {TIERS.map((tier, i) => {
          const isEarned = totalMins >= tier.minMins;
          const isCurrent = earned?.name === tier.name;
          return (
            <motion.div
              key={tier.name}
              title={`${tier.label} — ${tier.minMins} mins`}
              whileHover={{ scale: 1.08 }}
              className="relative flex flex-col items-center"
            >
              <div
                className="flex items-center justify-center rounded-full text-base transition-all duration-300"
                style={{
                  width: isCurrent ? 40 : 32,
                  height: isCurrent ? 40 : 32,
                  background: isEarned ? tier.bg : 'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${isEarned ? tier.border : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: isCurrent ? `0 0 14px 3px ${tier.glow}` : isEarned ? `0 0 6px 1px ${tier.glow}` : 'none',
                  opacity: isEarned ? 1 : 0.3,
                  filter: isEarned ? 'none' : 'grayscale(100%)',
                }}
              >
                <span style={{ fontSize: isCurrent ? 18 : 14 }}>{tier.icon}</span>
              </div>
              <span
                className="text-[7px] font-bold uppercase tracking-widest mt-0.5 leading-none"
                style={{ color: isEarned ? tier.color : 'rgba(255,255,255,0.2)' }}
              >
                {tier.name}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Progress Bar toward next tier */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">
            Reading Time
          </span>
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
          {/* Subtle sheen */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
}
