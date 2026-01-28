-- Fix RLS to allow invited (pending) users to view club details
-- This is necessary so they can see the Club Name in the invitation notification

DROP POLICY IF EXISTS "Users can view their clubs" ON public.kin_clubs;

CREATE POLICY "Users can view their clubs"
  ON public.kin_clubs FOR SELECT
  USING (
    auth.uid() = created_by OR
    id IN (
      SELECT club_id FROM public.club_memberships
      WHERE user_id = auth.uid() 
      AND status IN ('accepted', 'pending') -- Allow pending members to view basic club info
    )
  );
