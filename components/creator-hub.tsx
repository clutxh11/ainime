"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ProfileModal } from "@/components/profile-modal";
import {
  ArrowLeft,
  Users,
  MessageSquare,
  Filter,
  ThumbsUp,
  CalendarIcon,
  Upload,
  Play,
  Eye,
  Search,
  Plus,
} from "lucide-react";
import type { CurrentView } from "@/types";
import { ViewTeamsModal } from "@/components/view-teams-modal";
import { ProfileDropdown } from "@/components/shared/profile-dropdown";
import { SettingsModal } from "@/components/settings-modal";
import { ContributionsModal } from "@/components/contributions-modal";
import { mockProjects, getTeamCountForProject } from "@/lib/team-data";

interface CreatorHubProps {
  onViewChange: (view: CurrentView, params?: any) => void;
}

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

interface LibraryItem {
  id: string;
  title: string;
  type: "manga" | "animation";
  status: "draft" | "under-review" | "approved" | "published";
  views?: number;
  createdAt: string;
  thumbnail: string;
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
    title: "Animation techniques for smooth character movement",
    author: "ArtMaster",
    tags: ["Animation Techniques", "Tutorial"],
    replies: 67,
    likes: 128,
    timeAgo: "5h ago",
    content:
      "Here are some tips I've learned for creating fluid character animations...",
  },
];

const mockMangaSubmissions = [
  {
    id: "1",
    title: "My Original Series - Volume 1",
    chapters: ["Chapter 1", "Chapter 2", "Chapter 3"],
    status: "published",
    views: 1247,
    createdAt: "2 weeks ago",
    thumbnail: "/placeholder.svg?height=150&width=100",
  },
  {
    id: "2",
    title: "My Original Series - Volume 2",
    chapters: ["Chapter 4", "Chapter 5"],
    status: "under-review",
    createdAt: "1 week ago",
    thumbnail: "/placeholder.svg?height=150&width=100",
  },
];

const mockAnimationSaves = [
  {
    id: "1",
    title: "Dragon's Legacy - Chapter 1 Animation",
    mangaChapter: "Chapter 1: The Awakening",
    status: "published",
    createdAt: "3 days ago",
    thumbnail: "/placeholder.svg?height=150&width=100",
  },
  {
    id: "2",
    title: "Cyber Samurai - Chapter 2 Animation",
    mangaChapter: "Chapter 2: Corporate War",
    status: "draft",
    createdAt: "1 day ago",
    thumbnail: "/placeholder.svg?height=150&width=100",
  },
];

