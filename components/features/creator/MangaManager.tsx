"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Plus,
  Edit,
  ImageIcon,
  BarChart3,
  Users,
  Eye,
  Heart,
  CalendarIcon,
  Upload,
  Play,
  Settings,
  Crown,
  Award,
  Clock,
  Menu,
  UserPlus,
  UserMinus,
  Trash2,
  Check,
  X,
  Loader2,
} from "lucide-react";
import type { CurrentView } from "@/types";
import { supabase } from "@/lib/supabase";

interface MangaManagerProps {
  onViewChange: (view: CurrentView, params?: any) => void;
}

interface Project {
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
  users?: {
    username: string;
    avatar_url?: string;
  };
  chapters?: Chapter[];
  teams?: any[];
}

interface Chapter {
  id: string;
  title: string;
  project_id: string;
  chapter_number: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export function MangaManager({ onViewChange }: MangaManagerProps) {
  const [mangaActiveTab, setMangaActiveTab] = useState("dashboard");
  const [isNewSeriesDialogOpen, setIsNewSeriesDialogOpen] = useState(false);
  const [isLicenseDialogOpen, setIsLicenseDialogOpen] = useState(false);
  const [isChapterUploadDialogOpen, setIsChapterUploadDialogOpen] =
    useState(false);
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);

