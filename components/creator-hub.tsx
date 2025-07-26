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
import { ProjectSetup } from "@/components/features/creator/ProjectSetup";
import { MangaManager } from "@/components/features/creator/MangaManager";
import { ForumSection } from "@/components/features/forum/ForumSection";

interface CreatorHubProps {
  onViewChange: (view: CurrentView, params?: any) => void;
}

const mockActiveProjects = [
  {
    id: "1",
    title: "Dragon's Legacy",
    studio: "Studio Sakura",
    status: "In Progress",
  },
  {
    id: "2",
    title: "Cyberpunk Dreams",
    studio: "Digital Animators",
    status: "Planning",
  },
  {
    id: "3",
    title: "The Last Samurai",
    studio: "Traditional Arts",
    status: "Completed",
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

  const [selectedProjectTitle, setSelectedProjectTitle] = useState("");

  const handleOpenEditor = () => {
    setActiveView("create-animation");
  };

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
              placeholder="Search by title, genre..."
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Genre
            </label>
            <select className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
              <option value="">All Genres</option>
              <option value="action">Action</option>
              <option value="romance">Romance</option>
              <option value="fantasy">Fantasy</option>
              <option value="sci-fi">Sci-Fi</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Status
            </label>
            <select className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
              <option value="">All Status</option>
              <option value="planning">Planning</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sort By
            </label>
            <select className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
              <option value="recent">Most Recent</option>
              <option value="popular">Most Popular</option>
              <option value="views">Most Views</option>
            </select>
          </div>
        </div>

        {/* Project Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockProjects.map((project) => (
            <Card
              key={project.id}
              className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors"
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gray-600 rounded flex items-center justify-center">
                    <BookIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">
                      {project.title}
                    </h3>
                    <p className="text-sm text-gray-400 mb-2">
                      {project.description}
                    </p>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge
                        variant="secondary"
                        className="text-xs bg-gray-700 text-gray-300"
                      >
                        {project.genre}
                      </Badge>
                      <Badge
                        variant={
                          project.status === "completed"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {project.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <span>{project.views} views</span>
                      <span>{getTeamCountForProject(project.id)} teams</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-gray-600 text-gray-200 hover:bg-gray-700"
                    onClick={() =>
                      handleViewTeamsClick(project.id, project.title)
                    }
                  >
                    <Users className="w-4 h-4 mr-1" />
                    View Teams
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    onClick={() =>
                      onViewChange("project-detail", { id: project.id })
                    }
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  const renderMyTeams = () => (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">My Teams</h1>
        <p className="text-gray-400">
          Manage your animation teams and collaborations
        </p>
      </div>

      {/* Team Navigation */}
      <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
        <button className="flex-1 py-2 px-4 rounded-md text-sm font-medium bg-red-600 text-white">
          Active Teams
        </button>
        <button className="flex-1 py-2 px-4 rounded-md text-sm font-medium text-gray-300 hover:text-white">
          Invitations
        </button>
        <button className="flex-1 py-2 px-4 rounded-md text-sm font-medium text-gray-300 hover:text-white">
          Team Management
        </button>
      </div>

      {/* Active Teams */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">Active Teams</h2>
          <Button className="bg-red-600 hover:bg-red-700">
            <Plus className="w-4 h-4 mr-2" />
            Create New Team
          </Button>
        </div>

        {/* Team Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Team Card 1 */}
          <div className="bg-gray-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Dragon's Legacy Team
                </h3>
                <p className="text-sm text-gray-400">Studio Sakura</p>
              </div>
              <Badge className="bg-green-600">Active</Badge>
            </div>
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Users className="w-4 h-4" />
                <span>8 members</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <CalendarIcon className="w-4 h-4" />
                <span>Started 2 months ago</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <BarChart3 className="w-4 h-4" />
                <span>75% complete</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-700">
                <Play className="w-4 h-4 mr-1" />
                Join Session
              </Button>
              <Button size="sm" variant="outline" className="border-gray-600">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Team Card 2 */}
          <div className="bg-gray-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Cyberpunk Dreams
                </h3>
                <p className="text-sm text-gray-400">Digital Animators</p>
              </div>
              <Badge className="bg-yellow-600">Planning</Badge>
            </div>
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Users className="w-4 h-4" />
                <span>5 members</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <CalendarIcon className="w-4 h-4" />
                <span>Started 1 week ago</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <BarChart3 className="w-4 h-4" />
                <span>25% complete</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-700">
                <Play className="w-4 h-4 mr-1" />
                Join Session
              </Button>
              <Button size="sm" variant="outline" className="border-gray-600">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

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
          {activeView === "manga" && (
            <MangaManager onViewChange={onViewChange} />
          )}
          {activeView === "forum" && <ForumSection />}
          {activeView === "create-animation" && (
            <ProjectSetup onViewChange={onViewChange} />
          )}
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
