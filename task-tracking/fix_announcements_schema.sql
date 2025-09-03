-- Corrected migration script to fix announcements database schema
-- Run this in your Supabase SQL editor
-- This script fixes the schema mismatch causing reactions and comments to fail

-- First, drop existing policies to avoid conflicts
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "ann_read" ON public.announcements;
    DROP POLICY IF EXISTS "ann_insert" ON public.announcements;
    DROP POLICY IF EXISTS "ann_update" ON public.announcements;
    DROP POLICY IF EXISTS "ann_delete" ON public.announcements;
    DROP POLICY IF EXISTS "ann_comments_read" ON public.announcement_comments;
    DROP POLICY IF EXISTS "ann_comments_insert" ON public.announcement_comments;
    DROP POLICY IF EXISTS "ann_comments_update" ON public.announcement_comments;
    DROP POLICY IF EXISTS "ann_comments_delete" ON public.announcement_comments;
    DROP POLICY IF EXISTS "ann_reactions_read" ON public.announcement_reactions;
    DROP POLICY IF EXISTS "ann_reactions_insert" ON public.announcement_reactions;
    DROP POLICY IF EXISTS "ann_reactions_delete" ON public.announcement_reactions;
EXCEPTION
    WHEN undefined_object THEN
        NULL; -- Ignore if policies don't exist
END $$;

-- Drop existing tables if they exist (CASCADE will handle dependencies)
DROP TABLE IF EXISTS public.announcement_reactions CASCADE;
DROP TABLE IF EXISTS public.announcement_comments CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;

-- Create the announcements table with correct schema (including pinned column)
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  title text NOT NULL,
  content text NOT NULL,
  priority text CHECK (priority IN ('low','medium','high')) DEFAULT 'medium',
  pinned boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create trigger for updated_at (only if the function exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
        CREATE TRIGGER trg_ann_updated_at
        BEFORE UPDATE ON public.announcements
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
END $$;

-- Create announcement_comments table (with 'body' column, not 'content')
CREATE TABLE public.announcement_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create announcement_reactions table (composite primary key, no separate id)
CREATE TABLE public.announcement_reactions (
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcements
CREATE POLICY "ann_read" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "ann_insert" ON public.announcements FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "ann_update" ON public.announcements FOR UPDATE 
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "ann_delete" ON public.announcements FOR DELETE 
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for announcement_comments
CREATE POLICY "ann_comments_read" ON public.announcement_comments FOR SELECT USING (true);
CREATE POLICY "ann_comments_insert" ON public.announcement_comments FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ann_comments_update" ON public.announcement_comments FOR UPDATE 
  USING (user_id = auth.uid());
CREATE POLICY "ann_comments_delete" ON public.announcement_comments FOR DELETE 
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for announcement_reactions
CREATE POLICY "ann_reactions_read" ON public.announcement_reactions FOR SELECT USING (true);
CREATE POLICY "ann_reactions_insert" ON public.announcement_reactions FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ann_reactions_delete" ON public.announcement_reactions FOR DELETE 
  USING (user_id = auth.uid());

-- Success message
SELECT 'Announcements schema fixed successfully! Reactions and comments should now work.' as result;