  // Data states
  const [projects, setProjects] = useState<Project[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalViews: 0,
    totalFollowers: 0,
    activeTeams: 0,
    totalChapters: 0,
  });

  // Fetch manga data from Supabase
  useEffect(() => {
    fetchMangaData();
  }, []);

  const fetchMangaData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch projects with volumes and chapters
      const { data: projectsData, error: projectsError } = await supabase
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
        .order("created_at", { ascending: false });

      if (projectsError) throw projectsError;

      // Fetch all chapters
      const { data: chaptersData, error: chaptersError } = await supabase
        .from("chapters")
        .select("*")
        .order("created_at", { ascending: false });

      if (chaptersError) throw chaptersError;

      setProjects(projectsData || []);
      setChapters(chaptersData || []);

      // Calculate stats
      const totalViews =
        projectsData?.reduce((sum, project) => sum + (project.views || 0), 0) ||
        0;
      const totalChapters = chaptersData?.length || 0;
      const activeTeams = 0; // No teams table anymore
      const totalFollowers = Math.floor(totalViews * 0.1); // Estimate followers as 10% of views

      setStats({
        totalViews,
        totalFollowers,
        activeTeams,
        totalChapters,
      });
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching manga data:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Manage Your Manga
        </h1>
        <p className="text-gray-400">
          Upload, edit, and track the performance of your manga series
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => setMangaActiveTab("dashboard")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            mangaActiveTab === "dashboard"
              ? "bg-red-600 text-white"
              : "text-gray-300 hover:text-white"
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setMangaActiveTab("series")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            mangaActiveTab === "series"
              ? "bg-red-600 text-white"
              : "text-gray-300 hover:text-white"
          }`}
        >
          My Series
        </button>
        <button
          onClick={() => setMangaActiveTab("analytics")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            mangaActiveTab === "analytics"
              ? "bg-red-600 text-white"
              : "text-gray-300 hover:text-white"
          }`}
        >
          Analytics
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-400">Loading manga data...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-400">Error loading manga data: {error}</p>
          <Button
            onClick={fetchMangaData}
            variant="outline"
            size="sm"
            className="mt-2 border-red-500 text-red-400 hover:bg-red-500/10"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Dashboard Tab */}
      {!loading && !error && mangaActiveTab === "dashboard" && (
        <div className="space-y-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gray-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Eye className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">
                    {stats.totalViews.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400">Total Views</div>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Heart className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">
                    {stats.totalFollowers.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400">Followers</div>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">
                    {stats.activeTeams}
                  </div>
                  <div className="text-sm text-gray-400">Active Teams</div>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <CalendarIcon className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">
                    {stats.totalChapters}
                  </div>
                  <div className="text-sm text-gray-400">Total Chapters</div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-gray-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-white mb-4">
              Recent Activity
            </h3>
            <div className="space-y-4">
              {projects.length > 0 ? (
                projects.slice(0, 3).map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center gap-4 p-4 bg-gray-700 rounded-lg"
                  >
                    <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                      <Upload className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium">
                        {project.title} - {project.status}
                      </div>
                      <div className="text-sm text-gray-400">
                        {new Date(project.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">
                      {project.views} views
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400">No recent activity</div>
                  <Button
                    onClick={() => setIsNewSeriesDialogOpen(true)}
                    className="mt-2 bg-red-600 hover:bg-red-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Series
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Series Tab */}
      {!loading && !error && mangaActiveTab === "series" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">My Series</h2>
            <Button
              onClick={() => setIsNewSeriesDialogOpen(true)}
              className="rounded-full px-6 py-2 text-base font-semibold bg-gradient-to-r from-red-500 to-red-700 text-white shadow hover:from-red-600 hover:to-red-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Series
            </Button>
          </div>

          {projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-gray-800 rounded-2xl shadow-sm flex flex-col overflow-hidden"
                >
                  <div className="relative flex-1 min-h-[320px] bg-gray-700 flex items-center justify-center">
                    <div className="absolute top-4 right-4">
                      <span
                        className={`text-white text-xs font-bold px-3 py-1 rounded-full ${
                          project.status === "Completed"
                            ? "bg-green-600"
                            : project.status === "In Progress"
                            ? "bg-blue-600"
                            : "bg-yellow-600"
                        }`}
                      >
                        {project.status}
                      </span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 rounded-lg bg-gray-600 flex items-center justify-center mb-2">
                        <ImageIcon className="w-10 h-10 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-white text-center mb-1">
                        {project.title}
                      </h3>
                      <p className="text-sm text-gray-400 text-center px-4">
                        {project.description}
                      </p>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="text-xs bg-gray-700 text-gray-300"
                        >
                          {project.genre}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Eye className="w-4 h-4" />
                        <span>{project.views}</span>
                      </div>
                    </div>
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Progress</span>
                        <span className="text-white font-medium">
                          {project.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Chapters</span>
                        <span className="text-white font-medium">
                          {project.chapters?.length || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Teams</span>
                        <span className="text-white font-medium">
                          {project.teams?.length || 0}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-gray-600 text-gray-200 hover:bg-gray-700"
                        onClick={() =>
                          onViewChange("project-detail", { id: project.id })
                        }
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-red-600 hover:bg-red-700"
                        onClick={() => setIsChapterUploadDialogOpen(true)}
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Upload Chapter
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ImageIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                No manga series found
              </h3>
              <p className="text-gray-400 mb-4">
                Create your first manga series to get started
              </p>
              <Button
                onClick={() => setIsNewSeriesDialogOpen(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Series
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {!loading && !error && mangaActiveTab === "analytics" && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Analytics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gray-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-white mb-4">
                Performance Overview
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Views</span>
                  <span className="text-white font-semibold">
                    {stats.totalViews.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Followers</span>
                  <span className="text-white font-semibold">
                    {stats.totalFollowers.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Active Teams</span>
                  <span className="text-white font-semibold">
                    {stats.activeTeams}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Chapters</span>
                  <span className="text-white font-semibold">
                    {stats.totalChapters}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-white mb-4">
                Top Performing Series
              </h3>
              <div className="space-y-3">
                {projects.slice(0, 3).map((project) => (
                  <div
                    key={project.id}
                    className="flex justify-between items-center"
                  >
                    <span className="text-gray-300 truncate">
                      {project.title}
                    </span>
                    <span className="text-white font-semibold">
                      {project.views}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-white mb-4">
                Recent Activity
              </h3>
              <div className="space-y-3">
                {chapters.slice(0, 3).map((chapter) => (
                  <div
                    key={chapter.id}
                    className="flex justify-between items-center"
                  >
                    <span className="text-gray-300 truncate">
                      Chapter {chapter.chapter_number}
                    </span>
                    <span className="text-white font-semibold">
                      {chapter.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
