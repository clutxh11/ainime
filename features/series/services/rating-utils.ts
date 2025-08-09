// Single, consolidated implementation
import { supabase } from "@/lib/supabase";

export interface Rating {
  id: string;
  project_id: string;
  user_id: string;
  rating: number;
  review_text?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithRatings {
  id: string;
  title: string;
  description: string;
  genre: string;
  status: string;
  views: number;
  progress: number;
  image_url?: string;
  square_thumbnail_url?: string;
  horizontal_thumbnail_url?: string;
  creator_id: string;
  created_at: string;
  updated_at: string;
  average_rating: number;
  total_ratings: number;
}

export const getProjectsWithRatings = async (): Promise<ProjectWithRatings[]> => {
  const { data, error } = await supabase
    .from("projects")
    .select(
      `id, title, description, genre, status, image_url, square_thumbnail_url, horizontal_thumbnail_url, creator_id, created_at, updated_at`
    )
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("getProjectsWithRatings error:", error);
    return [];
  }
  return (data || []).map((p) => ({ ...p, average_rating: 0, total_ratings: 0 }));
};

export const getUserRating = async (projectId: string): Promise<number> => {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes?.user?.id;
    if (!userId) return 0;
    const { data, error } = await supabase
      .from("ratings")
      .select("rating")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return 0;
    return data?.rating || 0;
  } catch {
    return 0;
  }
};

export async function submitRating(
  projectId: string,
  rating: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes?.user?.id;
    if (!userId) return { success: false, error: "Not authenticated" };
    const { error } = await supabase
      .from("ratings")
      .upsert({ project_id: projectId, user_id: userId, rating }, { onConflict: "project_id,user_id" });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || "Unknown error" };
  }
}
