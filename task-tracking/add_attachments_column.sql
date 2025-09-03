-- Add attachments column to announcements table
-- This column will store JSON data for file attachments

ALTER TABLE public.announcements 
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- Add a comment to document the column
COMMENT ON COLUMN public.announcements.attachments IS 'JSON array of attachment objects with url, name, size, type, and path properties';

SELECT 'Attachments column added successfully!' as result;