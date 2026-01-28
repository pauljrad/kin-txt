-- Fix Member Visibility Issues

-- 1. FIX PROFILES VISIBILITY
-- Currently only users can see their own profile. We need to allow ALL authenticated users to see profiles
-- so that club member lists show names and avatars instead of being blank/hidden.

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);


-- 2. FIX CLUB MEMBER LIST VISIBILITY
-- Currently only the creator can see all members. We need to allow any ACCEPTED member
-- to see the full list of members for their club.

DROP POLICY IF EXISTS "Users can view memberships" ON public.club_memberships;

CREATE POLICY "Users can view memberships"
  ON public.club_memberships FOR SELECT
  USING (
    -- User can see their own membership
    auth.uid() = user_id 
    OR 
    -- User can see memberships if they are the creator of the club
    club_id IN (
      SELECT id FROM public.kin_clubs WHERE created_by = auth.uid()
    )
    OR
    -- User can see memberships if they are an ACCEPTED member of the club
    club_id IN (
      SELECT club_id FROM public.club_memberships 
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );
