"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Home,
  BookOpen,
  Settings,
  Heart,
  BookOpen as BookIcon,
  Bell,
  BarChart3,
  Star,
  Edit,
  ImageIcon,
  Crown,
  Award,
  Clock,
  Menu,
  UserPlus,
  UserMinus,
  Trash2,
  Check,
  X,
  MessageCircle,
  Reply,
  TrendingUp,
  Flame,
  Pin,
} from "lucide-react";
import type { CurrentView } from "@/types";
import { ViewTeamsModal } from "@/components/view-teams-modal";
import { ProfileDropdown } from "@/components/shared/profile-dropdown";
import { SettingsModal } from "@/components/settings-modal";
import { ContributionsModal } from "@/components/contributions-modal";
import { mockProjects, getTeamCountForProject } from "@/lib/team-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

const mockActiveProjects = [
  {
    id: "1",
    title: "Dragon's Ascent",
    studio: "Dragon Fire Studios",
    status: "Ch. 2: In-betweening",
    thumbnail: "/placeholder.svg?height=150&width=100",
  },
];

const mockAnimationProjects = [
  {
    id: "1",
    title: "Sakura High Chronicles",
    description:
      "Follow the daily adventures and romantic mishaps of students at Sakura High School.",
    genres: ["Romance", "Slice-of-Life"],
    teams: 2,
    likes: 12000,
    chapters: 156000,
    upvotes: 67000,
    thumbnail: "/placeholder.svg?height=150&width=100",
  },
  {
    id: "2",
    title: "Dragon's Ascent",
    description:
      "A young warrior discovers ancient dragon magic in a world where technology and...",
    genres: ["Fantasy", "Action"],
    teams: 3,
    likes: 8500,
    chapters: 125000,
    upvotes: 45000,
    thumbnail: "/placeholder.svg?height=150&width=100",
  },
  {
    id: "3",
    title: "Neon Dreams",
    description:
      "In a cyberpunk future, a hacker uncovers a conspiracy that threatens the digital world.",
    genres: ["Sci-Fi", "Thriller"],
    teams: 7,
    likes: 6200,
    chapters: 89000,
    upvotes: 32000,
    thumbnail: "/placeholder.svg?height=150&width=100",
  },
];

