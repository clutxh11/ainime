-- Compositions per chapter (one composition per chapter)
-- Safe to run multiple times

DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.compositions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  chapter_id uuid NOT NULL UNIQUE,
  title text,
  thumbnail_url text,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.compositions ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN
  CREATE POLICY compositions_select_all ON public.compositions
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY compositions_insert_auth ON public.compositions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY compositions_update_auth ON public.compositions
    FOR UPDATE USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- FKs
ALTER TABLE public.compositions DROP CONSTRAINT IF EXISTS compositions_project_id_fkey;
ALTER TABLE public.compositions ADD CONSTRAINT compositions_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.compositions DROP CONSTRAINT IF EXISTS compositions_chapter_id_fkey;
ALTER TABLE public.compositions ADD CONSTRAINT compositions_chapter_id_fkey
  FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_compositions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_public_compositions_updated_at ON public.compositions;
CREATE TRIGGER set_public_compositions_updated_at
BEFORE UPDATE ON public.compositions
FOR EACH ROW EXECUTE FUNCTION update_compositions_updated_at();


