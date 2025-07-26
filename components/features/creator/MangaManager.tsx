"use client";

import { useState } from "react";
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
} from "lucide-react";
import type { CurrentView } from "@/types";

interface MangaManagerProps {
  onViewChange: (view: CurrentView, params?: any) => void;
}

export function MangaManager({ onViewChange }: MangaManagerProps) {
  const [mangaActiveTab, setMangaActiveTab] = useState("dashboard");
  const [isNewSeriesDialogOpen, setIsNewSeriesDialogOpen] = useState(false);
  const [isLicenseDialogOpen, setIsLicenseDialogOpen] = useState(false);
  const [isChapterUploadDialogOpen, setIsChapterUploadDialogOpen] =
    useState(false);
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);

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

      {/* Dashboard Tab */}
      {mangaActiveTab === "dashboard" && (
        <div className="space-y-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gray-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Eye className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">45.6K</div>
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
                  <div className="text-2xl font-bold text-white">1,250</div>
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
                  <div className="text-2xl font-bold text-white">3</div>
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
                  <div className="text-2xl font-bold text-white">15</div>
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
              <div className="flex items-center gap-4 p-4 bg-gray-700 rounded-lg">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Upload className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium">
                    New chapter uploaded to "The Water Magician"
                  </div>
                  <div className="text-sm text-gray-400">2 hours ago</div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gray-700 rounded-lg">
                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium">
                    New team member joined "Digital Dreams"
                  </div>
                  <div className="text-sm text-gray-400">1 day ago</div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gray-700 rounded-lg">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <Award className="w-5 h-5 text-yellow-500" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium">
                    "The Water Magician" reached 1,000 followers
                  </div>
                  <div className="text-sm text-gray-400">3 days ago</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Series Tab */}
      {mangaActiveTab === "series" && (
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
}
