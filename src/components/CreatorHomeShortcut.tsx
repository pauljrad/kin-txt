import { PenLine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCreatorAccess } from '@/hooks/useCreatorAccess';

export function CreatorHomeShortcut() {
  const navigate = useNavigate();
  const { isCreator, loading } = useCreatorAccess();

  if (loading || !isCreator) return null;

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-30 top-[calc(10.6rem+env(safe-area-inset-top,0px))] sm:top-[calc(12.15rem+env(safe-area-inset-top,0px))] md:top-[calc(13rem+env(safe-area-inset-top,0px))]"
    >
      <button
        onClick={() => navigate('/create')}
        className="h-9 px-4 rounded-xl border border-foreground/25 bg-background/85 backdrop-blur-md text-foreground hover:bg-secondary transition-all flex items-center gap-2 text-xs font-display tracking-[0.16em] uppercase shadow-sm"
      >
        <PenLine className="w-3.5 h-3.5" />
        Create
      </button>
    </div>
  );
}
