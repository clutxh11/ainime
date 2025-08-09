-- Sequences and Shots minimal schema for chapter → sequence → shot workflow
-- Safe to run multiple times: guard with IF NOT EXISTS

-- Enable pgcrypto for gen_random_uuid if not already
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Sequences
CREATE TABLE IF NOT EXISTS public.sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  chapter_id uuid NOT NULL,
  code text NOT NULL,
  title text,
  description text,
  order_index integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Basic helper index and uniqueness per chapter
CREATE UNIQUE INDEX IF NOT EXISTS sequences_unique_code_per_chapter
  ON public.sequences(chapter_id, code);
CREATE INDEX IF NOT EXISTS sequences_chapter_idx ON public.sequences(chapter_id);

-- Shots
CREATE TABLE IF NOT EXISTS public.shots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  chapter_id uuid NOT NULL,
  sequence_id uuid NOT NULL,
  code text NOT NULL,
  status text DEFAULT 'todo',
  assignee_user_id uuid,
  thumbnail_url text,
  data jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS shots_unique_code_per_sequence
  ON public.shots(sequence_id, code);
CREATE INDEX IF NOT EXISTS shots_sequence_idx ON public.shots(sequence_id);
CREATE INDEX IF NOT EXISTS shots_chapter_idx ON public.shots(chapter_id);

-- RLS
ALTER TABLE public.sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shots ENABLE ROW LEVEL SECURITY;

-- Allow read for all authenticated
DO $$ BEGIN
  CREATE POLICY sequences_select ON public.sequences
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY shots_select ON public.shots
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow insert/update by authenticated users for now (tighten later)
DO $$ BEGIN
  CREATE POLICY sequences_ins_upd ON public.sequences
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY shots_ins_upd ON public.shots
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Updated-at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER set_sequences_updated_at
  BEFORE UPDATE ON public.sequences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER set_shots_updated_at
  BEFORE UPDATE ON public.shots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


