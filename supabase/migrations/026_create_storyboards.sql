-- Storyboards per sequence (one storyboard per sequence)
-- Safe to run repeatedly

DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.storyboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  chapter_id uuid NOT NULL,
  sequence_id uuid NOT NULL UNIQUE,
  title text,
  thumbnail_url text,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.storyboards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "storyboards select all" ON public.storyboards;
CREATE POLICY "storyboards select all" ON public.storyboards FOR SELECT USING (true);

DROP POLICY IF EXISTS "storyboards insert auth" ON public.storyboards;
CREATE POLICY "storyboards insert auth" ON public.storyboards FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "storyboards update auth" ON public.storyboards;
CREATE POLICY "storyboards update auth" ON public.storyboards FOR UPDATE USING (auth.role() = 'authenticated');

-- FKs
ALTER TABLE public.storyboards DROP CONSTRAINT IF EXISTS storyboards_project_id_fkey;
ALTER TABLE public.storyboards ADD CONSTRAINT storyboards_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.storyboards DROP CONSTRAINT IF EXISTS storyboards_chapter_id_fkey;
ALTER TABLE public.storyboards ADD CONSTRAINT storyboards_chapter_id_fkey
  FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;

ALTER TABLE public.storyboards DROP CONSTRAINT IF EXISTS storyboards_sequence_id_fkey;
ALTER TABLE public.storyboards ADD CONSTRAINT storyboards_sequence_id_fkey
  FOREIGN KEY (sequence_id) REFERENCES public.sequences(id) ON DELETE CASCADE;

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_storyboards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_public_storyboards_updated_at ON public.storyboards;
CREATE TRIGGER set_public_storyboards_updated_at
BEFORE UPDATE ON public.storyboards
FOR EACH ROW EXECUTE FUNCTION update_storyboards_updated_at();


