-- Add predefined teams for team-specific kanban boards
-- Run this in Supabase SQL Editor

-- Insert predefined teams
INSERT INTO public.teams (id, name, created_at) VALUES
  (gen_random_uuid(), 'IT Team', NOW()),
  (gen_random_uuid(), 'Sales Team', NOW()),
  (gen_random_uuid(), 'Marketing Team', NOW()),
  (gen_random_uuid(), 'Design Team', NOW()),
  (gen_random_uuid(), 'HR Team', NOW()),
  (gen_random_uuid(), 'Finance Team', NOW())
ON CONFLICT (name) DO NOTHING;

-- Verify teams were created
SELECT id, name, created_at FROM public.teams ORDER BY name;