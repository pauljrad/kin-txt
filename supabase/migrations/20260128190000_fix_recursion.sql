-- Fix Infinite Recursion in RLS
-- Problem: kin_clubs policies check club_memberships, and club_memberships policies check kin_clubs.
-- Solution: logical separation using a SECURITY DEFINER function to check membership without triggering RLS on the membership table again.

-- 1. Create a helper function to check membership safely
CREATE OR REPLACE FUNCTION public.is_club_member(_club_id UUID, _statuses TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS for this function
SET search_path = public -- Secure search path
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.club_memberships
    WHERE club_id = _club_id
      AND user_id = auth.uid()
      AND status = ANY(_statuses)
  );
END;
$$;

-- 2. Update 'kin_clubs' policies to use the safe function
DROP POLICY IF EXISTS "Users can view their clubs" ON public.kin_clubs;

CREATE POLICY "Users can view their clubs"
  ON public.kin_clubs FOR SELECT
  USING (
    auth.uid() = created_by 
    OR 
    is_club_member(id, ARRAY['accepted', 'pending']) -- Allow pending to see club details
  );

-- 3. Update 'club_memberships' policies to use the safe function
-- We remove the check against kin_clubs completely to avoid the loop.
-- Note: 'created_by' users should always have an 'accepted' membership created automatically, 
-- effectively covering the "creator sees all" rule via the membership check.
-- If for some reason a creator is NOT a member, they won't see other members, which is acceptable/safer to avoid recursion.

DROP POLICY IF EXISTS "Users can view memberships" ON public.club_memberships;

CREATE POLICY "Users can view memberships"
  ON public.club_memberships FOR SELECT
  USING (
    -- User can always see their own membership
    auth.uid() = user_id 
    OR 
    -- User can see ALL memberships if they are an accepted member of that club
    -- (This effectively covers the Creator case too, assuming creators are members)
    is_club_member(club_id, ARRAY['accepted'])
  );
