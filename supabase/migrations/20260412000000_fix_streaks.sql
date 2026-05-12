-- Migration: Fix Streaks and Sessions
-- Created at: 2026-04-12

-- 1. Create reading_sessions table for historical data and streak calculation
CREATE TABLE IF NOT EXISTS public.reading_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    words_read INTEGER DEFAULT 0,
    category TEXT DEFAULT 'document',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 2. Ensure user_reading_stats table exists with all required columns
CREATE TABLE IF NOT EXISTS public.user_reading_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    lifetime_reading_seconds INTEGER DEFAULT 0,
    last_reading_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Idempotently add missing columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_reading_stats' AND column_name = 'lifetime_reading_seconds') THEN
        ALTER TABLE public.user_reading_stats ADD COLUMN lifetime_reading_seconds INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_reading_stats' AND column_name = 'last_reading_date') THEN
        ALTER TABLE public.user_reading_stats ADD COLUMN last_reading_date DATE;
    END IF;
END $$;

-- 4. Enable RLS
ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reading_stats ENABLE ROW LEVEL SECURITY;

-- 5. Policies
DROP POLICY IF EXISTS "Users can view their own reading sessions" ON public.reading_sessions;
CREATE POLICY "Users can view their own reading sessions" ON public.reading_sessions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own stats" ON public.user_reading_stats;
CREATE POLICY "Users can view their own stats" ON public.user_reading_stats
    FOR SELECT USING (auth.uid() = user_id);

-- 6. RPC function to log reading sessions and update streaks
CREATE OR REPLACE FUNCTION public.log_reading_session(
    p_document_id UUID,
    p_duration_seconds INTEGER,
    p_category TEXT DEFAULT 'document',
    p_words_read INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_today DATE;
    v_last_read DATE;
    v_current_streak INTEGER;
    v_longest_streak INTEGER;
    v_new_streak INTEGER;
BEGIN
    -- Get current authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Standardize on UTC date (or server local date, but consistency is key)
    v_today := current_date;

    -- 1. Log the session
    IF p_duration_seconds > 0 THEN
        INSERT INTO public.reading_sessions (user_id, document_id, duration_seconds, words_read, category)
        VALUES (v_user_id, p_document_id, p_duration_seconds, p_words_read, p_category);
    END IF;

    -- 2. Fetch or initialize the user stats record
    INSERT INTO public.user_reading_stats (user_id, current_streak, longest_streak, lifetime_reading_seconds, updated_at)
    VALUES (v_user_id, 0, 0, 0, now())
    ON CONFLICT (user_id) DO NOTHING;

    SELECT last_reading_date, current_streak, longest_streak
    INTO v_last_read, v_current_streak, v_longest_streak
    FROM public.user_reading_stats
    WHERE user_id = v_user_id;

    -- 3. Calculate the new streak
    -- Rule: 
    -- If read today: no change to current_streak count (already active)
    -- If read yesterday: increment current_streak
    -- Otherwise: reset to 1
    IF v_last_read IS NULL THEN
        v_new_streak := 1;
    ELSIF v_last_read = v_today THEN
        v_new_streak := v_current_streak;
    ELSIF v_last_read = v_today - INTERVAL '1 day' THEN
        v_new_streak := v_current_streak + 1;
    ELSE
        v_new_streak := 1;
    END IF;

    -- 4. Update the stats record
    -- We also increment lifetime_reading_seconds here as an alternative high-water mark.
    UPDATE public.user_reading_stats
    SET current_streak = v_new_streak,
        longest_streak = GREATEST(longest_streak, v_new_streak),
        last_reading_date = v_today,
        lifetime_reading_seconds = lifetime_reading_seconds + GREATEST(0, p_duration_seconds),
        updated_at = now()
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object(
        'current_streak', v_new_streak,
        'longest_streak', GREATEST(v_longest_streak, v_new_streak),
        'today', v_today,
        'last_read', v_last_read
    );
END;
$$;
