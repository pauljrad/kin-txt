-- Open RLS for club book suggestions and member progress tables
-- These tables need to be readable by all club members

-- CLUB_BOOK_SUGGESTIONS TABLE
ALTER TABLE IF EXISTS public.club_book_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_select_suggestions" ON public.club_book_suggestions;
DROP POLICY IF EXISTS "Users can view suggestions" ON public.club_book_suggestions;

CREATE POLICY "allow_all_select_suggestions" ON public.club_book_suggestions
    FOR SELECT
    TO authenticated
    USING (true);


-- CLUB_MEMBER_PROGRESS TABLE
ALTER TABLE IF EXISTS public.club_member_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_select_progress" ON public.club_member_progress;
DROP POLICY IF EXISTS "Users can view progress" ON public.club_member_progress;

CREATE POLICY "allow_all_select_progress" ON public.club_member_progress
    FOR SELECT
    TO authenticated
    USING (true);
