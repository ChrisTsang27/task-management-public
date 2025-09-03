-- Database Optimization Script for Task Management App
-- This script adds indexes and optimizations for better query performance
-- Run this in your Supabase SQL Editor

-- ===== PERFORMANCE INDEXES =====

-- 1. Announcements table optimizations
-- Index for fetching announcements ordered by pinned status and creation date
CREATE INDEX IF NOT EXISTS idx_announcements_pinned_created 
  ON public.announcements(pinned DESC, created_at DESC);

-- Index for team-specific announcements
CREATE INDEX IF NOT EXISTS idx_announcements_team_id 
  ON public.announcements(team_id) 
  WHERE team_id IS NOT NULL;

-- Index for announcements by creator
CREATE INDEX IF NOT EXISTS idx_announcements_created_by 
  ON public.announcements(created_by);

-- Index for non-expired announcements
CREATE INDEX IF NOT EXISTS idx_announcements_active 
  ON public.announcements(expires_at) 
  WHERE expires_at IS NULL OR expires_at > NOW();

-- Composite index for priority and creation date
CREATE INDEX IF NOT EXISTS idx_announcements_priority_created 
  ON public.announcements(priority, created_at DESC);

-- 2. Comments table optimizations
-- Index for fetching comments by announcement
CREATE INDEX IF NOT EXISTS idx_comments_announcement_created 
  ON public.announcement_comments(announcement_id, created_at ASC);

-- Index for comments by user
CREATE INDEX IF NOT EXISTS idx_comments_user_id 
  ON public.announcement_comments(user_id);

-- 3. Reactions table optimizations
-- Index for fetching reactions by announcement
CREATE INDEX IF NOT EXISTS idx_reactions_announcement_emoji 
  ON public.announcement_reactions(announcement_id, emoji);

-- Unique index to prevent duplicate reactions
CREATE UNIQUE INDEX IF NOT EXISTS idx_reactions_unique 
  ON public.announcement_reactions(announcement_id, user_id, emoji);

-- Index for user reactions
CREATE INDEX IF NOT EXISTS idx_reactions_user_id 
  ON public.announcement_reactions(user_id);

-- 4. Profiles table optimizations
-- Index for role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_role 
  ON public.profiles(role);

-- Index for department filtering
CREATE INDEX IF NOT EXISTS idx_profiles_department 
  ON public.profiles(department) 
  WHERE department IS NOT NULL;

-- Index for location filtering
CREATE INDEX IF NOT EXISTS idx_profiles_location 
  ON public.profiles(location) 
  WHERE location IS NOT NULL;

-- Full-text search index for user names
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_gin 
  ON public.profiles USING gin(to_tsvector('english', full_name));

-- 5. Tasks table optimizations (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks' AND table_schema = 'public') THEN
    -- Index for task status queries
    CREATE INDEX IF NOT EXISTS idx_tasks_status 
      ON public.tasks(status);
    
    -- Index for assignee queries
    CREATE INDEX IF NOT EXISTS idx_tasks_assignee 
      ON public.tasks(assignee_id) 
      WHERE assignee_id IS NOT NULL;
    
    -- Index for team tasks
    CREATE INDEX IF NOT EXISTS idx_tasks_team_id 
      ON public.tasks(team_id) 
      WHERE team_id IS NOT NULL;
    
    -- Index for due date queries
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date 
      ON public.tasks(due_date) 
      WHERE due_date IS NOT NULL;
    
    -- Composite index for task board queries
    CREATE INDEX IF NOT EXISTS idx_tasks_team_status_created 
      ON public.tasks(team_id, status, created_at DESC);
  END IF;
END $$;

-- ===== QUERY OPTIMIZATION FUNCTIONS =====

-- Function to get announcement statistics efficiently
CREATE OR REPLACE FUNCTION get_announcement_stats(team_filter uuid DEFAULT NULL)
RETURNS TABLE(
  total_count bigint,
  high_priority_count bigint,
  active_count bigint,
  pinned_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE priority = 'high') as high_priority_count,
    COUNT(*) FILTER (WHERE expires_at IS NULL OR expires_at > NOW()) as active_count,
    COUNT(*) FILTER (WHERE pinned = true) as pinned_count
  FROM public.announcements
  WHERE (team_filter IS NULL OR team_id = team_filter OR team_id IS NULL);
END;
$$ LANGUAGE plpgsql;

-- Function to get user reaction summary for an announcement
CREATE OR REPLACE FUNCTION get_reaction_summary(announcement_uuid uuid)
RETURNS TABLE(
  emoji text,
  count bigint,
  user_names text[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.emoji,
    COUNT(*) as count,
    array_agg(COALESCE(p.full_name, 'Unknown User')) as user_names
  FROM public.announcement_reactions r
  LEFT JOIN public.profiles p ON r.user_id = p.id
  WHERE r.announcement_id = announcement_uuid
  GROUP BY r.emoji
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql;

-- ===== MATERIALIZED VIEWS FOR HEAVY QUERIES =====

-- Materialized view for user statistics (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS user_activity_stats AS
SELECT 
  p.id,
  p.full_name,
  p.role,
  p.department,
  COUNT(DISTINCT a.id) as announcements_created,
  COUNT(DISTINCT c.id) as comments_made,
  COUNT(DISTINCT r.announcement_id) as reactions_given,
  MAX(GREATEST(
    COALESCE(a.created_at, '1970-01-01'::timestamptz),
    COALESCE(c.created_at, '1970-01-01'::timestamptz),
    COALESCE(r.created_at, '1970-01-01'::timestamptz)
  )) as last_activity
FROM public.profiles p
LEFT JOIN public.announcements a ON p.id = a.created_by
LEFT JOIN public.announcement_comments c ON p.id = c.user_id
LEFT JOIN public.announcement_reactions r ON p.id = r.user_id
GROUP BY p.id, p.full_name, p.role, p.department;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_activity_stats_id 
  ON user_activity_stats(id);

CREATE INDEX IF NOT EXISTS idx_user_activity_stats_last_activity 
  ON user_activity_stats(last_activity DESC);

-- ===== PERFORMANCE MONITORING =====

-- Function to analyze query performance
CREATE OR REPLACE FUNCTION analyze_table_stats()
RETURNS TABLE(
  table_name text,
  row_count bigint,
  table_size text,
  index_size text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname||'.'||tablename as table_name,
    n_tup_ins - n_tup_del as row_count,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size
  FROM pg_stat_user_tables 
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- ===== CLEANUP AND MAINTENANCE =====

-- Function to refresh materialized views (call periodically)
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_activity_stats;
END;
$$ LANGUAGE plpgsql;

-- ===== VACUUM AND ANALYZE RECOMMENDATIONS =====

-- Auto-vacuum settings (these should be set at database level)
-- ALTER TABLE public.announcements SET (autovacuum_vacuum_scale_factor = 0.1);
-- ALTER TABLE public.announcement_comments SET (autovacuum_vacuum_scale_factor = 0.1);
-- ALTER TABLE public.announcement_reactions SET (autovacuum_vacuum_scale_factor = 0.1);

-- ===== SUCCESS MESSAGE =====
SELECT 'Database optimization completed successfully! Added indexes, functions, and materialized views.' as result;

-- ===== USAGE EXAMPLES =====
/*
-- Get announcement statistics
SELECT * FROM get_announcement_stats();

-- Get reaction summary for a specific announcement
SELECT * FROM get_reaction_summary('your-announcement-uuid-here');

-- Analyze table performance
SELECT * FROM analyze_table_stats();

-- Refresh materialized views (run periodically)
SELECT refresh_materialized_views();
*/