-- Add AI-powered task prioritization features
-- Run this in Supabase SQL Editor

-- Add AI prioritization columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS priority_score DECIMAL(5,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS ai_insights JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS complexity_score INTEGER DEFAULT 1 CHECK (complexity_score >= 1 AND complexity_score <= 10),
ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS dependencies JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ai_last_updated TIMESTAMPTZ;

-- Create index for priority-based queries
CREATE INDEX IF NOT EXISTS idx_tasks_priority_score 
  ON public.tasks(priority_score DESC, created_at DESC);

-- Create index for AI insights queries
CREATE INDEX IF NOT EXISTS idx_tasks_ai_insights 
  ON public.tasks USING GIN(ai_insights);

-- Create index for complexity-based queries
CREATE INDEX IF NOT EXISTS idx_tasks_complexity 
  ON public.tasks(complexity_score DESC, due_date ASC);

-- Create index for dependency tracking
CREATE INDEX IF NOT EXISTS idx_tasks_dependencies 
  ON public.tasks USING GIN(dependencies);

-- Create index for tag-based filtering
CREATE INDEX IF NOT EXISTS idx_tasks_tags 
  ON public.tasks USING GIN(tags);

-- Create function to calculate AI priority score
CREATE OR REPLACE FUNCTION calculate_ai_priority_score(
  task_due_date DATE,
  task_complexity INTEGER,
  task_created_at TIMESTAMPTZ,
  task_dependencies JSONB,
  team_workload INTEGER DEFAULT 5
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  urgency_score DECIMAL(5,2) := 0.0;
  complexity_weight DECIMAL(5,2) := 0.0;
  age_factor DECIMAL(5,2) := 0.0;
  dependency_factor DECIMAL(5,2) := 0.0;
  workload_factor DECIMAL(5,2) := 0.0;
  final_score DECIMAL(5,2) := 0.0;
BEGIN
  -- Calculate urgency based on due date (0-40 points)
  IF task_due_date IS NOT NULL THEN
    urgency_score := GREATEST(0, 40 - EXTRACT(DAY FROM (task_due_date - CURRENT_DATE)) * 2);
  ELSE
    urgency_score := 10; -- Default for tasks without due date
  END IF;
  
  -- Calculate complexity weight (0-25 points)
  complexity_weight := (task_complexity * 2.5);
  
  -- Calculate age factor (0-20 points)
  age_factor := LEAST(20, EXTRACT(DAY FROM (NOW() - task_created_at)) * 0.5);
  
  -- Calculate dependency factor (0-10 points)
  dependency_factor := LEAST(10, jsonb_array_length(task_dependencies) * 2);
  
  -- Calculate team workload factor (0-5 points)
  workload_factor := GREATEST(0, 5 - (team_workload * 0.5));
  
  -- Calculate final score (0-100)
  final_score := urgency_score + complexity_weight + age_factor + dependency_factor + workload_factor;
  
  RETURN LEAST(100.0, final_score);
END;
$$ LANGUAGE plpgsql;

-- Create function to update AI insights
CREATE OR REPLACE FUNCTION update_task_ai_insights(
  task_id UUID,
  insights JSONB
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.tasks 
  SET 
    ai_insights = insights,
    ai_last_updated = NOW()
  WHERE id = task_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to get AI-prioritized tasks
CREATE OR REPLACE FUNCTION get_ai_prioritized_tasks(
  team_uuid UUID DEFAULT NULL,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  status task_status,
  priority_score DECIMAL(5,2),
  complexity_score INTEGER,
  due_date DATE,
  assignee_name TEXT,
  ai_insights JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.status,
    t.priority_score,
    t.complexity_score,
    t.due_date,
    p.full_name as assignee_name,
    t.ai_insights
  FROM public.tasks t
  LEFT JOIN public.profiles p ON t.assignee_id = p.id
  WHERE (team_uuid IS NULL OR t.team_id = team_uuid)
    AND t.status NOT IN ('done')
  ORDER BY t.priority_score DESC, t.due_date ASC NULLS LAST
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate priority score on task changes
CREATE OR REPLACE FUNCTION auto_update_priority_score()
RETURNS TRIGGER AS $$
DECLARE
  team_task_count INTEGER;
BEGIN
  -- Get current team workload
  SELECT COUNT(*) INTO team_task_count
  FROM public.tasks 
  WHERE team_id = NEW.team_id 
    AND status IN ('approved', 'in_progress', 'pending_review');
  
  -- Calculate and update priority score
  NEW.priority_score := calculate_ai_priority_score(
    NEW.due_date,
    COALESCE(NEW.complexity_score, 1),
    NEW.created_at,
    COALESCE(NEW.dependencies, '[]'::jsonb),
    team_task_count
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating priority scores
CREATE TRIGGER trg_auto_update_priority_score
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_priority_score();

-- Update existing tasks with initial priority scores
UPDATE public.tasks 
SET 
  priority_score = calculate_ai_priority_score(
    due_date,
    1, -- default complexity
    created_at,
    '[]'::jsonb, -- no dependencies initially
    5 -- default team workload
  ),
  complexity_score = 1,
  ai_insights = '{"auto_generated": true, "initial_score": true}'::jsonb,
  ai_last_updated = NOW()
WHERE priority_score IS NULL;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_ai_priority_score TO authenticated;
GRANT EXECUTE ON FUNCTION update_task_ai_insights TO authenticated;
GRANT EXECUTE ON FUNCTION get_ai_prioritized_tasks TO authenticated;

-- Add comments for documentation
COMMENT ON COLUMN public.tasks.priority_score IS 'AI-calculated priority score (0-100)';
COMMENT ON COLUMN public.tasks.ai_insights IS 'JSON object containing AI-generated insights and recommendations';
COMMENT ON COLUMN public.tasks.complexity_score IS 'Task complexity rating (1-10 scale)';
COMMENT ON COLUMN public.tasks.estimated_hours IS 'AI-estimated hours to complete the task';
COMMENT ON COLUMN public.tasks.dependencies IS 'Array of task IDs that this task depends on';
COMMENT ON COLUMN public.tasks.tags IS 'Array of tags for categorization and filtering';
COMMENT ON COLUMN public.tasks.ai_last_updated IS 'Timestamp when AI insights were last updated';

-- Verify the migration
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'tasks' 
  AND table_schema = 'public'
  AND column_name IN ('priority_score', 'ai_insights', 'complexity_score', 'estimated_hours', 'dependencies', 'tags', 'ai_last_updated')
ORDER BY ordinal_position;