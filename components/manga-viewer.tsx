"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Play,
  MessageCircle,
  ThumbsUp,
  Loader2,
} from "lucide-react";
import type { CurrentView } from "@/types";
import { CommentSection } from "@/components/ui/comment-section";
import { supabase } from "@/lib/supabase";

interface MangaViewerProps {
  content: any;
  onViewChange: (view: CurrentView, content?: any) => void;
}

interface Chapter {
  id: string;
  title: string;
  content: string; // JSON string of page URLs
  status: string;
  release_date?: string;
}

interface AnimatedChapter {
  id: string;
  title: string;
  team: string;
  status: string;
  thumbnail_url?: string;
}

export function MangaViewer({ content, onViewChange }: MangaViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [showComments, setShowComments] = useState(true);
  const [chapterData, setChapterData] = useState<Chapter | null>(null);
  const [pageUrls, setPageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(false);

  // Reading settings
  const [readingMode, setReadingMode] = useState<
    "single" | "double" | "vertical"
  >("single");
  const [backgroundColor, setBackgroundColor] = useState<
    "white" | "dark" | "black"
  >("black");

  // Animated chapters
  const [animatedChapters, setAnimatedChapters] = useState<AnimatedChapter[]>(
    []
  );
  const [loadingAnimated, setLoadingAnimated] = useState(false);

  // Fetch chapter data when component mounts
  useEffect(() => {
    const fetchChapterData = async () => {
      console.log("MangaViewer: Fetching chapter data for:", {
        selectedChapterId: content?.selectedChapterId,
        content: content,
      });

      if (!content?.selectedChapterId) {
        setError("No chapter selected");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log(
          "MangaViewer: Fetching chapter with ID:",
          content.selectedChapterId
        );

        const { data, error } = await supabase
          .from("chapters")
          .select("*")
          .eq("id", content.selectedChapterId)
          .single();

        console.log("MangaViewer: Supabase response:", { data, error });

        if (error) {
          throw error;
        }

        if (data) {
          setChapterData(data);
          // Parse the content JSON to get page URLs
          try {
            const urls = JSON.parse(data.content);
            setPageUrls(Array.isArray(urls) ? urls : []);
            console.log("MangaViewer: Parsed page URLs:", urls);
          } catch (parseError) {
            console.error("Error parsing chapter content:", parseError);
            setPageUrls([]);
          }
        }
      } catch (err: any) {
        console.error("Error fetching chapter:", err);
        setError(err.message || "Failed to load chapter");
      } finally {
        setLoading(false);
      }
    };

    fetchChapterData();
  }, [content?.selectedChapterId]);

  // Fetch animated chapters for this chapter
  useEffect(() => {
    const fetchAnimatedChapters = async () => {
      if (!content?.selectedChapterId) return;

      try {
        setLoadingAnimated(true);
        // This would fetch from animated_chapters table when implemented
        // For now, we'll simulate empty results
        setAnimatedChapters([]);
      } catch (err) {
        console.error("Error fetching animated chapters:", err);
      } finally {
        setLoadingAnimated(false);
      }
    };

    fetchAnimatedChapters();
  }, [content?.selectedChapterId]);

  const totalPages = pageUrls.length;

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setPageLoading(true);
      setCurrentPage(currentPage - 1);
      // Reset loading after a short delay to simulate page load
      setTimeout(() => setPageLoading(false), 500);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setPageLoading(true);
      setCurrentPage(currentPage + 1);
      // Reset loading after a short delay to simulate page load
      setTimeout(() => setPageLoading(false), 500);
    }
  };

  const handlePageClick = (pageNum: number) => {
    if (pageNum !== currentPage) {
      setPageLoading(true);
      setCurrentPage(pageNum);
      // Reset loading after a short delay to simulate page load
      setTimeout(() => setPageLoading(false), 500);
    }
  };

  const handleChapterClick = (chapterTitle: string) => {
    // Find the chapter in the content's volumes
    for (const volume of content.volumes || []) {
      const chapter = volume.chapters?.find(
        (ch: any) => ch.title === chapterTitle
      );
      if (chapter) {
        onViewChange("manga", {
          ...(content as any),
          selectedChapter: chapterTitle,
          selectedChapterId: chapter.id,
          selectedVolume: volume,
        } as any);
        break;
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          handlePrevPage();
          break;
        case "ArrowRight":
          event.preventDefault();
          handleNextPage();
          break;
        case "Home":
          event.preventDefault();
          setCurrentPage(1);
          break;
        case "End":
          event.preventDefault();
          setCurrentPage(totalPages);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentPage, totalPages]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
          <p className="text-white">Loading chapter...</p>
        </div>
      </div>
    );
  }

  if (error || !chapterData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || "Chapter not found"}</p>
          <Button
            onClick={() => onViewChange("viewer")}
            className="bg-red-600 hover:bg-red-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Viewer
          </Button>
        </div>
      </div>
    );
  }

  if (totalPages === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">This chapter has no pages yet.</p>
          <Button
            onClick={() => onViewChange("viewer")}
            className="bg-red-600 hover:bg-red-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Viewer
          </Button>
        </div>
      </div>
    );
  }

  const getBackgroundColor = () => {
    switch (backgroundColor) {
      case "white":
        return "bg-white";
      case "dark":
        return "bg-gray-800";
      case "black":
        return "bg-black";
      default:
        return "bg-black";
    }
  };

  return (
    <div className={`min-h-screen ${getBackgroundColor()}`}>
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
                {content?.title} - {content?.selectedChapter}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Manga Reader */}
          <div className="lg:col-span-3">
            {/* Reader Controls */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1 || pageLoading}
                  className="bg-transparent border-gray-600 text-white"
                >
                  {pageLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <ChevronLeft className="w-4 h-4 mr-2" />
                  )}
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages || pageLoading}
                  className="bg-transparent border-gray-600 text-white"
                >
                  {pageLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  ) : (
                    <ChevronRight className="w-4 h-4 ml-2" />
                  )}
                  Next
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.max(50, zoom - 25))}
                  className="bg-transparent border-gray-600 text-white"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-400 min-w-[60px] text-center">
                  {zoom}%
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.min(200, zoom + 25))}
                  className="bg-transparent border-gray-600 text-white"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Manga Page */}
            <Card
              className={`${
                backgroundColor === "white" ? "bg-white" : "bg-gray-800"
              } border-gray-700 mb-6`}
            >
              <CardContent className="p-4">
                <div className="flex justify-center">
                  <div
                    className="relative max-w-full"
                    style={{
                      transform: `scale(${zoom / 100})`,
                      transformOrigin: "top center",
                    }}
                  >
                    {pageUrls[currentPage - 1] ? (
                      <img
                        src={pageUrls[currentPage - 1]}
                        alt={`Page ${currentPage}`}
                        className="max-w-full h-auto rounded-lg shadow-lg"
                        onError={(e) => {
                          console.error(
                            `Failed to load page ${currentPage}:`,
                            pageUrls[currentPage - 1]
                          );
                          e.currentTarget.src = "/placeholder.jpg";
                        }}
                        onLoad={() => {
                          // Image loaded successfully
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-64 bg-gray-700 rounded-lg">
                        <div className="text-center">
                          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-400">
                            Loading page {currentPage}...
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Page Navigation */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <Button
                variant="outline"
                onClick={handlePrevPage}
                disabled={currentPage === 1 || pageLoading}
                className="bg-transparent border-gray-600 text-white"
              >
                {pageLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ChevronLeft className="w-4 h-4 mr-2" />
                )}
                Previous Page
              </Button>
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, currentPage - 2) + i;
                  if (pageNum > totalPages) return null;
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageClick(pageNum)}
                      disabled={pageLoading}
                      className={
                        pageNum === currentPage
                          ? "bg-red-600"
                          : "bg-transparent border-gray-600 text-white"
                      }
                    >
                      {pageLoading && pageNum === currentPage ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        pageNum
                      )}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                onClick={handleNextPage}
                disabled={currentPage === totalPages || pageLoading}
                className="bg-transparent border-gray-600 text-white"
              >
                Next Page
                {pageLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <ChevronRight className="w-4 h-4 ml-2" />
                )}
              </Button>
            </div>

            {/* Animated Chapter Navigation */}
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Animated Chapters
                </h3>
                <Play className="w-5 h-5 text-gray-400" />
              </div>

              {loadingAnimated ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-2" />
                  <span className="text-gray-400">
                    Loading animated chapters...
                  </span>
                </div>
              ) : animatedChapters.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {animatedChapters.map((animatedChapter) => (
                    <Card
                      key={animatedChapter.id}
                      className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
                            <Play className="w-6 h-6 text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-white font-medium text-sm">
                              {animatedChapter.title}
                            </h4>
                            <p className="text-gray-400 text-xs">
                              by {animatedChapter.team}
                            </p>
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                animatedChapter.status === "Finalized"
                                  ? "bg-green-600 text-white"
                                  : animatedChapter.status === "In Progress"
                                  ? "bg-yellow-600 text-white"
                                  : "bg-gray-600 text-white"
                              }`}
                            >
                              {animatedChapter.status}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-800 rounded-lg border border-gray-700">
                  <Play className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">
                    No animated chapters available for this chapter yet.
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    Check back later for community-created animations!
                  </p>
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div>
              <div className="flex items-center gap-4 mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Chapter Comments
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
                  contentType="chapter"
                  contentId={content?.selectedChapterId || content?.id || ""}
                  title=""
                />
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-800 border-gray-700 mb-6">
              <CardContent className="p-4">
                <h3 className="font-semibold text-white mb-3">
                  Chapter Navigation
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {content?.volumes?.map((volume: any) =>
                    volume.chapters?.map((chapter: any) => (
                      <Button
                        key={chapter.id}
                        variant={
                          chapter.title === content?.selectedChapter
                            ? "default"
                            : "ghost"
                        }
                        onClick={() => handleChapterClick(chapter.title)}
                        className={`w-full justify-start text-sm ${
                          chapter.title === content?.selectedChapter
                            ? "bg-red-600 hover:bg-red-700"
                            : "text-gray-300 hover:text-white hover:bg-gray-700"
                        }`}
                      >
                        {chapter.title}
                      </Button>
                    ))
                  ) || []}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <h3 className="font-semibold text-white mb-3">
                  Reading Settings
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">
                      Reading Mode
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          id="single"
                          name="mode"
                          checked={readingMode === "single"}
                          onChange={() => setReadingMode("single")}
                          className="text-red-600"
                        />
                        <label htmlFor="single" className="text-white text-sm">
                          Single Page
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          id="double"
                          name="mode"
                          checked={readingMode === "double"}
                          onChange={() => setReadingMode("double")}
                          className="text-red-600"
                        />
                        <label htmlFor="double" className="text-white text-sm">
                          Double Page
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          id="vertical"
                          name="mode"
                          checked={readingMode === "vertical"}
                          onChange={() => setReadingMode("vertical")}
                          className="text-red-600"
                        />
                        <label
                          htmlFor="vertical"
                          className="text-white text-sm"
                        >
                          Vertical Scroll
                        </label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">
                      Background
                    </label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setBackgroundColor("white")}
                        className={`${
                          backgroundColor === "white"
                            ? "bg-white text-black border-white"
                            : "bg-transparent text-white border-gray-600 hover:bg-gray-700"
                        }`}
                      >
                        White
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setBackgroundColor("dark")}
                        className={`${
                          backgroundColor === "dark"
                            ? "bg-gray-800 text-white border-gray-800"
                            : "bg-transparent text-white border-gray-600 hover:bg-gray-700"
                        }`}
                      >
                        Dark
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setBackgroundColor("black")}
                        className={`${
                          backgroundColor === "black"
                            ? "bg-black text-white border-black"
                            : "bg-transparent text-white border-gray-600 hover:bg-gray-700"
                        }`}
                      >
                        Black
                      </Button>
                    </div>
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

export default MangaViewer;
