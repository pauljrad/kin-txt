-- Migration: Bulletproof Streak Logic
-- Created at: 2026-04-12

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
    -- 1. Identity Verification
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Not authenticated');
    END IF;

    -- 2. Timezone-Resilient Date
    v_today := (now() AT TIME ZONE 'UTC')::DATE;

    -- 3. Session Recording
    IF p_duration_seconds > 0 THEN
        INSERT INTO public.reading_sessions (user_id, document_id, duration_seconds, words_read, category)
        VALUES (v_user_id, p_document_id, p_duration_seconds, p_words_read, p_category);
    END IF;

    -- 4. Stats Initialization & Locking
    INSERT INTO public.user_reading_stats (user_id, current_streak, longest_streak, lifetime_reading_seconds, updated_at)
    VALUES (v_user_id, 1, 1, 0, now())
    ON CONFLICT (user_id) DO UPDATE SET updated_at = now(); -- Just touch to ensure we can select it

    SELECT last_reading_date, current_streak, longest_streak, lifetime_reading_seconds
    INTO v_stats
    FROM public.user_reading_stats
    WHERE user_id = v_user_id;

    v_last_read := v_stats.last_reading_date;
    v_current_streak := COALESCE(v_stats.current_streak, 0);
    v_longest_streak := COALESCE(v_stats.longest_streak, 0);

    -- 5. Bulletproof Calculation
    IF v_last_read IS NULL THEN
        -- Case: First reading session ever
        v_new_streak := 1;
    ELSIF v_last_read = v_today THEN
        -- Case: Already read today (ensure at least 1)
        v_new_streak := GREATEST(v_current_streak, 1);
    ELSIF v_last_read = (v_today - 1) THEN
        -- Case: Read yesterday
        v_new_streak := v_current_streak + 1;
    ELSE
        -- Case: Missed a day
        v_new_streak := 1;
    END IF;

    -- 6. Final Write with Integrity Check
    UPDATE public.user_reading_stats
    SET current_streak = v_new_streak,
        longest_streak = GREATEST(longest_streak, v_new_streak),
        last_reading_date = v_today,
        lifetime_reading_seconds = COALESCE(v_stats.lifetime_reading_seconds, 0) + GREATEST(0, p_duration_seconds),
        updated_at = now()
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object(
        'status', 'success',
        'current_streak', v_new_streak,
        'longest_streak', GREATEST(v_longest_streak, v_new_streak),
        'today', v_today,
        'user_id', v_user_id
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'status', 'error',
        'message', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$;
