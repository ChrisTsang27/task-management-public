-- Add missing task status values to support workflow transitions
-- This migration adds 'blocked', 'on_hold', and 'cancelled' status values

-- Add the missing status values to the task_status enum
ALTER TYPE task_status ADD VALUE 'blocked';
ALTER TYPE task_status ADD VALUE 'on_hold';
ALTER TYPE task_status ADD VALUE 'cancelled';

-- Update any existing tasks that might need these statuses
-- (This is safe since we're only adding new values, not changing existing ones)

-- Add a comment to document the change
COMMENT ON TYPE task_status IS 'Task status enum with all workflow states: awaiting_approval, approved, in_progress, pending_review, rework, done, blocked, on_hold, cancelled';