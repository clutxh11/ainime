"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MessageCircle,
  Reply,
  Users,
  TrendingUp,
  Search,
  Plus,
  Star,
  Award,
  Flame,
  Pin,
  BarChart3,
  Edit,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ForumPost {
  id: string;
  title: string;
  content: string;
  author_id: string;
  category: string;
  tags: string[];
  likes: number;
  views: number;
  created_at: string;
  updated_at: string;
  users?: {
    username: string;
    avatar_url?: string;
  };
}

export function ForumSection() {
  const [isNewTopicModalOpen, setIsNewTopicModalOpen] = useState(false);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalTopics: 0,
    totalPosts: 0,
    activeMembers: 0,
    onlineNow: 0,
  });

  // Fetch forum data from Supabase
  useEffect(() => {
    fetchForumData();
  }, []);

  const fetchForumData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch forum posts with author information
      const { data: postsData, error: postsError } = await supabase
        .from("forum_posts")
        .select(
          `
          *,
          users!forum_posts_author_id_fkey(username, avatar_url)
        `
        )
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      // Fetch statistics
      const { count: totalTopics } = await supabase
        .from("forum_posts")
        .select("*", { count: "exact", head: true });

      const { count: totalUsers } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true });

      setPosts(postsData || []);
      setStats({
        totalTopics: totalTopics || 0,
        totalPosts: totalTopics || 0, // For now, same as topics
        activeMembers: totalUsers || 0,
        onlineNow: Math.floor((totalUsers || 0) * 0.1), // Estimate 10% online
      });
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching forum data:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 604800)}w ago`;
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-4">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Community Forum</h1>
        <p className="text-gray-400">
          Connect, collaborate, and learn with fellow creators
        </p>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Forum Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {stats.totalTopics}
                  </div>
                  <div className="text-sm text-gray-400">Total Topics</div>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Reply className="w-5 h-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {stats.totalPosts}
                  </div>
                  <div className="text-sm text-gray-400">Total Posts</div>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {stats.activeMembers}
                  </div>
                  <div className="text-sm text-gray-400">Active Members</div>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {stats.onlineNow}
                  </div>
                  <div className="text-sm text-gray-400">Online Now</div>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-gray-800 rounded-2xl p-4 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    placeholder="Search topics, posts, or users..."
                    className="w-full pl-10 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
              <select className="w-full md:w-48 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500">
                <option value="">All Categories</option>
                <option value="general">General Discussion</option>
                <option value="showcase">Creator Showcase</option>
                <option value="collaboration">Collaboration Hub</option>
                <option value="tutorials">Tutorials & Tips</option>
                <option value="feedback">Feedback & Critique</option>
                <option value="technical">Technical Support</option>
              </select>
              <select className="w-full md:w-48 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500">
                <option value="recent">Most Recent</option>
                <option value="popular">Most Popular</option>
                <option value="replies">Most Replies</option>
                <option value="views">Most Views</option>
              </select>
              <Button
                onClick={() => setIsNewTopicModalOpen(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Topic
              </Button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-400">Loading forum posts...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-400">Error loading forum posts: {error}</p>
              <Button
                onClick={fetchForumData}
                variant="outline"
                size="sm"
                className="mt-2 border-red-500 text-red-400 hover:bg-red-500/10"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Forum Posts */}
          {!loading && !error && (
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="bg-gray-800 rounded-2xl p-6 shadow-sm hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-gray-600 text-white">
                        {post.users?.username?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-1">
                            {post.title}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span>
                              by {post.users?.username || "Unknown User"}
                            </span>
                            <span>•</span>
                            <span>{formatTimeAgo(post.created_at)}</span>
                            <span>•</span>
                            <span>{post.category}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {post.tags && post.tags.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {post.tags[0]}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-300 mb-4 line-clamp-2">
                        {post.content}
                      </p>
                      <div className="flex items-center gap-6 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          <span>0 replies</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4" />
                          <span>{post.likes} likes</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BarChart3 className="w-4 h-4" />
                          <span>{post.views} views</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && posts.length === 0 && (
            <div className="text-center py-12">
              <MessageCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                No forum posts found
              </h3>
              <p className="text-gray-400 mb-4">
                Be the first to start a discussion!
              </p>
              <Button
                onClick={() => setIsNewTopicModalOpen(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Post
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Active Users */}
          <div className="bg-gray-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-white mb-4">
              Active Users
            </h3>
            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  <span className="ml-2 text-sm text-gray-400">
                    Loading users...
                  </span>
                </div>
              ) : posts.length > 0 ? (
                // Show unique users from recent posts
                Array.from(
                  new Set(
                    posts.map((post) => post.users?.username).filter(Boolean)
                  )
                )
                  .slice(0, 5)
                  .map((username) => (
                    <div key={username} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm text-gray-300">{username}</span>
                    </div>
                  ))
              ) : (
                <div className="text-sm text-gray-400">No active users</div>
              )}
            </div>
          </div>

          {/* Popular Tags */}
          <div className="bg-gray-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-white mb-4">
              Popular Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {loading ? (
                <div className="flex items-center justify-center py-4 w-full">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  <span className="ml-2 text-sm text-gray-400">
                    Loading tags...
                  </span>
                </div>
              ) : posts.length > 0 ? (
                // Extract unique tags from posts
                Array.from(new Set(posts.flatMap((post) => post.tags || [])))
                  .slice(0, 8)
                  .map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer"
                    >
                      {tag}
                    </Badge>
                  ))
              ) : (
                <div className="text-sm text-gray-400">No tags available</div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-white mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <Button
                onClick={() => setIsNewTopicModalOpen(true)}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Topic
              </Button>
              <Button
                variant="outline"
                className="w-full border-gray-600 text-gray-200 hover:bg-gray-700"
              >
                <Search className="w-4 h-4 mr-2" />
                Search Topics
              </Button>
              <Button
                variant="outline"
                className="w-full border-gray-600 text-gray-200 hover:bg-gray-700"
              >
                <Users className="w-4 h-4 mr-2" />
                Find Collaborators
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* New Topic Modal */}
      {isNewTopicModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-2xl mx-4">
            <h2 className="text-2xl font-bold text-white mb-4">
              Create New Topic
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  placeholder="Enter your topic title..."
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <select className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="">Select a category</option>
                  <option value="general">General Discussion</option>
                  <option value="showcase">Creator Showcase</option>
                  <option value="collaboration">Collaboration Hub</option>
                  <option value="tutorials">Tutorials & Tips</option>
                  <option value="feedback">Feedback & Critique</option>
                  <option value="technical">Technical Support</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Content
                </label>
                <textarea
                  placeholder="Write your post content..."
                  rows={6}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g., animation, tutorial, collaboration"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setIsNewTopicModalOpen(false)}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-200 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700">
                Create Topic
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
