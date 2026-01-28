-- FORCE OPEN ALL RLS POLICIES - DIAGNOSTIC FIX
-- This migration forcibly removes all restrictive policies and creates maximally permissive ones

-- PROFILES TABLE
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on profiles
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.profiles';
    END LOOP;
END $$;

-- Create single permissive policy for profiles
CREATE POLICY "allow_all_select_profiles" ON public.profiles
    FOR SELECT
    USING (true);


-- CLUB_MEMBERSHIPS TABLE
ALTER TABLE public.club_memberships ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on club_memberships
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'club_memberships' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.club_memberships';
    END LOOP;
END $$;

-- Create single permissive policy for club_memberships
CREATE POLICY "allow_all_select_memberships" ON public.club_memberships
    FOR SELECT
    USING (true);


-- KIN_CLUBS TABLE
ALTER TABLE public.kin_clubs ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on kin_clubs
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'kin_clubs' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.kin_clubs';
    END LOOP;
END $$;

-- Create single permissive policy for kin_clubs
CREATE POLICY "allow_all_select_clubs" ON public.kin_clubs
    FOR SELECT
    USING (true);
