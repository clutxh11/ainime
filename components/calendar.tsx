"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
  Clock,
  Users,
  Play,
} from "lucide-react";
import type { CurrentView } from "@/types";
import { ProfileModal } from "@/components/profile-modal";
import { ProfileDropdown } from "@/components/shared/profile-dropdown";
import { SettingsModal } from "@/components/settings-modal";
import { ContributionsModal } from "@/components/contributions-modal";

interface CalendarEvent {
  id: string;
  title: string;
  type: "release" | "deadline" | "meeting" | "community";
  time: string;
  description: string;
  participants?: number;
  status: "upcoming" | "live" | "completed";
  contentType?: "manga" | "animated";
}

const mockEvents: Record<string, CalendarEvent[]> = {
  TODAY: [
    {
      id: "1",
      title: "Dragon's Legacy Chapter 4",
      type: "release",
      time: "8:00am",
      description: "New manga chapter release",
      status: "upcoming",
      contentType: "manga",
    },
    {
      id: "2",
      title: "Team Meeting - Cyber Studio",
      type: "meeting",
      time: "2:00pm",
      description: "Weekly progress review",
      participants: 5,
      status: "upcoming",
    },
  ],
  TUE: [
    {
      id: "3",
      title: "Animation Deadline",
      type: "deadline",
      time: "11:59pm",
      description: "Episode 2 final submission",
      status: "upcoming",
    },
  ],
  WED: [
    {
      id: "4",
      title: "Community Showcase",
      type: "community",
      time: "7:00pm",
      description: "Monthly animation showcase event",
      participants: 150,
      status: "upcoming",
    },
  ],
  THU: [],
  FRI: [
    {
      id: "5",
      title: "Magical Academy Ep 3",
      type: "release",
      time: "9:00am",
      description: "New episode premiere",
      status: "upcoming",
      contentType: "animated",
    },
  ],
  SAT: [],
  SUN: [],
};

interface CalendarProps {
  onViewChange: (view: CurrentView, data?: any) => void;
}

export function Calendar({ onViewChange }: CalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(0);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isContributionsModalOpen, setIsContributionsModalOpen] =
    useState(false);

  const days = ["TODAY", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const dates = ["7/15", "7/16", "7/17", "7/18", "7/19", "7/20", "7/21"];

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "release":
        return "bg-green-600";
      case "deadline":
        return "bg-red-600";
      case "meeting":
        return "bg-blue-600";
      case "community":
        return "bg-purple-600";
      default:
        return "bg-gray-600";
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case "release":
        return <Play className="w-3 h-3" />;
      case "deadline":
        return <Clock className="w-3 h-3" />;
      case "meeting":
        return <Users className="w-3 h-3" />;
      case "community":
        return <CalendarIcon className="w-3 h-3" />;
      default:
        return <CalendarIcon className="w-3 h-3" />;
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (event.type === "release" && event.contentType) {
      if (event.contentType === "animated") {
        onViewChange("video", {
          title: event.title,
          selectedEpisode: "Episode 1",
        });
      } else if (event.contentType === "manga") {
        onViewChange("manga", {
          title: event.title,
          selectedChapter: "Chapter 1",
        });
      }
    }
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
                Back to Viewer
              </Button>
              <div className="text-2xl font-bold text-red-500">
                Production Calendar
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                className="text-white hover:text-red-400"
                onClick={() => onViewChange("creator")}
              >
                Creator Hub
              </Button>
              <ProfileDropdown
                onSettingsClick={() => setIsSettingsModalOpen(true)}
                onContributionsClick={() => setIsContributionsModalOpen(true)}
                onSignInClick={() => {}}
              />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Release Calendar
            </h1>
            <p className="text-gray-400">
              Track releases, deadlines, and community events
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <Button className="bg-orange-600 hover:bg-orange-700">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Release Calendar
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filter Options */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <input
              type="radio"
              id="premium"
              name="filter"
              defaultChecked
              className="text-blue-600"
            />
            <label htmlFor="premium" className="text-white text-sm">
              Premium Episodes
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="radio"
              id="free"
              name="filter"
              className="text-blue-600"
            />
            <label htmlFor="free" className="text-white text-sm">
              Free New Episodes
            </label>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-4">
          {days.map((day, index) => (
            <div key={day} className="min-h-[400px]">
              <div className="text-center mb-4">
                <h3
                  className={`font-bold text-lg ${
                    day === "TODAY" ? "text-orange-400" : "text-white"
                  }`}
                >
                  {day}
                </h3>
                <p className="text-gray-400 text-sm">{dates[index]}</p>
              </div>

              <div className="space-y-3">
                {mockEvents[day]?.length > 0 ? (
                  mockEvents[day].map((event) => (
                    <Card
                      key={event.id}
                      className={`bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors ${
                        event.type === "release" ? "cursor-pointer" : ""
                      }`}
                      onClick={() =>
                        event.type === "release"
                          ? handleEventClick(event)
                          : undefined
                      }
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2 mb-2">
                          <Badge
                            className={`${getEventTypeColor(
                              event.type
                            )} text-xs px-1 py-0.5`}
                          >
                            {getEventTypeIcon(event.type)}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-400 mb-1">
                              {event.time}
                            </p>
                            <h4 className="font-semibold text-white text-sm leading-tight mb-1">
                              {event.title}
                            </h4>
                            <p className="text-xs text-gray-400 line-clamp-2">
                              {event.description}
                            </p>
                            {event.participants && (
                              <div className="flex items-center gap-1 mt-2">
                                <Users className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-400">
                                  {event.participants}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        {event.type === "release" && (
                          <div className="mt-2">
                            <img
                              src="/placeholder.svg?height=60&width=100"
                              alt={event.title}
                              className="w-full h-12 object-cover rounded"
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">
                      Schedule Coming Soon
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-8 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-600 rounded"></div>
            <span className="text-sm text-gray-400">Releases</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 rounded"></div>
            <span className="text-sm text-gray-400">Deadlines</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-600 rounded"></div>
            <span className="text-sm text-gray-400">Team Meetings</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-600 rounded"></div>
            <span className="text-sm text-gray-400">Community Events</span>
          </div>
        </div>
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
    </div>
  );
}
