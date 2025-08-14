"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  Maximize,
  Settings,
  ThumbsUp,
  ThumbsDown,
  Share,
  MessageCircle,
} from "lucide-react";
import type { CurrentView } from "@/types";
import { CommentSection } from "@/components/ui/comment-section";

interface VideoPlayerProps {
  content: any;
  onViewChange: (view: CurrentView) => void;
}

export function VideoPlayer({ content, onViewChange }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showComments, setShowComments] = useState(true);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation Bar */}
      <nav className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => onViewChange("viewer")}
                className="text-gray-300 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="text-lg font-semibold text-white">
                {content?.title} - {content?.selectedEpisode}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <Card className="bg-black border-gray-700 mb-6">
              <CardContent className="p-0">
                <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden">
                  <img
                    src="/placeholder.svg?height=480&width=854"
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button
                      size="lg"
                      className="rounded-full w-16 h-16 bg-red-600 hover:bg-red-700"
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? (
                        <Pause className="w-6 h-6" />
                      ) : (
                        <Play className="w-6 h-6" />
                      )}
                    </Button>
                  </div>

                  {/* Video Controls */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <div className="flex items-center gap-4">
                      <Button variant="ghost" size="sm" className="text-white">
                        {isPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                      <div className="flex-1 bg-gray-600 h-1 rounded">
                        <div className="bg-red-600 h-1 rounded w-1/3"></div>
                      </div>
                      <span className="text-white text-sm">8:32 / 24:15</span>
                      <Button variant="ghost" size="sm" className="text-white">
                        <Volume2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-white">
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-white">
                        <Maximize className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Video Info */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white mb-2">
                {content?.title}
              </h1>
              <p className="text-gray-400 mb-4">{content?.selectedEpisode}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    className="bg-transparent border-gray-600 text-white"
                  >
                    <ThumbsUp className="w-4 h-4 mr-2" />
                    1.2K
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-transparent border-gray-600 text-white"
                  >
                    <ThumbsDown className="w-4 h-4 mr-2" />
                    23
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-transparent border-gray-600 text-white"
                  >
                    <Share className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
                <div className="text-sm text-gray-400">
                  15K views • 2 days ago
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div>
              <div className="flex items-center gap-4 mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Comments (234)
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowComments(!showComments)}
                  className="text-gray-400"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {showComments ? "Hide" : "Show"}
                </Button>
              </div>

              {showComments && (
                <CommentSection
                  contentType="episode"
                  contentId={content?.selectedEpisodeId || content?.id || ""}
                  title={content?.selectedEpisode}
                />
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-800 border-gray-700 mb-6">
              <CardContent className="p-4">
                <h3 className="font-semibold text-white mb-3">Up Next</h3>
                <div className="space-y-3">
                  {[
                    "Episode 2: First Flight",
                    "Episode 3: The Ancient Temple",
                  ].map((episode, index) => (
                    <div
                      key={index}
                      className="flex gap-3 cursor-pointer hover:bg-gray-700 p-2 rounded"
                    >
                      <img
                        src="/placeholder.svg?height=60&width=100"
                        alt={episode}
                        className="w-16 h-10 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">
                          {episode}
                        </p>
                        <p className="text-xs text-gray-400">24:32</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <h3 className="font-semibold text-white mb-3">
                  About this Animation
                </h3>
                <p className="text-sm text-gray-300 mb-4">
                  {content?.synopsis}
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Animation Team:</span>
                    <span className="text-white">Dragon Animators</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Release Date:</span>
                    <span className="text-white">July 15, 2025</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Runtime:</span>
                    <span className="text-white">24:15</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoPlayer;
