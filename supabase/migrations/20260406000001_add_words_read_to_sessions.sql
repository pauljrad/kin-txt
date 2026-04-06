-- 1. Add words_read column
ALTER TABLE public.reading_sessions ADD COLUMN IF NOT EXISTS words_read INTEGER DEFAULT 0;

-- 2. Modify RPC to accept p_words_read
CREATE OR REPLACE FUNCTION public.log_reading_session(
    p_document_id UUID,
    p_duration_seconds INTEGER,
    p_category TEXT,
    p_words_read INTEGER DEFAULT 0
)
RETURNS void
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
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 1. Insert session with words read
    INSERT INTO reading_sessions (user_id, document_id, duration_seconds, category, words_read)
    VALUES (v_user_id, p_document_id, p_duration_seconds, p_category, p_words_read);

    -- 2. Update stats and streaks
    v_today := current_date;
    
    SELECT last_read_date, current_streak, longest_streak
    INTO v_last_read, v_current_streak, v_longest_streak
    FROM user_reading_stats
    WHERE user_id = v_user_id;

    IF NOT FOUND THEN
        -- First time reading ever
        INSERT INTO user_reading_stats (user_id, total_reading_time_seconds, current_streak, longest_streak, last_read_date)
        VALUES (v_user_id, p_duration_seconds, 1, 1, v_today);
    ELSE
        -- Update existing stats
        IF v_last_read = v_today THEN
            -- already read today, streak is unchanged
            NULL;
        ELSIF v_last_read = v_today - interval '1 day' THEN
            -- Read yesterday, increment streak
            v_current_streak := v_current_streak + 1;
        ELSE
            -- Break in reading, reset streak
            v_current_streak := 1;
        END IF;

        IF v_current_streak > v_longest_streak THEN
            v_longest_streak := v_current_streak;
        END IF;

        UPDATE user_reading_stats
        SET 
            total_reading_time_seconds = total_reading_time_seconds + p_duration_seconds,
            current_streak = v_current_streak,
            longest_streak = v_longest_streak,
            last_read_date = v_today,
            updated_at = NOW()
        WHERE user_id = v_user_id;
    END IF;
END;
$$;
