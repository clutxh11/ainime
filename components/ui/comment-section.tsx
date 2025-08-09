import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, ThumbsUp, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ContentComment } from "@/types/database";
import { useAuth } from "@/components/auth/auth-provider";
import { getUserProfiles, UserProfile } from "@/lib/user-utils";

interface CommentSectionProps {
  contentType: "project" | "chapter" | "episode";
  contentId: string;
  title?: string;
  projectId?: string; // Add projectId for better project filtering
}

export function CommentSection({
  contentType,
  contentId,
  title,
  projectId,
}: CommentSectionProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<{ [key: string]: any }>({});
  const { user } = useAuth();

  // Fetch comments based on content type
  useEffect(() => {
    fetchComments();
  }, [contentType, contentId, projectId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      let commentData: any[] = [];

      if (contentType === "project") {
        const { data, error } = await supabase
          .from("project_comments")
          .select("*")
          .eq("project_id", projectId || contentId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) {
          console.error("Error fetching comments:", error);
          throw error;
        }

        commentData = data || [];
      } else if (contentType === "chapter") {
        const { data, error } = await supabase
          .from("chapter_comments")
          .select("*")
          .eq("chapter_id", contentId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) {
          console.error("Error fetching comments:", error);
          throw error;
        }

        commentData = data || [];
      } else if (contentType === "episode") {
        const { data, error } = await supabase
          .from("animated_chapter_comments")
          .select("*")
          .eq("animated_chapter_id", contentId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) {
          console.error("Error fetching comments:", error);
          throw error;
        }

        commentData = data || [];
      }

      // Fetch user details for all comment authors
      const userIds = [
        ...new Set(commentData.map((c) => c.author_id).filter(Boolean)),
      ];

      // Fetch user profiles from the public view
      const userDetailsMap = await getUserProfiles(userIds);
      setUserDetails(userDetailsMap);
      setComments(commentData);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      setError("Please sign in to comment");
      return;
    }

    if (!newComment.trim()) {
      setError("Please enter a comment");
      return;
    }

    const authorId = user.id;

    try {
      setSubmitting(true);
      setError(null);

      if (contentType === "project") {
        // Create project comment
        const insertData = {
          content: newComment,
          author_id: authorId,
          project_id: projectId || contentId,
        };

        console.log("Inserting project comment:", insertData);

        const { error } = await supabase
          .from("project_comments")
          .insert(insertData);

        if (error) {
          console.error("Project comment error:", error);
          throw error;
        }
      } else if (contentType === "chapter") {
        // Create chapter comment
        const insertData = {
          content: newComment,
          author_id: authorId,
          chapter_id: contentId,
        };

        console.log("Inserting chapter comment:", insertData);

        const { error } = await supabase
          .from("chapter_comments")
          .insert(insertData);

        if (error) {
          console.error("Chapter comment error:", error);
          throw error;
        }
      } else if (contentType === "episode") {
        // Create animated chapter comment
        const insertData = {
          content: newComment,
          author_id: authorId,
          animated_chapter_id: contentId,
        };

        console.log("Inserting animated chapter comment:", insertData);

        const { error } = await supabase
          .from("animated_chapter_comments")
          .insert(insertData);

        if (error) {
          console.error("Animated chapter comment error:", error);
          throw error;
        }
      }

      setNewComment("");
      await fetchComments(); // Refresh comments and user details
    } catch (err: any) {
      console.error("Error submitting comment:", err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getDisplayName = (comment: any) => {
    if (!comment.author_id) {
      return "Anonymous";
    }

    // If this is the current user's comment, show their display name
    if (user && comment.author_id === user.id) {
      return (
        user.user_metadata?.full_name || user.email?.split("@")[0] || "You"
      );
    }

    // Check if we have user details for this author
    const authorDetails = userDetails[comment.author_id];
    if (authorDetails) {
      return (
        authorDetails.display_name ||
        authorDetails.email?.split("@")[0] ||
        "User"
      );
    }

    // Fallback to a generic name
    return `User ${comment.author_id.substring(0, 8)}`;
  };

  const getSectionTitle = () => {
    switch (contentType) {
      case "project":
        return "Community Discussion";
      case "chapter":
        return "Chapter Comments";
      case "episode":
        return "Episode Comments";
      default:
        return "Comments";
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">{getSectionTitle()}</h3>

      {/* Comment Input */}
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <MessageCircle className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300">
            {contentType === "project"
              ? "Join the conversation"
              : "Add a comment"}
          </span>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Share your thoughts..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="bg-gray-600 border-gray-500 text-white flex-1"
            onKeyPress={(e) => e.key === "Enter" && handleSubmitComment()}
          />
          <Button
            onClick={handleSubmitComment}
            disabled={submitting || !newComment.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            <span className="text-gray-400 text-sm ml-2">
              Loading comments...
            </span>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-4">
            <MessageCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">
              {contentType === "project"
                ? "No discussions yet"
                : "No comments yet"}
            </p>
            <p className="text-gray-500 text-xs">
              {contentType === "project"
                ? "Be the first to start a conversation!"
                : "Be the first to comment!"}
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-white text-sm">
                  {getDisplayName(comment)}
                </span>
                <span className="text-xs text-gray-400">
                  {formatTimeAgo(comment.created_at)}
                </span>
              </div>
              <p className="text-gray-300 text-sm mb-2">
                {contentType === "project" ? comment.content : comment.content}
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3" />
                  <span>{comment.likes}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  <span>Reply</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
