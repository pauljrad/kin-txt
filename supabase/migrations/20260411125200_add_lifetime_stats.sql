-- Add lifetime reading time to user stats
ALTER TABLE IF EXISTS public.user_reading_stats 
ADD COLUMN IF NOT EXISTS lifetime_reading_seconds INTEGER DEFAULT 0;

-- Ensure an updated_at column exists for tracking
ALTER TABLE IF EXISTS public.user_reading_stats
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Function to safely update lifetime reading time (monotonically increasing)
CREATE OR REPLACE FUNCTION public.sync_lifetime_reading_time(
    p_user_id UUID,
    p_total_seconds INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_reading_stats (user_id, lifetime_reading_seconds, updated_at)
    VALUES (p_user_id, p_total_seconds, now())
    ON CONFLICT (user_id) DO UPDATE
    SET lifetime_reading_seconds = GREATEST(user_reading_stats.lifetime_reading_seconds, EXCLUDED.lifetime_reading_seconds),
        updated_at = now();
END;
$$;
