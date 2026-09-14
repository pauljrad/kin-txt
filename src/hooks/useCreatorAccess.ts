import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useCreatorAccess() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user) {
        if (!cancelled) {
          setIsCreator(false);
          setDisplayName(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('kin_creators' as any)
        .select('display_name, active')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.warn('Could not load KiN-Creator access:', error);
        setIsCreator(false);
        setDisplayName(null);
      } else {
        const row = data as { display_name?: string; active?: boolean } | null;
        setIsCreator(!!row?.active);
        setDisplayName(row?.display_name ?? null);
      }
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [user]);

  return { isCreator, displayName, loading };
}
