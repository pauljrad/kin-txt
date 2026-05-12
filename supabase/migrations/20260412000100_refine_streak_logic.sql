-- Migration: Refine Streak Logic and Diagnostics
-- Created at: 2024-04-12

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
    -- 1. Get current authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 2. Standardize on UTC date for all streak calculations
    -- This ensures consistency between client logs and server calculation
    v_today := (CURRENT_DATE AT TIME ZONE 'UTC')::DATE;

    -- 3. Log the historical session record
    IF p_duration_seconds > 0 THEN
        INSERT INTO public.reading_sessions (user_id, document_id, duration_seconds, words_read, category)
        VALUES (v_user_id, p_document_id, p_duration_seconds, p_words_read, p_category);
    END IF;

    -- 4. Fetch or initialize the user stats record
    INSERT INTO public.user_reading_stats (user_id, current_streak, longest_streak, lifetime_reading_seconds, updated_at)
    VALUES (v_user_id, 0, 0, 0, now())
    ON CONFLICT (user_id) DO NOTHING;

    SELECT last_reading_date, current_streak, longest_streak, lifetime_reading_seconds
    INTO v_stats
    FROM public.user_reading_stats
    WHERE user_id = v_user_id;

    v_last_read := v_stats.last_reading_date;
    v_current_streak := COALESCE(v_stats.current_streak, 0);
    v_longest_streak := COALESCE(v_stats.longest_streak, 0);

    -- 5. Calculate the new streak
    -- Rule:
    -- NULL last_read: First time reading ever -> Streak 1
    -- Read today: Streak stays the same (already active/incremented)
    -- Read yesterday: Streak increments
    -- Otherwise: Streak resets to 1 (missed at least one full day)
    
    IF v_last_read IS NULL THEN
        v_new_streak := 1;
    ELSIF v_last_read = v_today THEN
        v_new_streak := v_current_streak;
    ELSIF v_last_read = (v_today - 1) THEN
        v_new_streak := v_current_streak + 1;
    ELSE
        v_new_streak := 1;
    END IF;

    -- 6. Update the stats record
    UPDATE public.user_reading_stats
    SET current_streak = v_new_streak,
        longest_streak = GREATEST(longest_streak, v_new_streak),
        last_reading_date = v_today,
        lifetime_reading_seconds = COALESCE(v_stats.lifetime_reading_seconds, 0) + GREATEST(0, p_duration_seconds),
        updated_at = now()
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object(
        'current_streak', v_new_streak,
        'longest_streak', GREATEST(v_longest_streak, v_new_streak),
        'duration_logged', p_duration_seconds,
        'today', v_today,
        'last_read', v_last_read,
        'status', 'success'
    );
END;
$$;
