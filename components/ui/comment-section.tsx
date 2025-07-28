import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, ThumbsUp, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ContentComment } from "@/types/database";

interface CommentSectionProps {
  contentType: "project" | "chapter" | "episode";
  contentId: string;
  title?: string;
}

export function CommentSection({
  contentType,
  contentId,
  title,
}: CommentSectionProps) {
  const [comments, setComments] = useState<ContentComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch comments based on content type
  useEffect(() => {
    fetchComments();
  }, [contentType, contentId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      setError(null);

      if (contentType === "project") {
        // For project-level, fetch forum posts related to the project
        const { data, error } = await supabase
          .from("forum_posts")
          .select(
            `
            *,
            users!forum_posts_author_id_fkey(username, avatar_url)
          `
          )
          .eq("category", "Project Discussion")
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) throw error;
        setComments(data || []);
      } else {
        // For chapter/episode specific comments
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

        if (error) throw error;
        setComments(data || []);
      }
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching comments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      setError(null);

      if (contentType === "project") {
        // Create a forum post for project discussion
        const { error } = await supabase.from("forum_posts").insert({
          title: `Comment on ${title || "Project"}`,
          content: newComment,
          author_id: "1", // TODO: Get from auth
          category: "Project Discussion",
          tags: ["project-comment"],
        });

        if (error) throw error;
      } else {
        // Create a content-specific comment
        const { error } = await supabase.from("content_comments").insert({
          content_type: contentType,
          content_id: contentId,
          author_id: "1", // TODO: Get from auth
          content: newComment,
        });

        if (error) throw error;
      }

      setNewComment("");
      fetchComments(); // Refresh comments
    } catch (err: any) {
      setError(err.message);
      console.error("Error submitting comment:", err);
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
                  {comment.users?.username || "Anonymous"}
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
