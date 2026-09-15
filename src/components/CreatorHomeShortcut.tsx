import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCreatorAccess } from '@/hooks/useCreatorAccess';

export function CreatorHomeShortcut() {
  const navigate = useNavigate();
  const { isCreator, loading } = useCreatorAccess();

  if (loading || !isCreator) return null;

  return (
    <div className="mt-2.5 flex w-full justify-center">
      <motion.button
        onClick={() => navigate('/create')}
        whileTap={{ scale: 0.96 }}
        whileHover={{ scale: 1.025 }}
        animate={{
          boxShadow: [
            '0 0 0px rgba(255,255,255,0)',
            '0 0 14px rgba(255,255,255,0.10)',
            '0 0 0px rgba(255,255,255,0)',
          ],
        }}
        transition={{
          boxShadow: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
          scale: { duration: 0.16 },
        }}
        className="group inline-flex h-8 items-center gap-2 rounded-full border border-foreground/20 bg-secondary/35 px-3 text-foreground backdrop-blur-sm transition-colors hover:bg-secondary/65"
        aria-label="Open KiN-Creator studio"
      >
        <span className="flex h-4 items-center font-display text-[11px] leading-none tracking-[-0.04em]" aria-hidden="true">
          <span>K</span>
          <span className="relative mx-[1px] inline-flex h-4 w-[5px] justify-center">
            <motion.span
              className="absolute top-[1px] h-[2.5px] w-[2.5px] rounded-full bg-current"
              animate={{ y: [0, -3, 0], opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.65 }}
            />
            <motion.span
              className="absolute bottom-[1px] h-[9px] w-[1.5px] rounded-full bg-current"
              animate={{ scaleY: [1, 0.7, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.65 }}
              style={{ transformOrigin: 'bottom' }}
            />
          </span>
          <span>N</span>
          <motion.span
            className="mx-[1px] inline-block h-[1.5px] w-[4px] rounded-full bg-current"
            animate={{ x: [0, 1.5, -1, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.8 }}
          />
        </span>
        <span className="font-display text-[10px] font-medium uppercase tracking-[0.18em] leading-none">Create</span>
      </motion.button>
    </div>
  );
}
