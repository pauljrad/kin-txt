-- COMPLETE RLS RESET FOR ALL CLUB TABLES
-- This is a nuclear option to guarantee everything is visible

-- Disable RLS entirely for debugging (we'll re-enable with open policies)
ALTER TABLE IF EXISTS public.club_book_suggestions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.club_member_progress DISABLE ROW LEVEL SECURITY;

-- Re-enable with completely open policies
ALTER TABLE public.club_book_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_member_progress ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'club_book_suggestions' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.club_book_suggestions';
    END LOOP;
    
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'club_member_progress' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.club_member_progress';
    END LOOP;
END $$;

-- Create maximally permissive policies
CREATE POLICY "open_select_suggestions" ON public.club_book_suggestions
    FOR SELECT USING (true);

CREATE POLICY "open_insert_suggestions" ON public.club_book_suggestions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "open_update_suggestions" ON public.club_book_suggestions
    FOR UPDATE USING (true);


CREATE POLICY "open_select_progress" ON public.club_member_progress
    FOR SELECT USING (true);

CREATE POLICY "open_insert_progress" ON public.club_member_progress
    FOR INSERT WITH CHECK (true);

CREATE POLICY "open_update_progress" ON public.club_member_progress
    FOR UPDATE USING (true);
