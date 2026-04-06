-- 1. Create reading_sessions table for granular temporal tracking
CREATE TABLE IF NOT EXISTS public.reading_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    words_read INTEGER NOT NULL DEFAULT 0,
    category TEXT DEFAULT 'document',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for temporal summation
CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_created ON public.reading_sessions (user_id, created_at);

-- RLS
ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own reading sessions" ON public.reading_sessions;
CREATE POLICY "Users can view their own reading sessions" ON public.reading_sessions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own reading sessions" ON public.reading_sessions;
CREATE POLICY "Users can insert their own reading sessions" ON public.reading_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. CREATE FUNCTION log_reading_session (The Hub)
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
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Insert granular session for temporal tracking (Week/Month/Year)
    INSERT INTO reading_sessions (user_id, document_id, duration_seconds, words_read, category)
    VALUES (v_user_id, p_document_id, p_duration_seconds, p_words_read, p_category);
END;
$$;
