-- Ensure Profiles are viewable by everyone
-- This fixes issues where fetching club members returns empty sets or null profiles due to RLS.

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING ( true ); -- Allow all authenticated (and anon if set) users to read profiles
