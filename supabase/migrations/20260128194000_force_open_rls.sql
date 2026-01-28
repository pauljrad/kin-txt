-- SIMPLE RLS FIX - No DO blocks, just direct policy management
-- This replaces the complex DO block approach with simple DROP/CREATE statements

-- PROFILES TABLE
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_select_profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "allow_all_select_profiles" ON public.profiles
    FOR SELECT
    TO authenticated, anon
    USING (true);


-- CLUB_MEMBERSHIPS TABLE
ALTER TABLE IF EXISTS public.club_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_select_memberships" ON public.club_memberships;
DROP POLICY IF EXISTS "Users can view memberships" ON public.club_memberships;
DROP POLICY IF EXISTS "Users can view their memberships" ON public.club_memberships;

CREATE POLICY "allow_all_select_memberships" ON public.club_memberships
    FOR SELECT
    TO authenticated, anon
    USING (true);


-- KIN_CLUBS TABLE
ALTER TABLE IF EXISTS public.kin_clubs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_select_clubs" ON public.kin_clubs;
DROP POLICY IF EXISTS "Users can view ANY club" ON public.kin_clubs;
DROP POLICY IF EXISTS "Users can view their clubs" ON public.kin_clubs;
DROP POLICY IF EXISTS "Users can view any club on creation or if invited" ON public.kin_clubs;

CREATE POLICY "allow_all_select_clubs" ON public.kin_clubs
    FOR SELECT
    TO authenticated, anon
    USING (true);
