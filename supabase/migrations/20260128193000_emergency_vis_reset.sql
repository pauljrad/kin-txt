-- EMERGENCY: Reset policies for clubs/members/profiles to ensure visibility
-- This is a "nuclear option" to guarantee public visibility for debugging

-- 1. PROFILES: Open to everyone
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);


-- 2. CLUB MEMBERSHIPS: Open to all authenticated users for now
-- (We trust the UI to filter relevant ones, this unblocks the '0 members' bug)
DROP POLICY IF EXISTS "Users can view memberships" ON public.club_memberships;
CREATE POLICY "Users can view memberships" ON public.club_memberships 
  FOR SELECT 
  TO authenticated 
  USING (true);


-- 3. CLUBS: Open to all authenticated users for now
DROP POLICY IF EXISTS "Users can view any club on creation or if invited" ON public.kin_clubs;
DROP POLICY IF EXISTS "Users can view their clubs" ON public.kin_clubs;

CREATE POLICY "Users can view ANY club" ON public.kin_clubs 
  FOR SELECT 
  TO authenticated 
  USING (true);
