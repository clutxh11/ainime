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

export interface Storyboard {
  id: string;
  project_id: string;
  chapter_id: string;
  sequence_id: string;
  title?: string;
  thumbnail_url?: string;
  data?: any;
  created_at: string;
  updated_at: string;
}

export async function getStoryboardBySequence(sequenceId: string): Promise<Storyboard | null> {
  const { data, error } = await supabase
    .from("storyboards")
    .select("*")
    .eq("sequence_id", sequenceId)
    .maybeSingle();
  if (error) return null;
  return data as Storyboard | null;
}

export async function createStoryboard(params: {
  projectId: string;
  chapterId: string;
  sequenceId: string;
  title?: string;
  width: number;
  height: number;
}): Promise<Storyboard | null> {
  const payload: any = {
    project_id: params.projectId,
    chapter_id: params.chapterId,
    sequence_id: params.sequenceId,
    title: params.title,
    data: {
      initialized: true,
      width: params.width,
      height: params.height,
      units: "px",
      document: {
        version: 1,
        mode: "storyboard",
      },
    },
  };
  const { data, error } = await supabase
    .from("storyboards")
    .insert(payload)
    .select()
    .single();
  if (error) return null;
  return data as Storyboard;
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


