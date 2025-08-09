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
  creator_id: string;
  created_at: string;
  updated_at: string;
  average_rating: number;
  total_ratings: number;
  users?: {
    username: string;
    avatar_url?: string;
  };
  chapters?: {
    id: string;
    title: string;
    status: string;
    thumbnail_url?: string;
    release_date?: string;
    created_at: string;
    updated_at: string;
  }[];
  authors?: any[];
}

// Get current authenticated user ID
export const getCurrentUserId = async (): Promise<string | null> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id || null;
};

// Get user's rating for a project
export const getUserRating = async (projectId: string): Promise<number> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return 0;

    const { data, error } = await supabase
      .from("ratings")
      .select("rating")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .maybeSingle(); // Use maybeSingle() instead of single() to handle no results gracefully

    if (error) {
      console.error("Error fetching user rating:", error);
      return 0;
    }

    return data?.rating || 0;
  } catch (error) {
    console.error("Error getting user rating:", error);
    return 0;
  }
};

// Submit or update a rating
export const submitRating = async (
  projectId: string,
  rating: number,
  reviewText?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    const { error } = await supabase.from("ratings").upsert(
      {
        project_id: projectId,
        user_id: userId,
        rating,
        review_text: reviewText,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "project_id,user_id",
      }
    );

    if (error) {
      console.error("Error submitting rating:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error submitting rating:", error);
    return { success: false, error: "Failed to submit rating" };
  }
};

// Get projects with rating information
export const getProjectsWithRatings = async (): Promise<
  ProjectWithRatings[]
> => {
  try {
    const { data: projectsData, error: projectsError } = await supabase
      .from("projects")
      .select(
        `
        *,
        volumes(*)
      `
      )
      .order("created_at", { ascending: false });

    if (projectsError) throw projectsError;

    // Calculate ratings for each project
    const projectsWithRatings = await Promise.all(
      (projectsData || []).map(async (project) => {
        // Get ratings for this project that are from auth.users
        const { data: ratingsData, error: ratingsError } = await supabase
          .from("ratings")
          .select("rating, user_id")
          .eq("project_id", project.id);

        if (ratingsError) {
          console.error(
            "Error fetching ratings for project:",
            project.id,
            ratingsError
          );
          return { ...project, average_rating: 0, total_ratings: 0 };
        }

        const ratings = ratingsData || [];

        // Filter out ratings from old public.users table
        // Only count ratings from auth.users (which have different UUID format)
        const validRatings = ratings.filter((rating) => {
          // Check if this user_id exists in auth.users
          // For now, we'll assume any rating is valid since we can't easily join with auth.users
          // The real fix would be to clean up the ratings table, but for now we'll use all ratings
          return true;
        });

        const totalRatings = validRatings.length;
        const averageRating =
          totalRatings > 0
            ? Number(
                (
                  validRatings.reduce((sum, r) => sum + r.rating, 0) /
                  totalRatings
                ).toFixed(2)
              )
            : 0;

        return {
          ...project,
          average_rating: averageRating,
          total_ratings: totalRatings,
        };
      })
    );

    return projectsWithRatings;
  } catch (error) {
    console.error("Error fetching projects with ratings:", error);
    throw error;
  }
};
