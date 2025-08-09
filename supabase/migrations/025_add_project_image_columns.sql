-- Ensure image URL columns exist on projects for Viewer Hub

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS square_thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS horizontal_thumbnail_url TEXT;

-- No RLS changes needed (RLS is row-based). Columns inherit existing SELECT policy.


