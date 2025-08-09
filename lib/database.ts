import { supabase } from "./supabase";
import type { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];

// User operations
export async function createUser(userData: Tables["users"]["Insert"]) {
  const { data, error } = await supabase
    .from("users")
    .insert(userData)
    .select()
    .single();

  return { data, error };
}

export async function getUserById(id: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  return { data, error };
}

export async function updateUser(
  id: string,
  updates: Tables["users"]["Update"]
) {
  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  return { data, error };
}

// Project operations
export async function createProject(projectData: Tables["projects"]["Insert"]) {
  const { data, error } = await supabase
    .from("projects")
    .insert(projectData)
    .select()
    .single();

  return { data, error };
}

export async function getProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select(
      `
      *,
      volumes(*)
    `
    )
    .order("created_at", { ascending: false });

  return { data, error };
}

export async function getProjectById(id: string) {
  const { data, error } = await supabase
    .from("projects")
    .select(
      `
      *,
      volumes(
        *,
        chapters(*)
      )
    `
    )
    .eq("id", id)
    .single();

  return { data, error };
}

export async function updateProject(
  id: string,
  updates: Tables["projects"]["Update"]
) {
  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  return { data, error };
}

export async function deleteProject(id: string) {
  const { error } = await supabase.from("projects").delete().eq("id", id);

  return { error };
}

// Team operations
export async function createTeam(teamData: Tables["teams"]["Insert"]) {
  const { data, error } = await supabase
    .from("teams")
    .insert(teamData)
    .select()
    .single();

  return { data, error };
}

export async function getTeamsByProject(projectId: string) {
  const { data, error } = await supabase
    .from("teams")
    .select(
      `
      *,
      users!teams_leader_id_fkey(username, avatar_url),
      team_members(
        *,
        users!team_members_user_id_fkey(username, avatar_url)
      )
    `
    )
    .eq("project_id", projectId);

  return { data, error };
}

export async function addTeamMember(
  memberData: Tables["team_members"]["Insert"]
) {
  const { data, error } = await supabase
    .from("team_members")
    .insert(memberData)
    .select()
    .single();

  return { data, error };
}

export async function removeTeamMember(teamId: string, userId: string) {
  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", userId);

  return { error };
}

// Chapter operations
export async function createChapter(chapterData: Tables["chapters"]["Insert"]) {
  const { data, error } = await supabase
    .from("chapters")
    .insert(chapterData)
    .select()
    .single();

  return { data, error };
}

export async function getChaptersByProject(projectId: string) {
  const { data, error } = await supabase
    .from("chapters")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  return { data, error };
}

export async function updateChapter(
  id: string,
  updates: Tables["chapters"]["Update"]
) {
  const { data, error } = await supabase
    .from("chapters")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  return { data, error };
}

// Forum operations
export async function createForumPost(
  postData: Tables["forum_posts"]["Insert"]
) {
  const { data, error } = await supabase
    .from("forum_posts")
    .insert(postData)
    .select()
    .single();

  return { data, error };
}

export async function getForumPosts() {
  const { data, error } = await supabase
    .from("forum_posts")
    .select(
      `
      *,
      users!forum_posts_author_id_fkey(username, avatar_url)
    `
    )
    .order("created_at", { ascending: false });

  return { data, error };
}

export async function updateForumPost(
  id: string,
  updates: Tables["forum_posts"]["Update"]
) {
  const { data, error } = await supabase
    .from("forum_posts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  return { data, error };
}

// Animation project operations
export async function createAnimationProject(
  projectData: Tables["animation_projects"]["Insert"]
) {
  const { data, error } = await supabase
    .from("animation_projects")
    .insert(projectData)
    .select()
    .single();

  return { data, error };
}

export async function getAnimationProjectsByUser(userId: string) {
  const { data, error } = await supabase
    .from("animation_projects")
    .select("*")
    .eq("creator_id", userId)
    .order("created_at", { ascending: false });

  return { data, error };
}

export async function updateAnimationProject(
  id: string,
  updates: Tables["animation_projects"]["Update"]
) {
  const { data, error } = await supabase
    .from("animation_projects")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  return { data, error };
}

export async function deleteAnimationProject(id: string) {
  const { error } = await supabase
    .from("animation_projects")
    .delete()
    .eq("id", id);

  return { error };
}

// Content Comments (Chapter/Episode specific)
export async function getContentComments(
  contentType: "chapter" | "episode",
  contentId: string
) {
  const { data, error } = await supabase
    .from("content_comments")
    .select(
      `
      *,
      users!content_comments_author_id_fkey(username, avatar_url)
    `
    )
    .eq("content_type", contentType)
    .eq("content_id", contentId)
    .order("created_at", { ascending: false });

  return { data, error };
}

export async function createContentComment(comment: ContentCommentInsert) {
  const { data, error } = await supabase
    .from("content_comments")
    .insert(comment)
    .select()
    .single();

  return { data, error };
}

export async function updateContentComment(
  id: string,
  updates: ContentCommentUpdate
) {
  const { data, error } = await supabase
    .from("content_comments")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  return { data, error };
}

export async function deleteContentComment(id: string) {
  const { error } = await supabase
    .from("content_comments")
    .delete()
    .eq("id", id);

  return { error };
}
