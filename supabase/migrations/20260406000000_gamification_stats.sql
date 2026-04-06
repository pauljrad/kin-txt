-- Create reading_sessions table
CREATE TABLE IF NOT EXISTS public.reading_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    duration_seconds INTEGER NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('book', 'article', 'document')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_reading_stats table
CREATE TABLE IF NOT EXISTS public.user_reading_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_reading_time_seconds INTEGER NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_read_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies for reading_sessions
ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own reading sessions"
    ON public.reading_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own reading sessions"
    ON public.reading_sessions FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policies for user_reading_stats
ALTER TABLE public.user_reading_stats ENABLE ROW LEVEL SECURITY;

-- Anyone can see any user's stats so you can view friends' stats
CREATE POLICY "Anyone can view reading stats"
    ON public.user_reading_stats FOR SELECT
    USING (true);

-- RPC for logging a reading session
CREATE OR REPLACE FUNCTION public.log_reading_session(
    p_document_id UUID,
    p_duration_seconds INTEGER,
    p_category TEXT
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

    -- 1. Insert session
    INSERT INTO reading_sessions (user_id, document_id, duration_seconds, category)
    VALUES (v_user_id, p_document_id, p_duration_seconds, p_category);

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
