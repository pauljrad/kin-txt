-- Create KiN-Clubs tables for reading club functionality
-- Migration: 20260128101123_create_kin_clubs

-- Table: kin_clubs
-- Stores reading club information
CREATE TABLE IF NOT EXISTS public.kin_clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Table: club_memberships
-- Stores club membership information and invitations
CREATE TABLE IF NOT EXISTS public.club_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.kin_clubs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending' NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(club_id, user_id)
);

-- Table: club_book_suggestions
-- Stores book suggestions for clubs
CREATE TABLE IF NOT EXISTS public.club_book_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.kin_clubs(id) ON DELETE CASCADE NOT NULL,
  suggested_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'active', 'completed')) DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Table: club_member_progress
-- Tracks individual member progress on club books
CREATE TABLE IF NOT EXISTS public.club_member_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID REFERENCES public.club_book_suggestions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('invited', 'accepted', 'declined')) DEFAULT 'invited' NOT NULL,
  progress NUMERIC(5,2) DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_word_index INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(suggestion_id, user_id)
);

-- Enable RLS
ALTER TABLE public.kin_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_book_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_member_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kin_clubs
CREATE POLICY "Users can view clubs they are members of"
  ON public.kin_clubs FOR SELECT
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.club_memberships
      WHERE club_id = id AND user_id = auth.uid()
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

-- RLS Policies for club_memberships
CREATE POLICY "Users can view memberships for their clubs"
  ON public.club_memberships FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.kin_clubs
      WHERE id = club_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Club creators can invite members"
  ON public.club_memberships FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.kin_clubs
      WHERE id = club_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their own membership status"
  ON public.club_memberships FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for club_book_suggestions
CREATE POLICY "Club members can view suggestions"
  ON public.club_book_suggestions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.club_memberships
      WHERE club_id = club_book_suggestions.club_id 
        AND user_id = auth.uid()
        AND status = 'accepted'
    )
  );

CREATE POLICY "Club members can create suggestions"
  ON public.club_book_suggestions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.club_memberships
      WHERE club_id = club_book_suggestions.club_id 
        AND user_id = auth.uid()
        AND status = 'accepted'
    )
  );

CREATE POLICY "Suggestion creators can update their suggestions"
  ON public.club_book_suggestions FOR UPDATE
  USING (auth.uid() = suggested_by);

-- RLS Policies for club_member_progress
CREATE POLICY "Users can view progress in their clubs"
  ON public.club_member_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.club_book_suggestions cbs
      JOIN public.club_memberships cm ON cm.club_id = cbs.club_id
      WHERE cbs.id = suggestion_id 
        AND cm.user_id = auth.uid()
        AND cm.status = 'accepted'
    )
  );

CREATE POLICY "System can create progress records"
  ON public.club_member_progress FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own progress"
  ON public.club_member_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_club_memberships_user ON public.club_memberships(user_id);
CREATE INDEX idx_club_memberships_club ON public.club_memberships(club_id);
CREATE INDEX idx_club_suggestions_club ON public.club_book_suggestions(club_id);
CREATE INDEX idx_club_progress_suggestion ON public.club_member_progress(suggestion_id);
CREATE INDEX idx_club_progress_user ON public.club_member_progress(user_id);
