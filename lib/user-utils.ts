import { supabase } from "./supabase";

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
}

export async function getUserProfiles(
  userIds: string[]
): Promise<{ [key: string]: UserProfile }> {
  if (userIds.length === 0) return {};

  try {
    const { data, error } = await supabase
      .from("user_profiles_public")
      .select("*")
      .in("id", userIds);

    if (error) {
      console.error("Error fetching user profiles:", error);
      return {};
    }

    const userMap: { [key: string]: UserProfile } = {};
    data?.forEach((user) => {
      userMap[user.id] = user;
    });

    return userMap;
  } catch (error) {
    console.error("Error in getUserProfiles:", error);
    return {};
  }
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
      .from("user_profiles_public")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching current user profile:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getCurrentUserProfile:", error);
    return null;
  }
}
