-- Migration script to update announcements table schema
-- Run this in your Supabase SQL editor

-- First, check if the announcements table exists and what columns it has
-- If it has content_json instead of content, run the following:

-- Drop the old table if it exists with wrong schema
DROP TABLE IF EXISTS public.announcements CASCADE;

-- Create the announcements table with correct schema
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  title text NOT NULL,
  content text NOT NULL,
  priority text CHECK (priority IN ('low','medium','high')) DEFAULT 'medium',
  expires_at timestamptz,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create trigger for updated_at
CREATE TRIGGER trg_ann_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Create announcement_comments table
CREATE TABLE public.announcement_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id uuid REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_ann_comments_updated_at
BEFORE UPDATE ON public.announcement_comments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Create announcement_reactions table
CREATE TABLE public.announcement_reactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id uuid REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id, emoji)
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