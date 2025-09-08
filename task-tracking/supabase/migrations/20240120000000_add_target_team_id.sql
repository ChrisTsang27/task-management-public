-- Add target_team_id column to tasks table for assistance requests
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS target_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.tasks.target_team_id IS 'References the team being requested for assistance when is_request is true';