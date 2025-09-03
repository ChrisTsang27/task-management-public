-- Add pinned field to announcements table
ALTER TABLE public.announcements 
ADD COLUMN pinned boolean NOT NULL DEFAULT false;

-- Create index for better performance when querying pinned announcements
CREATE INDEX idx_announcements_pinned ON public.announcements(pinned, created_at DESC);

-- Update RLS policies to allow admins to pin/unpin announcements
-- The existing policies should already cover this, but let's ensure pin updates are allowed
DROP POLICY IF EXISTS "ann_update" ON public.announcements;
CREATE POLICY "ann_update" ON public.announcements FOR UPDATE 
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Success message
SELECT 'Pinned field added to announcements table successfully!' as result;