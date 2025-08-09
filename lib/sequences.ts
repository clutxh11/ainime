import { supabase } from "@/lib/supabase";

export interface Sequence {
  id: string;
  project_id: string;
  chapter_id: string;
  code: string;
  title?: string;
  description?: string;
  order_index?: number;
  created_at: string;
  updated_at: string;
}

export interface Shot {
  id: string;
  project_id: string;
  chapter_id: string;
  sequence_id: string;
  code: string;
  status?: string;
  assignee_user_id?: string;
  thumbnail_url?: string;
  data?: any;
  created_at: string;
  updated_at: string;
}

export async function listSequences(chapterId: string): Promise<Sequence[]> {
  const { data, error } = await supabase
    .from("sequences")
    .select("*")
    .eq("chapter_id", chapterId)
    .order("order_index", { ascending: true });
  if (error) return [];
  return data || [];
}

export async function createSequence(params: {
  projectId: string;
  chapterId: string;
  code: string;
  title?: string;
  description?: string;
}): Promise<Sequence | null> {
  const { data, error } = await supabase
    .from("sequences")
    .insert({
      project_id: params.projectId,
      chapter_id: params.chapterId,
      code: params.code,
      title: params.title,
      description: params.description,
    })
    .select()
    .single();
  if (error) return null;
  return data as Sequence;
}

export async function listShots(sequenceId: string): Promise<Shot[]> {
  const { data, error } = await supabase
    .from("shots")
    .select("*")
    .eq("sequence_id", sequenceId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return data || [];
}

export async function createShot(params: {
  projectId: string;
  chapterId: string;
  sequenceId: string;
  code: string;
}): Promise<Shot | null> {
  const { data, error } = await supabase
    .from("shots")
    .insert({
      project_id: params.projectId,
      chapter_id: params.chapterId,
      sequence_id: params.sequenceId,
      code: params.code,
      status: "todo",
    })
    .select()
    .single();
  if (error) return null;
  return data as Shot;
}