export function CreatorHub({ onViewChange }: CreatorHubProps) {
  const [activeView, setActiveView] = useState("dashboard");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isContributionsModalOpen, setIsContributionsModalOpen] =
    useState(false);
  const [isViewTeamsModalOpen, setIsViewTeamsModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // Scene creation settings
  const [sceneName, setSceneName] = useState("New Scene");

  // Manga management state
  const [mangaActiveTab, setMangaActiveTab] = useState("dashboard");
  const [isNewSeriesDialogOpen, setIsNewSeriesDialogOpen] = useState(false);
  const [isLicenseDialogOpen, setIsLicenseDialogOpen] = useState(false);
  const [isChapterUploadDialogOpen, setIsChapterUploadDialogOpen] =
    useState(false);
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);

  const handleOpenEditor = () => {
    setActiveView("create-animation");
  };

  const handleCreateProject = () => {
    // Here you would typically save the project settings and then open the editor
    console.log("Creating project:", {
      name: projectName,
      width: canvasWidth,
      height: canvasHeight,
      frameRate,
      units,
    });

    // Open the animation editor with the configured settings
    onViewChange("animation-editor", {
      sceneName: projectName,
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

  const renderDashboard = () => (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Explore Animation Projects
        </h1>
        <p className="text-gray-400">
          Discover manga series to animate and join creative teams
        </p>
      </div>

      {/* Your Active Projects */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">
          Your Active Projects
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {mockActiveProjects.map((project) => (
            <Card
              key={project.id}
              className="min-w-[300px] bg-gray-800 border-gray-700"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 bg-gray-600 rounded flex items-center justify-center">
                    <BookIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">
                      {project.title}
                    </h3>
                    <p className="text-sm text-gray-400">{project.studio}</p>
                    <p className="text-sm text-red-400">{project.status}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Filter & Sort Projects */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Filter & Sort Projects
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Search Projects
            </label>
            <Input
              placeholder="Search by title or description..."
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Status
            </label>
            <select className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white">
              <option>All Projects</option>
              <option>Active</option>
              <option>Completed</option>
              <option>On Hold</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sort By
            </label>
            <select className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white">
              <option>Most Popular</option>
              <option>Newest</option>
              <option>Most Teams</option>
              <option>Highest Rated</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Genre Filters
          </label>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {[
              "Fantasy",
              "Action",
              "Adventure",
              "Sci-Fi",
              "Thriller",
              "Cyberpunk",
              "Romance",
              "Slice-of-Life",
              "Comedy",
            ].map((genre) => (
              <label key={genre} className="flex items-center space-x-2">
                <Checkbox className="text-red-500" />
                <span className="text-sm text-gray-300">{genre}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Project Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockAnimationProjects.map((project) => (
          <Card
            key={project.id}
            className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
            onClick={() =>
              onViewChange("project-detail", { projectId: project.id })
            }
          >
            <CardContent className="p-6">
              <div className="w-full h-48 bg-gray-600 rounded-lg mb-4 flex items-center justify-center">
                <BookIcon className="w-16 h-16 text-gray-400" />
              </div>

              <h3 className="text-xl font-semibold text-white mb-2">
                {project.title}
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                {project.description}
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {project.genres.map((genre) => (
                  <Badge
                    key={genre}
                    variant="secondary"
                    className="bg-gray-700 text-gray-300"
                  >
                    {genre}
                  </Badge>
                ))}
                <Badge
                  variant="secondary"
                  className="bg-gray-700 text-gray-300"
                >
                  +1
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">{project.teams} Teams</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">
                    {project.likes.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <BookIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">
                    {project.chapters.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">
                    {project.upvotes.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // My Teams state
  const [teamsActiveTab, setTeamsActiveTab] = useState("active-teams");
  const [isTeamManagementModalOpen, setIsTeamManagementModalOpen] =
    useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [teamManagementTab, setTeamManagementTab] = useState("overview");

  const renderMyTeams = () => {
    return (
      <div className="max-w-7xl mx-auto py-10 px-4">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">My Teams</h1>
          <p className="text-gray-400">
            Manage your animation teams and collaborations
          </p>
        </div>

        {/* Tabbed Interface */}
        <div className="w-full">
          <div className="flex justify-center mb-8">
            <div className="inline-flex bg-gray-800 rounded-full p-1 shadow-inner">
              {[
                { id: "active-teams", label: "Active Teams (2)" },
                { id: "invitations", label: "Invitations (2)", badge: 2 },
                { id: "create-team", label: "Create New Team" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTeamsActiveTab(tab.id)}
                  className={`px-6 py-2 rounded-full font-semibold text-sm transition-colors focus:outline-none relative ${
                    teamsActiveTab === tab.id
                      ? "bg-red-600 text-white shadow"
                      : "text-gray-300 hover:bg-gray-700"
                  }`}
                  style={{ minWidth: 140 }}
                >
                  {tab.label}
                  {tab.badge && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Active Teams Tab Content */}
          {teamsActiveTab === "active-teams" && (
            <div className="space-y-8">
              {/* Overview Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gray-800 rounded-2xl p-6 flex flex-col gap-2 shadow-sm">
                  <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                    <Users className="w-5 h-5 text-blue-500" />
                    <span>Active Teams</span>
                  </div>
                  <div className="text-3xl font-bold text-white">2</div>
                </div>
                <div className="bg-gray-800 rounded-2xl p-6 flex flex-col gap-2 shadow-sm">
                  <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    <span>Teams Leading</span>
                  </div>
                  <div className="text-3xl font-bold text-white">1</div>
                </div>
                <div className="bg-gray-800 rounded-2xl p-6 flex flex-col gap-2 shadow-sm">
                  <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                    <Heart className="w-5 h-5 text-red-500" />
                    <span>Total Upvotes</span>
                  </div>
                  <div className="text-3xl font-bold text-white">5,700</div>
                </div>
                <div className="bg-gray-800 rounded-2xl p-6 flex flex-col gap-2 shadow-sm">
                  <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                    <Award className="w-5 h-5 text-green-500" />
                    <span>Chapters Completed</span>
                  </div>
                  <div className="text-3xl font-bold text-white">3</div>
                </div>
              </div>

              {/* Teams Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Team Card 1 - Dragon Fire Studios */}
                <div className="bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-15 h-20 bg-gray-700 rounded-lg flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          Dragon Fire Studios
                        </h3>
                        <p className="text-sm text-gray-400">Dragon's Ascent</p>
                        <Badge
                          variant="secondary"
                          className="mt-1 bg-gray-700 text-gray-300"
                        >
                          Lead Animator
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white"
                    >
                      <Menu className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm text-gray-400 line-clamp-2">
                      Specializing in epic fantasy animations with fluid combat
                      sequences.
                    </p>

                    {/* Team Statistics */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center p-2 bg-gray-700/50 rounded-lg">
                        <div className="font-bold text-white">3</div>
                        <div className="text-gray-400">Members</div>
                      </div>
                      <div className="text-center p-2 bg-gray-700/50 rounded-lg">
                        <div className="font-bold text-white">2,500</div>
                        <div className="text-gray-400">Upvotes</div>
                      </div>
                      <div className="text-center p-2 bg-gray-700/50 rounded-lg">
                        <div className="font-bold text-white">1</div>
                        <div className="text-gray-400">Completed</div>
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-gray-700/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-white">
                          Recent Activity
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">
                        Completed keyframes for Chapter 2
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Last active: 2 hours ago
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        View Project
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Team Chat
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Team Card 2 - Sakura Animation Collective */}
                <div className="bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-15 h-20 bg-gray-700 rounded-lg flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-gray-400" />
                        </div>
                        <Crown className="absolute -top-2 -right-2 w-5 h-5 text-yellow-500 bg-gray-800 rounded-full p-1" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          Sakura Animation Collective
                        </h3>
                        <p className="text-sm text-gray-400">
                          Sakura High Chronicles
                        </p>
                        <Badge
                          variant="secondary"
                          className="mt-1 bg-gray-700 text-gray-300"
                        >
                          Team Lead
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white"
                    >
                      <Menu className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm text-gray-400 line-clamp-2">
                      Bringing slice-of-life stories to animated reality with
                      attention to detail and emotional depth.
                    </p>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center p-2 bg-gray-700/50 rounded-lg">
                        <div className="font-bold text-white">4</div>
                        <div className="text-gray-400">Members</div>
                      </div>
                      <div className="text-center p-2 bg-gray-700/50 rounded-lg">
                        <div className="font-bold text-white">3,200</div>
                        <div className="text-gray-400">Upvotes</div>
                      </div>
                      <div className="text-center p-2 bg-gray-700/50 rounded-lg">
                        <div className="font-bold text-white">2</div>
                        <div className="text-gray-400">Completed</div>
                      </div>
                    </div>

                    <div className="bg-gray-700/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-white">
                          Recent Activity
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">
                        Reviewed Chapter 3 storyboard
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Last active: 30 minutes ago
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        View Project
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Team Chat
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Invitations Tab Content */}
          {teamsActiveTab === "invitations" && (
            <div className="space-y-4">
              {/* Invitation 1 */}
              <div className="bg-gray-800 rounded-2xl border-l-4 border-l-blue-500 shadow-sm">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div>
                        <h3 className="font-semibold text-lg text-white">
                          Cyber Punk Studios
                        </h3>
                        <p className="text-gray-400">Neon Dreams</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="border-gray-600 text-gray-300"
                        >
                          Effects Artist
                        </Badge>
                        <span className="text-sm text-gray-400">
                          Invited by Emma Rodriguez
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">
                        We'd love to have you join our team for the cyberpunk
                        effects work!
                      </p>
                      <p className="text-xs text-gray-500">
                        Invited on January 20, 2024
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button className="bg-green-600 hover:bg-green-700">
                        <Check className="w-4 h-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Decline
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invitation 2 */}
              <div className="bg-gray-800 rounded-2xl border-l-4 border-l-blue-500 shadow-sm">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div>
                        <h3 className="font-semibold text-lg text-white">
                          Fantasy Forge
                        </h3>
                        <p className="text-gray-400">Dragon's Ascent</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="border-gray-600 text-gray-300"
                        >
                          Clean-up Artist
                        </Badge>
                        <span className="text-sm text-gray-400">
                          Invited by Michael Chen
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">
                        Your portfolio shows excellent clean-up skills. Join us!
                      </p>
                      <p className="text-xs text-gray-500">
                        Invited on January 18, 2024
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button className="bg-green-600 hover:bg-green-700">
                        <Check className="w-4 h-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Decline
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Create Team Tab Content */}
          {teamsActiveTab === "create-team" && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-gray-800 rounded-2xl p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-white mb-6">
                  Create New Animation Team
                </h2>
                <div className="space-y-6">
                  {/* Manga Selection */}
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">
                      Select Manga to Animate
                    </label>
                    <select className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500">
                      <option value="">Choose a manga series</option>
                      <option value="1">
                        Dragon's Ascent by Kenji Yamamoto
                      </option>
                      <option value="2">Neon Dreams by Akira Tanaka</option>
                      <option value="3">
                        Sakura High Chronicles by Yuki Sato
                      </option>
                    </select>
                  </div>

                  {/* Team Name */}
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">
                      Team Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your team name"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  {/* Team Description */}
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">
                      Team Description
                    </label>
                    <textarea
                      placeholder="Describe your team's animation style and goals"
                      rows={4}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                    />
                  </div>

                  {/* Form Actions */}
                  <div className="flex gap-4 pt-4">
                    <Button className="flex-1 bg-red-600 hover:bg-red-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Team
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Team Management Modal */}
        <Dialog
          open={isTeamManagementModalOpen}
          onOpenChange={setIsTeamManagementModalOpen}
        >
          <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">
                Dragon Fire Studios - Team Management
              </DialogTitle>
            </DialogHeader>

            <div className="w-full">
              <div className="flex justify-center mb-6">
                <div className="inline-flex bg-gray-700 rounded-full p-1">
                  {[
                    { id: "overview", label: "Overview" },
                    { id: "members", label: "Members" },
                    { id: "progress", label: "Progress" },
                    { id: "settings", label: "Settings" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setTeamManagementTab(tab.id)}
                      className={`px-4 py-2 rounded-full font-medium text-sm transition-colors ${
                        teamManagementTab === tab.id
                          ? "bg-red-600 text-white"
                          : "text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Overview Tab */}
              {teamManagementTab === "overview" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-white mb-2">
                        Team Information
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Team Name:</span>
                          <span className="text-white">
                            Dragon Fire Studios
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Manga:</span>
                          <span className="text-white">Dragon's Ascent</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Your Role:</span>
                          <Badge
                            variant="secondary"
                            className="bg-gray-700 text-gray-300"
                          >
                            Lead Animator
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Joined:</span>
                          <span className="text-white">January 15, 2024</span>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-white mb-2">
                          Team Description
                        </h4>
                        <p className="text-sm text-gray-400">
                          Specializing in epic fantasy animations with fluid
                          combat sequences.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold text-white mb-2">
                        Team Statistics
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                          <div className="text-xl font-bold text-white">
                            2,500
                          </div>
                          <div className="text-sm text-gray-400">
                            Total Upvotes
                          </div>
                        </div>
                        <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                          <div className="text-xl font-bold text-white">
                            45,000
                          </div>
                          <div className="text-sm text-gray-400">
                            Total Views
                          </div>
                        </div>
                        <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                          <div className="text-xl font-bold text-white">1</div>
                          <div className="text-sm text-gray-400">Completed</div>
                        </div>
                        <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                          <div className="text-xl font-bold text-white">3</div>
                          <div className="text-sm text-gray-400">Members</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Members Tab */}
              {teamManagementTab === "members" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">
                      Team Members (3)
                    </h3>
                    <Button className="bg-red-600 hover:bg-red-700">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invite Member
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {/* Team Lead */}
                    <div className="flex items-center justify-between p-3 border border-gray-600 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-gray-600 text-white">
                            AC
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">
                              Alex Chen
                            </span>
                            <Crown className="w-4 h-4 text-yellow-500" />
                          </div>
                          <p className="text-sm text-gray-400">Lead Animator</p>
                        </div>
                      </div>
                    </div>

                    {/* Team Members */}
                    <div className="flex items-center justify-between p-3 border border-gray-600 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-gray-600 text-white">
                            SK
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium text-white">
                            Sarah Kim
                          </span>
                          <p className="text-sm text-gray-400">In-betweener</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-600 text-gray-300"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-600 text-gray-300"
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border border-gray-600 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-gray-600 text-white">
                            MJ
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium text-white">
                            Mike Johnson
                          </span>
                          <p className="text-sm text-gray-400">
                            Clean-up Artist
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-600 text-gray-300"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-600 text-gray-300"
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Progress Tab */}
              {teamManagementTab === "progress" && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-white">Chapter Progress</h3>
                  <div className="space-y-3">
                    <div className="border border-gray-600 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-white">
                          Chapter 1: The Awakening
                        </span>
                        <Badge
                          variant="secondary"
                          className="bg-green-600/20 text-green-400"
                        >
                          Published
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-red-600 h-2 rounded-full"
                          style={{ width: "100%" }}
                        />
                      </div>
                    </div>

                    <div className="border border-gray-600 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-white">
                          Chapter 2: First Flight
                        </span>
                        <Badge
                          variant="secondary"
                          className="bg-yellow-600/20 text-yellow-400"
                        >
                          In-betweening
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-red-600 h-2 rounded-full"
                          style={{ width: "75%" }}
                        />
                      </div>
                    </div>

                    <div className="border border-gray-600 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-white">
                          Chapter 3: The Ancient Temple
                        </span>
                        <Badge
                          variant="secondary"
                          className="bg-blue-600/20 text-blue-400"
                        >
                          Storyboard
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-red-600 h-2 rounded-full"
                          style={{ width: "30%" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Settings Tab */}
              {teamManagementTab === "settings" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-white mb-4">
                      Team Settings
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-gray-300 mb-2 block">
                          Team Name
                        </label>
                        <input
                          type="text"
                          defaultValue="Dragon Fire Studios"
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-300 mb-2 block">
                          Description
                        </label>
                        <textarea
                          defaultValue="Specializing in epic fantasy animations with fluid combat sequences."
                          rows={3}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                        />
                      </div>
                      <Button className="bg-red-600 hover:bg-red-700">
                        Save Changes
                      </Button>
                    </div>
                  </div>

                  <div className="border-t border-gray-600 pt-6">
                    <h3 className="font-semibold text-red-400 mb-4">
                      Danger Zone
                    </h3>
                    <Button
                      variant="destructive"
                      className="w-full bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Team
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  const renderManageManga = () => {
    return (
      <div className="max-w-7xl mx-auto py-10 px-4">
        {/* Tabs */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex bg-gray-800 rounded-full p-1 shadow-inner">
            {[
              { id: "dashboard", label: "Dashboard" },
              { id: "series", label: "My Series" },
              { id: "analytics", label: "Analytics" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMangaActiveTab(tab.id)}
                className={`px-8 py-2 rounded-full font-semibold text-base transition-colors focus:outline-none ${
                  mangaActiveTab === tab.id
                    ? "bg-red-600 text-white shadow"
                    : "text-gray-300 hover:bg-gray-700"
                }`}
                style={{ minWidth: 140 }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard Tab */}
        {mangaActiveTab === "dashboard" && (
          <div className="space-y-10">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-gray-800 rounded-2xl p-6 flex flex-col gap-2 shadow-sm">
                <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                  <span>Total Series</span>
                </div>
                <div className="text-3xl font-bold text-white">2</div>
                <div className="text-xs text-gray-400">1 active, 1 draft</div>
              </div>
              <div className="bg-gray-800 rounded-2xl p-6 flex flex-col gap-2 shadow-sm">
                <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                  <Eye className="w-4 h-4" />
                  <span>Total Views</span>
                </div>
                <div className="text-3xl font-bold text-white">45.6K</div>
                <div className="text-xs text-green-400">
                  +12% from last week
                </div>
              </div>
              <div className="bg-gray-800 rounded-2xl p-6 flex flex-col gap-2 shadow-sm">
                <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                  <Users className="w-4 h-4" />
                  <span>Followers</span>
                </div>
                <div className="text-3xl font-bold text-white">1,250</div>
                <div className="text-xs text-green-400">+8% from last week</div>
              </div>
              <div className="bg-gray-800 rounded-2xl p-6 flex flex-col gap-2 shadow-sm">
                <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                  <Play className="w-4 h-4" />
                  <span>Animation Teams</span>
                </div>
                <div className="text-3xl font-bold text-white">3</div>
                <div className="text-xs text-gray-400">
                  Working on your manga
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-2xl p-8 flex flex-col gap-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">
                    Quick Actions
                  </h2>
                  <p className="text-gray-400 text-sm">
                    Get started with your next chapter or series
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setIsNewSeriesDialogOpen(true)}
                    className="rounded-full px-6 py-2 text-base font-semibold bg-gradient-to-r from-red-500 to-red-700 text-white shadow hover:from-red-600 hover:to-red-800"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Series
                  </Button>
                  <Button
                    onClick={() => setIsChapterUploadDialogOpen(true)}
                    variant="outline"
                    className="rounded-full px-6 py-2 text-base font-semibold border-gray-600 text-gray-200 hover:bg-gray-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload New Chapter
                  </Button>
                </div>
              </div>
            </div>

            {/* Activity & Schedule */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <div className="bg-gray-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-white mb-4">
                  Recent Activity
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-blue-400" />
                    <div>
                      <span className="text-white font-medium">
                        New comment on Chapter 12 of The Water Magician
                      </span>
                      <div className="text-xs text-gray-400">2 hours ago</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Play className="w-5 h-5 text-purple-400" />
                    <div>
                      <span className="text-white font-medium">
                        Team 'Studio Pixel' started animating Chapter 11
                      </span>
                      <div className="text-xs text-gray-400">5 hours ago</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Star className="w-5 h-5 text-yellow-400" />
                    <div>
                      <span className="text-white font-medium">
                        The Water Magician reached 45K total views!
                      </span>
                      <div className="text-xs text-gray-400">1 day ago</div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Publishing Schedule */}
              <div className="bg-gray-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-white mb-4">
                  Publishing Schedule
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-green-900/30 rounded-lg px-4 py-3">
                    <div>
                      <span className="text-white font-semibold">
                        The Water Magician - Ch. 13
                      </span>
                      <div className="text-xs text-green-200">
                        Scheduled for Friday, Jan 19
                      </div>
                    </div>
                    <span className="bg-green-600/80 text-white text-xs font-bold px-3 py-1 rounded-full">
                      Ready
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-yellow-900/20 rounded-lg px-4 py-3">
                    <div>
                      <span className="text-white font-semibold">
                        The Water Magician - Ch. 14
                      </span>
                      <div className="text-xs text-yellow-200">
                        Draft - No schedule set
                      </div>
                    </div>
                    <span className="bg-yellow-400/80 text-gray-900 text-xs font-bold px-3 py-1 rounded-full">
                      Draft
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* My Series Tab */}
        {mangaActiveTab === "series" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">My Series</h2>
              <Button
                onClick={() => setIsNewSeriesDialogOpen(true)}
                className="rounded-full px-6 py-2 text-base font-semibold bg-gradient-to-r from-red-500 to-red-700 text-white shadow hover:from-red-600 hover:to-red-800"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Series
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Series Card 1 */}
              <div className="bg-gray-800 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                <div className="relative flex-1 min-h-[320px] bg-gray-700 flex items-center justify-center">
                  <div className="absolute top-4 right-4">
                    <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      Active
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 rounded-lg bg-gray-600 flex items-center justify-center mb-2">
                      <ImageIcon className="w-10 h-10 text-gray-400" />
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="font-bold text-white text-lg mb-2">
                    The Water Magician
                  </div>
                  <div className="text-sm text-gray-300 mb-4">
                    <div>
                      Chapters:{" "}
                      <span className="font-semibold text-white">12</span>
                    </div>
                    <div>
                      Total Views:{" "}
                      <span className="font-semibold text-white">45,600</span>
                    </div>
                    <div>
                      Followers:{" "}
                      <span className="font-semibold text-white">1,250</span>
                    </div>
                    <div>
                      Animation Teams:{" "}
                      <span className="font-semibold text-white">3</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full border-gray-600 text-gray-200 hover:bg-gray-700"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedSeries("The Water Magician");
                        setIsChapterUploadDialogOpen(true);
                      }}
                      className="rounded-full bg-gradient-to-r from-red-500 to-red-700 text-white font-semibold hover:from-red-600 hover:to-red-800"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Chapter
                    </Button>
                  </div>
                </div>
              </div>
              {/* Series Card 2 */}
              <div className="bg-gray-800 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                <div className="relative flex-1 min-h-[320px] bg-gray-700 flex items-center justify-center">
                  <div className="absolute top-4 right-4">
                    <span className="bg-gray-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      Draft
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 rounded-lg bg-gray-600 flex items-center justify-center mb-2">
                      <ImageIcon className="w-10 h-10 text-gray-400" />
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="font-bold text-white text-lg mb-2">
                    Digital Dreams
                  </div>
                  <div className="text-sm text-gray-300 mb-4">
                    <div>
                      Chapters:{" "}
                      <span className="font-semibold text-white">3</span>
                    </div>
                    <div>
                      Total Views:{" "}
                      <span className="font-semibold text-white">0</span>
                    </div>
                    <div>
                      Followers:{" "}
                      <span className="font-semibold text-white">0</span>
                    </div>
                    <div>
                      Animation Teams:{" "}
                      <span className="font-semibold text-white">0</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full border-gray-600 text-gray-200 hover:bg-gray-700"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedSeries("Digital Dreams");
                        setIsChapterUploadDialogOpen(true);
                      }}
                      className="rounded-full bg-gradient-to-r from-red-500 to-red-700 text-white font-semibold hover:from-red-600 hover:to-red-800"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Chapter
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {mangaActiveTab === "analytics" && (
          <div className="bg-gray-800 rounded-2xl p-12 flex flex-col items-center justify-center shadow-sm">
            <h3 className="text-lg font-bold text-white mb-4">
              Performance Overview
            </h3>
            <BarChart3 className="w-24 h-24 text-gray-600 mb-4" />
            <p className="text-gray-400">
              Analytics chart would be displayed here
            </p>
          </div>
        )}
      </div>
    );
  };

  // Forum state
  const [isNewTopicModalOpen, setIsNewTopicModalOpen] = useState(false);

  // Project setup state
  const [projectName, setProjectName] = useState("");
  const [canvasWidth, setCanvasWidth] = useState(1920);
  const [canvasHeight, setCanvasHeight] = useState(1080);
  const [frameRate, setFrameRate] = useState(24);
  const [units, setUnits] = useState("pixel");

  const renderForum = () => {
    return (
      <div className="max-w-7xl mx-auto py-10 px-4">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Community Forum
          </h1>
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

            {/* Forum Categories */}
            <div className="bg-gray-800 rounded-2xl shadow-sm">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white">
                  Forum Categories
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {/* General Discussion Category */}
                  <div className="flex items-center justify-between p-4 border border-gray-600 rounded-lg hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center">
                        <MessageCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">
                          General Discussion
                        </div>
                        <div className="text-sm text-gray-400">
                          General chat about animation and manga
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex gap-4 text-sm text-gray-400 mb-1">
                        <span>1247 topics</span>
                        <span>8934 posts</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        Last: Welcome to Al-Nime! by Admin
                      </div>
                      <div className="text-xs text-gray-400">2 hours ago</div>
                    </div>
                  </div>

                  {/* Creator Showcase Category */}
                  <div className="flex items-center justify-between p-4 border border-gray-600 rounded-lg hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center">
                        <Star className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">
                          Creator Showcase
                        </div>
                        <div className="text-sm text-gray-400">
                          Share your work and get feedback
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex gap-4 text-sm text-gray-400 mb-1">
                        <span>892 topics</span>
                        <span>5621 posts</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        Last: My first animation attempt by NewAnimator
                      </div>
                      <div className="text-xs text-gray-400">1 hour ago</div>
                    </div>
                  </div>

                  {/* Collaboration Hub Category */}
                  <div className="flex items-center justify-between p-4 border border-gray-600 rounded-lg hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">
                          Collaboration Hub
                        </div>
                        <div className="text-sm text-gray-400">
                          Find team members and partners
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex gap-4 text-sm text-gray-400 mb-1">
                        <span>456 topics</span>
                        <span>2134 posts</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        Last: Looking for background artist by TeamLead
                      </div>
                      <div className="text-xs text-gray-400">
                        30 minutes ago
                      </div>
                    </div>
                  </div>

                  {/* Tutorials & Tips Category */}
                  <div className="flex items-center justify-between p-4 border border-gray-600 rounded-lg hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-orange-500 flex items-center justify-center">
                        <Award className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">
                          Tutorials & Tips
                        </div>
                        <div className="text-sm text-gray-400">
                          Learn and share animation techniques
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex gap-4 text-sm text-gray-400 mb-1">
                        <span>234 topics</span>
                        <span>1876 posts</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        Last: Keyframe animation basics by ProAnimator
                      </div>
                      <div className="text-xs text-gray-400">4 hours ago</div>
                    </div>
                  </div>

                  {/* Feedback & Critique Category */}
                  <div className="flex items-center justify-between p-4 border border-gray-600 rounded-lg hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-red-500 flex items-center justify-center">
                        <MessageCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">
                          Feedback & Critique
                        </div>
                        <div className="text-sm text-gray-400">
                          Get constructive feedback on your work
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex gap-4 text-sm text-gray-400 mb-1">
                        <span>678 topics</span>
                        <span>3421 posts</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        Last: Please review my character design by ArtStudent
                      </div>
                      <div className="text-xs text-gray-400">1 hour ago</div>
                    </div>
                  </div>

                  {/* Technical Support Category */}
                  <div className="flex items-center justify-between p-4 border border-gray-600 rounded-lg hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gray-500 flex items-center justify-center">
                        <MessageCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">
                          Technical Support
                        </div>
                        <div className="text-sm text-gray-400">
                          Get help with tools and software
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex gap-4 text-sm text-gray-400 mb-1">
                        <span>345 topics</span>
                        <span>1567 posts</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        Last: Animation software recommendations by TechHelper
                      </div>
                      <div className="text-xs text-gray-400">3 hours ago</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Trending Topics */}
            <div className="bg-gray-800 rounded-2xl shadow-sm">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  Trending Topics
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {/* Trending Topic 1 */}
                  <div className="flex items-start gap-4 p-4 border border-gray-600 rounded-lg hover:bg-gray-700/50 transition-colors">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gray-600 text-white">
                        AP
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Pin className="w-4 h-4 text-blue-500" />
                            <div className="font-semibold text-white hover:text-red-400 cursor-pointer">
                              Best practices for team collaboration in animation
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                            <span>by AnimationPro</span>
                            <span>in General Discussion</span>
                            <span>•</span>
                            <span>2 hours ago</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <Badge
                              variant="secondary"
                              className="text-xs bg-gray-700 text-gray-300"
                            >
                              collaboration
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="text-xs bg-gray-700 text-gray-300"
                            >
                              tips
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="text-xs bg-gray-700 text-gray-300"
                            >
                              workflow
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Reply className="w-4 h-4" />
                          <span>45</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          <span>1234</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          <span>89</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Trending Topic 2 */}
                  <div className="flex items-start gap-4 p-4 border border-gray-600 rounded-lg hover:bg-gray-700/50 transition-colors">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gray-600 text-white">
                        CA
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-semibold text-white hover:text-red-400 cursor-pointer">
                              Showcase: My latest manga animation project
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                            <span>by CreativeArtist</span>
                            <span>in Creator Showcase</span>
                            <span>•</span>
                            <span>1 hour ago</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <Badge
                              variant="secondary"
                              className="text-xs bg-gray-700 text-gray-300"
                            >
                              showcase
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="text-xs bg-gray-700 text-gray-300"
                            >
                              animation
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="text-xs bg-gray-700 text-gray-300"
                            >
                              feedback
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Reply className="w-4 h-4" />
                          <span>23</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          <span>567</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          <span>67</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Active Users */}
            <div className="bg-gray-800 rounded-2xl shadow-sm">
              <div className="p-6 border-b border-gray-700">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Active Users
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {/* Active User 1 */}
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-gray-600 text-white text-xs">
                          AP
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 bg-green-500"></div>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-white">
                        AnimationPro
                      </div>
                      <div className="text-xs text-gray-400">1234 posts</div>
                    </div>
                  </div>

                  {/* Active User 2 */}
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-gray-600 text-white text-xs">
                          CA
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 bg-green-500"></div>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-white">
                        CreativeArtist
                      </div>
                      <div className="text-xs text-gray-400">567 posts</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Forum Guidelines */}
            <div className="bg-gray-800 rounded-2xl shadow-sm">
              <div className="p-6 border-b border-gray-700">
                <h3 className="text-lg font-bold text-white">
                  Forum Guidelines
                </h3>
              </div>
              <div className="p-6 space-y-2 text-sm">
                <div className="text-gray-300">
                  • Be respectful to all community members
                </div>
                <div className="text-gray-300">
                  • Stay on topic and use appropriate categories
                </div>
                <div className="text-gray-300">
                  • No spam or self-promotion without permission
                </div>
                <div className="text-gray-300">
                  • Share constructive feedback and criticism
                </div>
                <div className="text-gray-300">
                  • Help maintain a positive learning environment
                </div>
                <a
                  href="/creator/forum/rules"
                  className="text-red-400 hover:underline block mt-4"
                >
                  View full guidelines →
                </a>
              </div>
            </div>

            {/* User Forum Stats */}
            <div className="bg-gray-800 rounded-2xl shadow-sm">
              <div className="p-6 border-b border-gray-700">
                <h3 className="text-lg font-bold text-white">
                  Your Forum Stats
                </h3>
              </div>
              <div className="p-6 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Posts:</span>
                  <span className="font-medium text-white">47</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Topics:</span>
                  <span className="font-medium text-white">12</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Likes Received:</span>
                  <span className="font-medium text-white">156</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Reputation:</span>
                  <span className="font-medium text-white">★★★★☆</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* New Topic Modal */}
        <Dialog
          open={isNewTopicModalOpen}
          onOpenChange={setIsNewTopicModalOpen}
        >
          <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl">Create New Topic</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Topic Title */}
              <div>
                <label className="text-sm text-gray-300 mb-2 block">
                  Topic Title
                </label>
                <input
                  type="text"
                  placeholder="Enter your topic title"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Category Selection */}
              <div>
                <label className="text-sm text-gray-300 mb-2 block">
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

              {/* Topic Content */}
              <div>
                <label className="text-sm text-gray-300 mb-2 block">
                  Content
                </label>
                <textarea
                  placeholder="Write your topic content here..."
                  rows={8}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="text-sm text-gray-300 mb-2 block">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. animation, tutorial, feedback"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Form Actions */}
              <div className="flex gap-4">
                <Button className="flex-1 bg-red-600 hover:bg-red-700">
                  Create Topic
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  const renderCreateAnimation = () => {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">OT</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">
                Create New Animation Project
              </h1>
              <p className="text-gray-400">
                Configure your animation project settings
              </p>
            </div>
          </div>
        </div>

        {/* Project Configuration Form */}
        <div className="bg-gray-800 rounded-2xl shadow-sm p-8">
          <div className="space-y-8">
            {/* Project Name */}
            <div>
              <label className="text-lg font-semibold text-white mb-3 block">
                Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 text-lg"
              />
            </div>

            {/* Canvas Size Section */}
            <div>
              <label className="text-lg font-semibold text-white mb-4 block">
                Canvas Size
              </label>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">
                    Width
                  </label>
                  <input
                    type="number"
                    value={canvasWidth}
                    onChange={(e) =>
                      setCanvasWidth(parseInt(e.target.value) || 1920)
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">
                    Height
                  </label>
                  <input
                    type="number"
                    value={canvasHeight}
                    onChange={(e) =>
                      setCanvasHeight(parseInt(e.target.value) || 1080)
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="text-sm text-gray-300 mb-2 block">
                  Units
                </label>
                <select
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="pixel">pixel</option>
                  <option value="mm">mm</option>
                  <option value="cm">cm</option>
                  <option value="inch">inch</option>
                </select>
              </div>
            </div>

            {/* Frame Rate */}
            <div>
              <label className="text-lg font-semibold text-white mb-3 block">
                Frame Rate
              </label>
              <input
                type="number"
                value={frameRate}
                onChange={(e) => setFrameRate(parseInt(e.target.value) || 24)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Preset Sizes */}
            <div>
              <label className="text-lg font-semibold text-white mb-4 block">
                Quick Presets
              </label>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCanvasWidth(1920);
                    setCanvasHeight(1080);
                  }}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 py-3"
                >
                  HD (1920x1080)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCanvasWidth(1280);
                    setCanvasHeight(720);
                  }}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 py-3"
                >
                  720p (1280x720)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCanvasWidth(3840);
                    setCanvasHeight(2160);
                  }}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 py-3"
                >
                  4K (3840x2160)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCanvasWidth(1080);
                    setCanvasHeight(1080);
                  }}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 py-3"
                >
                  Square (1080x1080)
                </Button>
              </div>
            </div>

            {/* Project Preview */}
            <div className="bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Project Preview
              </h3>
              <div className="space-y-2 text-gray-300">
                <div>
                  <span className="text-gray-400">Project Name:</span>{" "}
                  {projectName || "Untitled Project"}
                </div>
                <div>
                  <span className="text-gray-400">Canvas Size:</span>{" "}
                  {canvasWidth} x {canvasHeight} {units}
                </div>
                <div>
                  <span className="text-gray-400">Frame Rate:</span> {frameRate}{" "}
                  fps
                </div>
                <div>
                  <span className="text-gray-400">Aspect Ratio:</span>{" "}
                  {(canvasWidth / canvasHeight).toFixed(2)}:1
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-4 pt-6">
              <Button
                onClick={handleCreateProject}
                disabled={!projectName.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-3 text-lg"
              >
                Create Project & Open Editor
              </Button>
              <Button
                variant="outline"
                onClick={() => setActiveView("dashboard")}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 py-3 text-lg"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Top Bar */}
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
              <div className="text-2xl font-bold text-red-500">
                Creator Portal
              </div>
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

      <div className="flex">
        {/* Left Sidebar */}
        <div className="w-64 bg-gray-800 min-h-screen p-6">
          <div className="space-y-8">
            {/* Navigation Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Navigation
              </h3>
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveView("dashboard")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeView === "dashboard"
                      ? "bg-red-600 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  <Home className="w-5 h-5" />
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveView("teams")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeView === "teams"
                      ? "bg-red-600 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  <Users className="w-5 h-5" />
                  My Teams
                </button>
                <button
                  onClick={() => setActiveView("manga")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeView === "manga"
                      ? "bg-red-600 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  <BookOpen className="w-5 h-5" />
                  Manage Manga
                </button>
                <button
                  onClick={() => setActiveView("forum")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeView === "forum"
                      ? "bg-red-600 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  <MessageSquare className="w-5 h-5" />
                  Forum
                </button>
              </nav>
            </div>

            {/* Create Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Create
              </h3>
              <nav className="space-y-2">
                <button
                  onClick={handleOpenEditor}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  <Plus className="w-5 h-5" />
                  Create Animation
                </button>
              </nav>
            </div>

            {/* Settings */}
            <div className="pt-8 border-t border-gray-700">
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                <Settings className="w-5 h-5" />
                Settings
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {activeView === "dashboard" && renderDashboard()}
          {activeView === "teams" && renderMyTeams()}
          {activeView === "manga" && renderManageManga()}
          {activeView === "forum" && renderForum()}
          {activeView === "create-animation" && renderCreateAnimation()}
        </div>
      </div>

      {/* Modals */}
      <ViewTeamsModal
        isOpen={isViewTeamsModalOpen}
        onClose={() => setIsViewTeamsModalOpen(false)}
        projectId={selectedProjectId}
        projectTitle={selectedProjectTitle}
      />
      <SettingsModal
        open={isSettingsModalOpen}
        onOpenChange={setIsSettingsModalOpen}
      />
      <ContributionsModal
        open={isContributionsModalOpen}
        onOpenChange={setIsContributionsModalOpen}
      />
    </div>
  );
}
