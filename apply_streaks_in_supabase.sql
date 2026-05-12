-- =============================================================
-- KiN-TXT Streak Fix — Run this ENTIRE script in the Supabase
-- SQL Editor: https://supabase.com/dashboard/project/pxvnylvkzdcuuauppull/sql/new
-- =============================================================

-- 1. Create reading_sessions table
CREATE TABLE IF NOT EXISTS public.reading_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    words_read INTEGER DEFAULT 0,
    category TEXT DEFAULT 'document',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 2. Create user_reading_stats table
CREATE TABLE IF NOT EXISTS public.user_reading_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    lifetime_reading_seconds INTEGER DEFAULT 0,
    last_reading_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Ensure all columns exist (idempotent)
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

-- 5. RLS Policies — drop first to avoid duplicates
DROP POLICY IF EXISTS "Users can view their own reading sessions" ON public.reading_sessions;
CREATE POLICY "Users can view their own reading sessions" ON public.reading_sessions
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own stats" ON public.user_reading_stats;
CREATE POLICY "Users can manage their own stats" ON public.user_reading_stats
    FOR ALL USING (auth.uid() = user_id);

-- 6. The main RPC function — streaks + session logging
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
    v_stats RECORD;
BEGIN
    -- Identity
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Not authenticated');
    END IF;

    -- UTC date (consistent regardless of server timezone)
    v_today := (now() AT TIME ZONE 'UTC')::DATE;

    -- Log the session
    IF p_duration_seconds > 0 THEN
        INSERT INTO public.reading_sessions (user_id, document_id, duration_seconds, words_read, category)
        VALUES (v_user_id, p_document_id, p_duration_seconds, p_words_read, p_category);
    END IF;

    -- Get or initialise stats row
    INSERT INTO public.user_reading_stats (user_id, current_streak, longest_streak, lifetime_reading_seconds, updated_at)
    VALUES (v_user_id, 0, 0, 0, now())
    ON CONFLICT (user_id) DO NOTHING;

    SELECT last_reading_date, current_streak, longest_streak, lifetime_reading_seconds
    INTO v_stats
    FROM public.user_reading_stats
    WHERE user_id = v_user_id;

    v_last_read        := v_stats.last_reading_date;
    v_current_streak   := COALESCE(v_stats.current_streak, 0);
    v_longest_streak   := COALESCE(v_stats.longest_streak, 0);

    -- Streak logic
    IF v_last_read IS NULL THEN
        v_new_streak := 1;                              -- first ever session
    ELSIF v_last_read = v_today THEN
        v_new_streak := GREATEST(v_current_streak, 1); -- already read today
    ELSIF v_last_read = (v_today - 1) THEN
        v_new_streak := v_current_streak + 1;          -- read yesterday → continue
    ELSE
        v_new_streak := 1;                              -- missed a day
    END IF;

    -- Write back
    UPDATE public.user_reading_stats
    SET current_streak          = v_new_streak,
        longest_streak          = GREATEST(longest_streak, v_new_streak),
        last_reading_date       = v_today,
        lifetime_reading_seconds = COALESCE(v_stats.lifetime_reading_seconds, 0) + GREATEST(0, p_duration_seconds),
        updated_at              = now()
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object(
        'status',         'success',
        'current_streak', v_new_streak,
        'longest_streak', GREATEST(v_longest_streak, v_new_streak),
        'today',          v_today,
        'user_id',        v_user_id
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'status',  'error',
        'message', SQLERRM,
        'detail',  SQLSTATE
    );
END;
$$;

-- Done!
SELECT 'Streak fix applied successfully' AS result;
