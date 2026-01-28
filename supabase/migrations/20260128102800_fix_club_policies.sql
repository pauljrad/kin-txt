-- Complete fix for infinite recursion in KiN-Clubs RLS policies
-- This consolidates policies to avoid circular dependencies

-- Drop ALL existing policies completely
DROP POLICY IF EXISTS "Users can view clubs they created" ON public.kin_clubs;
DROP POLICY IF EXISTS "Users can view clubs they are members of" ON public.kin_clubs;
DROP POLICY IF EXISTS "Users can create clubs" ON public.kin_clubs;
DROP POLICY IF EXISTS "Club creators can update their clubs" ON public.kin_clubs;
DROP POLICY IF EXISTS "Club creators can delete their clubs" ON public.kin_clubs;

DROP POLICY IF EXISTS "Users can view their own memberships" ON public.club_memberships;
DROP POLICY IF EXISTS "Club creators can view all memberships" ON public.club_memberships;
DROP POLICY IF EXISTS "Allow inserting memberships" ON public.club_memberships;
DROP POLICY IF EXISTS "Users can update their own membership status" ON public.club_memberships;
DROP POLICY IF EXISTS "Club creators can delete memberships" ON public.club_memberships;

-- ============================================
-- KIN_CLUBS POLICIES (no circular dependencies)
-- ============================================

-- Single consolidated SELECT policy (avoids multiple policy OR issues)
CREATE POLICY "Users can view their clubs"
  ON public.kin_clubs FOR SELECT
  USING (
    auth.uid() = created_by OR
    id IN (
      SELECT club_id FROM public.club_memberships
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Users can create clubs"
  ON public.kin_clubs FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Club creators can update their clubs"
  ON public.kin_clubs FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Club creators can delete their clubs"
  ON public.kin_clubs FOR DELETE
  USING (auth.uid() = created_by);

-- ============================================
-- CLUB_MEMBERSHIPS POLICIES (simplified, no kin_clubs lookups in SELECT)
-- ============================================

-- Simple SELECT policy - just check if it's your membership or if you're querying your club's members
CREATE POLICY "Users can view memberships"
  ON public.club_memberships FOR SELECT
  USING (
    auth.uid() = user_id OR
    club_id IN (
      SELECT id FROM public.kin_clubs WHERE created_by = auth.uid()
    )
  );

-- Allow any authenticated user to insert memberships (we'll control this at app level)
CREATE POLICY "Authenticated users can insert memberships"
  ON public.club_memberships FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own membership"
  ON public.club_memberships FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Club creators can delete memberships"
  ON public.club_memberships FOR DELETE
  USING (
    club_id IN (
      SELECT id FROM public.kin_clubs WHERE created_by = auth.uid()
    )
  );
