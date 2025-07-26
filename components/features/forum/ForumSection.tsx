"use client";

import { useState } from "react";
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
} from "lucide-react";

interface ForumPost {
  id: string;
  title: string;
  author: string;
  tags: string[];
  replies: number;
  likes: number;
  timeAgo: string;
  content: string;
}

const mockForumPosts: ForumPost[] = [
  {
    id: "1",
    title: "Looking for experienced storyboard artists for Dragon's Legacy",
    author: "SakuraArt",
    tags: ["Team Recruiting", "Storyboard"],
    replies: 23,
    likes: 45,
    timeAgo: "2h ago",
    content:
      "We're working on Chapter 3 and need help with complex action sequences...",
  },
  {
    id: "2",
    title: "Best practices for frame-by-frame animation in digital format",
    author: "AnimatorPro",
    tags: ["Tutorial", "Animation"],
    replies: 156,
    likes: 342,
    timeAgo: "1d ago",
    content:
      "I've been working on digital animation for 5 years and here are my top tips...",
  },
  {
    id: "3",
    title: "Showcase: My latest animation project - 'The Last Samurai'",
    author: "CreativeMind",
    tags: ["Showcase", "Completed"],
    replies: 89,
    likes: 567,
    timeAgo: "3d ago",
    content:
      "After 6 months of hard work, I'm excited to share my latest project...",
  },
  {
    id: "4",
    title: "Collaboration request: Voice actors needed for fantasy series",
    author: "VoiceDirector",
    tags: ["Collaboration", "Voice Acting"],
    replies: 34,
    likes: 78,
    timeAgo: "5d ago",
    content:
      "We're looking for talented voice actors for our upcoming fantasy series...",
  },
  {
    id: "5",
    title: "Technical question: How to optimize animation files for web",
    author: "TechAnimator",
    tags: ["Technical", "Optimization"],
    replies: 67,
    likes: 123,
    timeAgo: "1w ago",
    content:
      "I'm having trouble with file sizes when exporting animations for web...",
  },
];

export function ForumSection() {
  const [isNewTopicModalOpen, setIsNewTopicModalOpen] = useState(false);

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
                  <div className="text-2xl font-bold text-white">3,852</div>
                  <div className="text-sm text-gray-400">Total Topics</div>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Reply className="w-5 h-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold text-white">22,553</div>
                  <div className="text-sm text-gray-400">Total Posts</div>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold text-white">1,247</div>
                  <div className="text-sm text-gray-400">Active Members</div>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold text-white">156</div>
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

          {/* Forum Posts */}
          <div className="space-y-4">
            {mockForumPosts.map((post) => (
              <div
                key={post.id}
                className="bg-gray-800 rounded-2xl p-6 shadow-sm hover:bg-gray-750 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-gray-600 text-white">
                      {post.author.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-white hover:text-red-400 cursor-pointer">
                        {post.title}
                      </h3>
                      {post.tags.includes("Showcase") && (
                        <Star className="w-4 h-4 text-yellow-500" />
                      )}
                      {post.tags.includes("Tutorial") && (
                        <Award className="w-4 h-4 text-blue-500" />
                      )}
                      {post.likes > 100 && (
                        <Flame className="w-4 h-4 text-orange-500" />
                      )}
                      {post.tags.includes("Team Recruiting") && (
                        <Pin className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                      {post.content}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>by {post.author}</span>
                        <span>{post.timeAgo}</span>
                        <div className="flex items-center gap-1">
                          <Reply className="w-3 h-3" />
                          {post.replies}
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          {post.likes}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {post.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs bg-gray-700 text-gray-300"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Active Users */}
          <div className="bg-gray-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-white mb-4">
              Active Users
            </h3>
            <div className="space-y-3">
              {[
                { name: "SakuraArt", status: "online" },
                { name: "AnimatorPro", status: "online" },
                { name: "CreativeMind", status: "away" },
                { name: "VoiceDirector", status: "online" },
                { name: "TechAnimator", status: "offline" },
              ].map((user) => (
                <div key={user.name} className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      user.status === "online"
                        ? "bg-green-500"
                        : user.status === "away"
                        ? "bg-yellow-500"
                        : "bg-gray-500"
                    }`}
                  />
                  <span className="text-sm text-gray-300">{user.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Forum Guidelines */}
          <div className="bg-gray-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-white mb-4">
              Forum Guidelines
            </h3>
            <div className="space-y-3 text-sm text-gray-300">
              <div>• Be respectful and constructive</div>
              <div>• Share your work and get feedback</div>
              <div>• Ask questions and help others</div>
              <div>• No spam or self-promotion</div>
              <div>• Keep discussions on-topic</div>
            </div>
          </div>

          {/* User Stats */}
          <div className="bg-gray-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-white mb-4">
              Your Activity
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Topics Created</span>
                <span className="text-white font-semibold">12</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Replies Posted</span>
                <span className="text-white font-semibold">89</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Likes Received</span>
                <span className="text-white font-semibold">234</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Member Since</span>
                <span className="text-white font-semibold">Mar 2024</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
