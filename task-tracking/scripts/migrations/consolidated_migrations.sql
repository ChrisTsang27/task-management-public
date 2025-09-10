-- Consolidated Database Migrations
-- This file contains all database schema updates and optimizations
-- Run this file to apply all pending migrations

-- ============================================================================
-- ANNOUNCEMENTS TABLE ENHANCEMENTS
-- ============================================================================

-- Add attachments column to announcements table
ALTER TABLE public.announcements 
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- Add pinned field to announcements table
ALTER TABLE public.announcements 
ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;

-- Add comments to document the columns
COMMENT ON COLUMN public.announcements.attachments IS 'JSON array of attachment objects with url, name, size, type, and path properties';
COMMENT ON COLUMN public.announcements.pinned IS 'Boolean flag to indicate if announcement is pinned to top';

-- Create index for better performance when querying pinned announcements
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON public.announcements(pinned, created_at DESC);

-- ============================================================================
-- PROFILES TABLE ENHANCEMENTS
-- ============================================================================

-- Add profile insert policy
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Fix profile RLS policies
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- ============================================================================
-- ANNOUNCEMENTS RLS POLICIES UPDATE
-- ============================================================================

-- Update RLS policies to allow admins to pin/unpin announcements
DROP POLICY IF EXISTS "ann_update" ON public.announcements;
CREATE POLICY "ann_update" ON public.announcements FOR UPDATE 
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Fix announcements schema if needed
DROP POLICY IF EXISTS "ann_select" ON public.announcements;
CREATE POLICY "ann_select" ON public.announcements FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "ann_insert" ON public.announcements;
CREATE POLICY "ann_insert" ON public.announcements FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "ann_delete" ON public.announcements;
CREATE POLICY "ann_delete" ON public.announcements FOR DELETE 
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================================
-- DATABASE OPTIMIZATIONS
-- ============================================================================

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON public.announcements(created_by);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Analyze tables for better query planning
ANALYZE public.announcements;
ANALYZE public.profiles;

-- Success message
SELECT 'All migrations applied successfully!' as result;