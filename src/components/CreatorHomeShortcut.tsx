import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCreatorAccess } from '@/hooks/useCreatorAccess';

export function CreatorHomeShortcut() {
  const navigate = useNavigate();
  const { isCreator, loading } = useCreatorAccess();

  if (loading || !isCreator) return null;

  return (
    <div className="mt-3 flex w-full justify-center">
      <motion.button
        onClick={() => navigate('/create')}
        whileTap={{ scale: 0.94 }}
        whileHover={{ scale: 1.04 }}
        animate={{
          boxShadow: [
            '0 0 0px rgba(255,255,255,0)',
            '0 0 20px rgba(255,255,255,0.14)',
            '0 0 0px rgba(255,255,255,0)',
          ],
        }}
        transition={{
          boxShadow: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
          scale: { duration: 0.16 },
        }}
        className="inline-flex h-11 min-w-16 items-center justify-center rounded-full border border-foreground/20 bg-secondary/35 px-4 text-foreground backdrop-blur-sm transition-colors hover:bg-secondary/65"
        aria-label="Open KiN-Creator studio"
      >
        <span className="flex h-7 items-center justify-center gap-1.5" aria-hidden="true">
          <span className="relative inline-flex h-7 w-2.5 justify-center">
            <motion.span
              className="absolute top-0.5 h-1 w-1 rounded-full bg-current"
              animate={{ y: [0, -5, 0], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.65, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.55 }}
            />
            <motion.span
              className="absolute bottom-0.5 h-4 w-0.5 rounded-full bg-current"
              animate={{ scaleY: [1, 0.68, 1] }}
              transition={{ duration: 1.65, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.55 }}
              style={{ transformOrigin: 'bottom' }}
            />
          </span>
          <motion.span
            className="inline-block h-0.5 w-3 rounded-full bg-current"
            animate={{ x: [0, 3, -2, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.7 }}
          />
        </span>
      </motion.button>
    </div>
  );
}