export function CreatorHub({ onViewChange }: CreatorHubProps) {
  const [activeTab, setActiveTab] = useState("explore");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isContributionsModalOpen, setIsContributionsModalOpen] =
    useState(false);
  const [isViewTeamsModalOpen, setIsViewTeamsModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // Scene creation settings
  const [sceneName, setSceneName] = useState("New Scene");
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [canvasHeight, setCanvasHeight] = useState(600);
  const [frameRate, setFrameRate] = useState(24);

  const handleOpenEditor = () => {
    // Pass scene settings to animation editor
    onViewChange("animation-editor", {
      sceneName,
      canvasWidth,
      canvasHeight,
      frameRate,
    });
  };
  const [selectedProjectTitle, setSelectedProjectTitle] = useState("");

  const handleViewTeamsClick = (projectId: string, projectTitle: string) => {
    setSelectedProjectId(projectId);
    setSelectedProjectTitle(projectTitle);
    setIsViewTeamsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation Bar */}
      <nav className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Button
                variant="ghost"
                onClick={() => onViewChange("viewer")}
                className="text-gray-300 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
              <div className="text-2xl font-bold text-red-500">Creator Hub</div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                className="text-white hover:text-red-400"
                onClick={() => onViewChange("calendar")}
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                Calendar
              </Button>
              <ProfileDropdown
                onSettingsClick={() => setIsSettingsModalOpen(true)}
                onContributionsClick={() => setIsContributionsModalOpen(true)}
                onLogoutClick={() => console.log("Logout clicked")}
              />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-gray-800">
            <TabsTrigger
              value="explore"
              className="data-[state=active]:bg-red-600"
            >
              Explore Projects
            </TabsTrigger>
            <TabsTrigger
              value="submission"
              className="data-[state=active]:bg-red-600"
            >
              Manga Submission
            </TabsTrigger>
            <TabsTrigger
              value="animation"
              className="data-[state=active]:bg-red-600"
            >
              Create Animation
            </TabsTrigger>
            <TabsTrigger
              value="forum"
              className="data-[state=active]:bg-red-600"
            >
              Forum
            </TabsTrigger>
            <TabsTrigger
              value="library"
              className="data-[state=active]:bg-red-600"
            >
              My Library
            </TabsTrigger>
          </TabsList>

          <TabsContent value="explore" className="mt-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-white mb-2">
                Explore Animation Projects
              </h1>
              <p className="text-gray-400">
                Join teams working on your favorite manga
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockProjects.map((project) => (
                <Card
                  key={project.id}
                  className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
                  onClick={() => onViewChange("project-dashboard", project)}
                >
                  <CardContent className="p-0">
                    <img
                      src={project.image || "/placeholder.svg"}
                      alt={project.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    <div className="p-4">
                      <h3 className="font-semibold text-white mb-2">
                        {project.title}
                      </h3>
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-300">
                          {getTeamCountForProject(project.id)} teams
                        </span>
                        <Badge variant="secondary" className="ml-auto">
                          {project.progress}% complete
                        </Badge>
                      </div>
                      <Button
                        className="w-full bg-red-600 hover:bg-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewTeamsClick(project.id, project.title);
                        }}
                      >
                        View Teams
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="submission" className="mt-6">
            <div className="max-w-2xl mx-auto">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">
                  Submit Your Manga
                </h1>
                <p className="text-gray-400">
                  Share your original manga series with the community
                </p>
              </div>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6">
                  <form className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-400 mb-2 block">
                          First Name
                        </label>
                        <Input
                          className="bg-gray-700 border-gray-600 text-white"
                          placeholder="Enter your first name"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400 mb-2 block">
                          Last Name
                        </label>
                        <Input
                          className="bg-gray-700 border-gray-600 text-white"
                          placeholder="Enter your last name"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-gray-400 mb-2 block">
                        Email
                      </label>
                      <Input
                        type="email"
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="Enter your email"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-gray-400 mb-2 block">
                        Series Logline
                      </label>
                      <Textarea
                        className="bg-gray-700 border-gray-600 text-white h-24"
                        placeholder="Describe your manga series in 1-2 sentences..."
                      />
                    </div>

                    <div>
                      <label className="text-sm text-gray-400 mb-2 block">
                        Upload Manga Series
                      </label>
                      <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-gray-500 transition-colors">
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-300 mb-2">
                          Drop your manga files here or click to browse
                        </p>
                        <p className="text-sm text-gray-500">
                          Supports PDF, ZIP, or individual image files
                        </p>
                        <Button
                          variant="outline"
                          className="mt-4 bg-transparent border-gray-600 text-white"
                        >
                          Choose Files
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox id="terms" />
                      <label
                        htmlFor="terms"
                        className="text-sm text-white cursor-pointer"
                      >
                        I agree to the terms and conditions
                      </label>
                    </div>

                    <Button className="w-full bg-red-600 hover:bg-red-700">
                      Submit Manga Series
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="animation" className="mt-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-white mb-2">
                Create Animation
              </h1>
              <p className="text-gray-400">
                Build frame-by-frame animations for manga scenes with our
                professional tools
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Play className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Animation Editor
                    </h3>
                    <p className="text-gray-400 mb-6 text-sm">
                      Professional frame-by-frame editor with layers, timeline,
                      and collaboration
                    </p>
                  </div>

                  {/* Scene Settings */}
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="text-sm text-gray-300 mb-2 block">
                        Scene Name
                      </label>
                      <Input
                        value={sceneName}
                        onChange={(e) => setSceneName(e.target.value)}
                        placeholder="Enter scene name..."
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-300 mb-2 block">
                          Width
                        </label>
                        <Input
                          type="number"
                          value={canvasWidth}
                          onChange={(e) =>
                            setCanvasWidth(parseInt(e.target.value) || 800)
                          }
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-300 mb-2 block">
                          Height
                        </label>
                        <Input
                          type="number"
                          value={canvasHeight}
                          onChange={(e) =>
                            setCanvasHeight(parseInt(e.target.value) || 600)
                          }
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-gray-300 mb-2 block">
                        Frame Rate
                      </label>
                      <Input
                        type="number"
                        value={frameRate}
                        onChange={(e) =>
                          setFrameRate(parseInt(e.target.value) || 24)
                        }
                        min="1"
                        max="60"
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                  </div>

                  <Button
                    className="bg-blue-600 hover:bg-blue-700 w-full"
                    onClick={handleOpenEditor}
                  >
                    🎨 Open Editor
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="forum" className="mt-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Community Forum
                </h1>
                <p className="text-gray-400">
                  Connect with other creators and find team members
                </p>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search discussions..."
                    className="pl-10 bg-gray-800 border-gray-700 text-white w-64"
                  />
                </div>
                <Button
                  variant="outline"
                  className="bg-transparent border-gray-600"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
                <Button className="bg-red-600 hover:bg-red-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Post
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {mockForumPosts.map((post) => (
                <Card
                  key={post.id}
                  className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar>
                        <AvatarFallback>{post.author[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-2">
                          {post.title}
                        </h3>
                        <p className="text-gray-300 text-sm mb-3">
                          {post.content}
                        </p>
                        <div className="flex items-center gap-4 mb-3">
                          <span className="text-sm text-gray-400">
                            by {post.author}
                          </span>
                          <span className="text-sm text-gray-400">
                            {post.timeAgo}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-2">
                            {post.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <div className="flex items-center gap-1">
                              <ThumbsUp className="w-4 h-4" />
                              {post.likes}
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="w-4 h-4" />
                              {post.replies}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="library" className="mt-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-white mb-2">My Library</h1>
              <p className="text-gray-400">
                Manage your manga submissions and animations
              </p>
            </div>

            {/* Manga Submissions Section */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">
                Manga Submissions
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockMangaSubmissions.map((item) => (
                  <Card
                    key={item.id}
                    className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
                    onClick={() =>
                      onViewChange("manga", {
                        title: item.title,
                        chapters: item.chapters,
                        selectedChapter: item.chapters[0],
                      })
                    }
                  >
                    <CardContent className="p-0">
                      <div className="relative">
                        <img
                          src={item.thumbnail || "/placeholder.svg"}
                          alt={item.title}
                          className="w-full h-48 object-cover rounded-t-lg"
                        />
                        <Badge
                          className={`absolute top-2 right-2 ${
                            item.status === "published"
                              ? "bg-green-600"
                              : item.status === "under-review"
                              ? "bg-yellow-600"
                              : "bg-gray-600"
                          }`}
                        >
                          {item.status === "under-review"
                            ? "Under Review"
                            : item.status === "published"
                            ? "Published"
                            : "Draft"}
                        </Badge>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-white mb-2">
                          {item.title}
                        </h3>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {item.chapters.map((chapter) => (
                            <Badge
                              key={chapter}
                              variant="secondary"
                              className="text-xs"
                            >
                              {chapter}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-400">
                          <span>{item.createdAt}</span>
                          {item.views && (
                            <div className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              {item.views}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Animation Saves Section */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">
                Animation Saves
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockAnimationSaves.map((item) => (
                  <Card
                    key={item.id}
                    className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
                    onClick={() => onViewChange("animation-editor")}
                  >
                    <CardContent className="p-0">
                      <div className="relative">
                        <img
                          src={item.thumbnail || "/placeholder.svg"}
                          alt={item.title}
                          className="w-full h-48 object-cover rounded-t-lg"
                        />
                        <Badge
                          className={`absolute top-2 right-2 ${
                            item.status === "published"
                              ? "bg-green-600"
                              : "bg-gray-600"
                          }`}
                        >
                          {item.status === "published" ? "Published" : "Draft"}
                        </Badge>
                        <div className="absolute top-2 left-2">
                          <Badge variant="secondary">
                            <Play className="w-3 h-3" />
                          </Badge>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-white mb-2">
                          {item.title}
                        </h3>
                        <p className="text-sm text-gray-400 mb-2">
                          Based on: {item.mangaChapter}
                        </p>
                        <div className="text-sm text-gray-400">
                          {item.createdAt}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
      <SettingsModal
        open={isSettingsModalOpen}
        onOpenChange={setIsSettingsModalOpen}
      />
      <ContributionsModal
        open={isContributionsModalOpen}
        onOpenChange={setIsContributionsModalOpen}
      />
      <ViewTeamsModal
        isOpen={isViewTeamsModalOpen}
        onClose={() => setIsViewTeamsModalOpen(false)}
        projectId={selectedProjectId}
        projectTitle={selectedProjectTitle}
      />
    </div>
  );
}
