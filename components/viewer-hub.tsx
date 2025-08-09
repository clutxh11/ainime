"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  MessageCircle,
  Star,
  CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  BookOpen,
  Loader2,
} from "lucide-react";
import type {
  CurrentView,
  ContentItem,
  ComponentWithViewChange,
} from "@/types";
import { useModalStates } from "@/hooks/useModalStates";
import { APP_CONFIG } from "@/lib/constants";
import { ProfileModal } from "@/components/profile-modal";
import { SettingsModal } from "@/components/settings-modal";
import { ContributionsModal } from "@/components/contributions-modal";
import { ProfileDropdown } from "@/components/shared/profile-dropdown";
import { supabase } from "@/lib/supabase";
import {
  getProjectsWithRatings,
  getUserRating,
  submitRating,
} from "@/features/series/services/rating-utils";
import { RatingStars } from "@/components/ui/rating-stars";
import React from "react";
import { CommentSection } from "@/components/ui/comment-section";
import { SearchDropdown } from "@/components/ui/search-dropdown";
import { useAuth } from "@/components/auth/auth-provider";
import { AuthModal } from "@/components/auth/auth-modal";
import { HierarchicalDropdown } from "@/components/ui/hierarchical-dropdown";
// import { UserProfile } from "@/components/auth/user-profile";

interface ViewerHubProps extends ComponentWithViewChange {}

interface Project {
  id: string;
  title: string;
  description: string;
  genre: string;
  genres?: string[]; // Added for multiple genres
  series_type?: string; // Added for manga/manhwa/manhua
  tags?: string[]; // Added for tags
  status: string;
  views: number;
  progress: number;
  image_url?: string;
  square_thumbnail_url?: string; // Added for square thumbnail
  horizontal_thumbnail_url?: string; // Added for hero banner
  creator_id: string;
  creator_display_name?: string;
  created_at: string;
  updated_at: string;
  average_rating: number;
  total_ratings: number;
  users?: {
    username: string;
    avatar_url?: string;
  };
  chapters?: {
    id: string;
    title: string;
    status: string;
    thumbnail_url?: string;
    release_date?: string;
    created_at: string;
    updated_at: string;
  }[];
  volumes?: Array<{
    id: string;
    volume_number: number;
    title: string;
    description?: string;
    chapters: Array<{
      id: string;
      title: string;
      status: string;
      release_date?: string;
    }>;
  }>;
}

export function ViewerHub({ onViewChange }: ViewerHubProps) {
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user } = useAuth();
  // Handle search result click
  const handleSearchResultClick = useCallback((result: any) => {
    // Convert search result to ContentItem format
    const contentItem: ContentItem = {
      id: result.id,
      title: result.title,
      synopsis: result.description,
      type: result.type,
      genre: result.genre,
      status: result.status,
      rating: result.rating,
      progress: result.progress || 0,
      image: result.image_url || "/placeholder.jpg",
      creator: result.users?.username || "Unknown Creator",
      tags: [result.genre, result.status],
      // episodes/chapters omitted; use volumes only
      volumes: [],
    };

    setSelectedContent(contentItem);
    setIsModalOpen(true);
  }, []);

  // Remove the old searchTerm state since SearchDropdown manages its own state
  // const [searchTerm, setSearchTerm] = useState("");

  // Data states
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use centralized modal state management
  const { modalStates, openModal, closeModal } = useModalStates();

  // Fetch projects from Supabase
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);

      // Fetch projects with ratings (lightweight). Fallback to direct query if empty.
      let projectsData = await getProjectsWithRatings();
      if (!projectsData || projectsData.length === 0) {
        const { data: directProjects, error: directErr } = await supabase
          .from("projects")
          .select(
            `id, title, description, genre, status, image_url, square_thumbnail_url, horizontal_thumbnail_url, creator_id, created_at, updated_at`
          )
          .order("created_at", { ascending: false });
        if (!directErr && directProjects) {
          projectsData = (directProjects as any[]).map((p) => ({
            ...p,
            average_rating: 0,
            total_ratings: 0,
          }));
        }
      }
      setProjects(projectsData || []);

      // Fetch volumes and chapters for each project
      const projectsWithVolumes = await Promise.all(
        projectsData.map(async (project) => {
          const { data: volumesData, error: volumesError } = await supabase
            .from("volumes")
            .select(
              `
              id,
              volume_number,
              title,
              description,
              chapters (
                id,
                title,
                status,
                release_date
              )
            `
            )
            .eq("project_id", project.id)
            .order("volume_number", { ascending: true });

          if (volumesError) {
            console.error("Error fetching volumes:", volumesError);
            return project;
          }

          return {
            ...project,
            volumes: volumesData || [],
          };
        })
      );

      // Fetch creator information for each project
      const projectsWithCreators = await Promise.all(
        projectsWithVolumes.map(async (project) => {
          const { data: creatorData, error: creatorError } = await supabase
            .from("user_profiles_public")
            .select("display_name")
            .eq("id", project.creator_id)
            .single();

          if (creatorError) {
            console.error("Error fetching creator:", creatorError);
            return {
              ...project,
              creator_display_name: "Unknown Creator",
            };
          }

          return {
            ...project,
            creator_display_name:
              creatorData?.display_name || "Unknown Creator",
          };
        })
      );

      setProjects(projectsWithCreators);

      // Fetch user ratings for all projects
      const ratings: Record<string, number> = {};
      for (const project of projectsWithCreators) {
        const userRating = await getUserRating(project.id);
        ratings[project.id] = userRating;
      }
      setUserRatings(ratings);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Utility function to truncate synopsis
  const truncateSynopsis = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + "...";
  };

  // Convert projects to ContentItem format for compatibility
  const contentItems: ContentItem[] = useMemo(() => {
    return projects.map((project) => ({
      id: project.id,
      title: project.title,
      synopsis: truncateSynopsis(project.description), // Truncate synopsis
      type: "animated" as const,
      genre: project.genre,
      status: project.status,
      rating: project.average_rating || 0,
      totalRatings: project.total_ratings || 0,
      progress: project.progress,
      seriesType: project.series_type, // Added for series type display
      image:
        project.square_thumbnail_url || project.image_url || "/placeholder.jpg", // Use square thumbnail for cards
      heroImage:
        project.horizontal_thumbnail_url ||
        project.image_url ||
        "/placeholder.jpg", // Use horizontal thumbnail for hero
      creator: project.creator_display_name,
      tags: project.tags || [project.genre, project.status], // Use database tags if available, fallback to genre/status
      authors: [], // Empty since we don't have authors table anymore
      // episodes/chapters omitted; use volumes only
      volumes:
        project.volumes?.map((volume) => ({
          id: volume.id,
          volume_number: volume.volume_number,
          title: volume.title,
          description: volume.description,
          chapters:
            volume.chapters?.map((chapter) => ({
              id: chapter.id,
              title: chapter.title,
              status: chapter.status,
              release_date: chapter.release_date,
            })) || [],
        })) || [],
    }));
  }, [projects]);

  // Remove the old filteredContent logic since SearchDropdown handles its own search
  // const filteredContent = useMemo(() => {
  //   if (!searchTerm) return contentItems;
  //   return contentItems.filter(
  //     (item) =>
  //       item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //       item.tags.some((tag) =>
  //         tag.toLowerCase().includes(searchTerm.toLowerCase())
  //       )
  //   );
  // }, [contentItems]);

  // Stable callback functions to prevent re-renders
  const handleContentSelect = useCallback((content: ContentItem) => {
    setSelectedContent(content);
    setIsModalOpen(true);
  }, []);

  const handlePlayContent = useCallback(
    (content: ContentItem) => {
      if (content.type === "animated" || content.volumes) {
        onViewChange("video", content);
      } else {
        onViewChange("manga", content);
      }
    },
    [onViewChange]
  );

  const handleWatchEpisode = useCallback(
    (content: ContentItem, episodeTitle: string) => {
      console.log("handleWatchEpisode called with:", { content, episodeTitle });
      // Find the episode object to get the ID
      const episode = content.volumes?.find((vol) =>
        vol.chapters?.some((ch) => ch.title === episodeTitle)
      );
      const foundChapter = episode?.chapters?.find(
        (ch) => ch.title === episodeTitle
      );

      onViewChange("video", {
        ...content,
        selectedEpisode: episodeTitle,
        selectedEpisodeId: foundChapter?.id || content.id, // Use episode ID if available, fallback to content ID
      });
    },
    [onViewChange]
  );

  const handleReadChapter = (content: ContentItem, chapterTitle: string) => {
    console.log("handleReadChapter called with:", { content, chapterTitle });

    // Look for the chapter in all volumes
    let foundChapter = null;
    let foundVolume = null;

    for (const volume of content.volumes || []) {
      console.log("Searching volume:", volume.title);
      const chapter = volume.chapters?.find((ch) => ch.title === chapterTitle);
      if (chapter) {
        foundChapter = chapter;
        foundVolume = volume;
        console.log("Found chapter:", chapter);
        break;
      }
    }

    if (!foundChapter) {
      console.error("Chapter not found:", chapterTitle);
      console.log("Available volumes:", content.volumes);
      return;
    }

    console.log("Opening manga viewer with:", {
      selectedChapter: chapterTitle,
      selectedChapterId: foundChapter.id,
      selectedVolume: foundVolume,
    });

    onViewChange("manga", {
      ...content,
      selectedChapter: chapterTitle,
      selectedChapterId: foundChapter.id,
      selectedVolume: foundVolume,
    });
  };

  const handleRatingChange = async (projectId: string, rating: number) => {
    try {
      const result = await submitRating(projectId, rating);
      if (result.success) {
        // Update local state
        setUserRatings((prev) => ({ ...prev, [projectId]: rating }));

        // Refresh projects to get updated average ratings
        const updatedProjects = await getProjectsWithRatings();
        setProjects(updatedProjects);
      } else {
        console.error("Failed to submit rating:", result.error);
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
    }
  };

  // Completely isolated Hero Section Component
  const HeroSection = React.memo(() => {
    const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
    const [autoPlay, setAutoPlay] = useState(true);

    useEffect(() => {
      if (!autoPlay || contentItems.length === 0) return;

      const interval = setInterval(() => {
        setCurrentHeroIndex((prev) => (prev + 1) % contentItems.length);
      }, 6000);
      return () => clearInterval(interval);
    }, [autoPlay, contentItems.length]);

    const goToPrevious = useCallback(() => {
      setAutoPlay(false);
      setCurrentHeroIndex(
        (prev) => (prev - 1 + contentItems.length) % contentItems.length
      );
    }, [contentItems.length]);

    const goToNext = useCallback(() => {
      setAutoPlay(false);
      setCurrentHeroIndex((prev) => (prev + 1) % contentItems.length);
    }, [contentItems.length]);

    if (contentItems.length === 0) {
      return (
        <div className="relative h-[500px] overflow-hidden bg-gray-800 flex items-center justify-center">
          <div className="text-center">
            <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              No Featured Content
            </h2>
            <p className="text-gray-400">Check back later for new animations</p>
          </div>
        </div>
      );
    }

    const currentHero = contentItems[currentHeroIndex];

    return (
      <div className="relative h-[500px] overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent z-10" />
        <img
          src={currentHero.heroImage || currentHero.image}
          alt={currentHero.title}
          className="w-full h-full object-cover transition-all duration-1000"
        />

        {/* Navigation arrows - ALWAYS VISIBLE */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            goToPrevious();
          }}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full z-30 transition-all duration-300"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            goToNext();
          }}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full z-30 transition-all duration-300"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-8 z-20">
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 mb-4">
              <Badge className="bg-red-600">{currentHero.genre}</Badge>
              <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                {currentHero.status}
              </Badge>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              {currentHero.title}
            </h1>
            <p className="text-gray-300 mb-6 max-w-2xl">
              {currentHero.synopsis}
            </p>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => handleContentSelect(currentHero)}
                className="bg-red-600 hover:bg-red-700 px-8 py-3 text-lg"
              >
                <Play className="w-5 h-5 mr-2" />
                Watch Now
              </Button>
            </div>
          </div>
        </div>

        {/* Progress indicators */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-30">
          {contentItems.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setAutoPlay(false);
                setCurrentHeroIndex(index);
              }}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentHeroIndex
                  ? "bg-white"
                  : "bg-white/50 hover:bg-white/75"
              }`}
            />
          ))}
        </div>
      </div>
    );
  });

  // Memoized Continue Watching Card Component
  const ContinueWatchingCard = React.memo(({ item }: { item: ContentItem }) => (
    <Card
      className="min-w-[350px] bg-gray-800 border-gray-700 hover:bg-gray-700 transition-colors cursor-pointer"
      onClick={() => {
        onViewChange("video", item as any);
      }}
    >
      <CardContent className="p-0">
        <div className="flex">
          <div className="relative w-32 h-20">
            <img
              src={item.image || "/placeholder.svg"}
              alt={item.title}
              className="w-full h-full object-cover rounded-l-lg"
            />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Play className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex-1 p-3">
            <h3 className="font-semibold text-white text-sm mb-1">
              {item.title}
            </h3>
            <p className="text-xs text-gray-400 mb-2">Continue</p>
            <Progress value={item.progress} className="h-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  ));

  // Memoized Enhanced Content Card with Individual Hover State
  const ContentCard = React.memo(
    ({
      item,
      sectionId,
      onContentSelect,
      onPlayContent,
    }: {
      item: ContentItem;
      sectionId: string;
      onContentSelect: (content: ContentItem) => void;
      onPlayContent: (content: ContentItem) => void;
    }) => {
      const [isHovered, setIsHovered] = useState(false);

      return (
        <div
          className="relative min-w-[250px] group"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <Card className="bg-gray-800 border-gray-700 hover:bg-gray-700 transition-colors cursor-pointer">
            <CardContent className="p-0">
              <div className="relative overflow-hidden">
                <img
                  src={item.image || "/placeholder.svg"}
                  alt={item.title}
                  className="w-full h-[300px] object-cover rounded-t-lg"
                />
                <Badge
                  className={`absolute top-2 right-2 ${
                    item.type === "animated"
                      ? "bg-red-600"
                      : item.type === "ongoing"
                      ? "bg-yellow-600"
                      : "bg-blue-600"
                  }`}
                >
                  {item.type === "animated"
                    ? "Animated"
                    : item.type === "ongoing"
                    ? "Ongoing"
                    : "Manga"}
                </Badge>

                {/* Individual hover overlay */}
                <div
                  className={`absolute inset-0 bg-black/70 flex flex-col justify-end p-4 transition-opacity duration-300 ${
                    isHovered ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <div className="text-white space-y-2">
                    <div className="flex items-center gap-4 text-sm">
                      {item.volumes && (
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          <span>{item.volumes.length} volumes</span>
                        </div>
                      )}
                      {item.episodes && (
                        <div className="flex items-center gap-1">
                          <Play className="w-4 h-4" />
                          <span>{item.episodes.length} episodes</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-300 line-clamp-3">
                      {item.synopsis}
                    </p>
                    {item.authors && item.authors.length > 0 && (
                      <div className="text-xs text-gray-300">
                        <span className="font-medium">By: </span>
                        {item.authors.map((author) => author.name).join(", ")}
                      </div>
                    )}
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayContent(item);
                      }}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {item.type === "animated" ? "Watch" : "Read"}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-white mb-2 line-clamp-2 group-hover:text-red-400 transition-colors">
                  {item.title}
                </h3>
                <div className="flex items-center gap-1 mb-2">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm text-gray-300">
                    {(item.rating || 0).toFixed(2)} ({item.totalRatings || 0})
                  </span>
                </div>
                {item.authors && item.authors.length > 0 && (
                  <div className="text-xs text-gray-400 mb-2">
                    by {item.authors.map((author) => author.name).join(", ")}
                  </div>
                )}
                <div className="flex flex-wrap gap-1">
                  {(item.tags || []).slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  );

  // Memoized Content Carousel Component
  const ContentCarousel = React.memo(
    ({
      title,
      items,
      showProgress = false,
      category,
      sectionId,
      onContentSelect,
      onPlayContent,
      onViewChange,
    }: {
      title: string;
      items: ContentItem[];
      showProgress?: boolean;
      category?: string;
      sectionId: string;
      onContentSelect: (content: ContentItem) => void;
      onPlayContent: (content: ContentItem) => void;
      onViewChange: (
        view: CurrentView,
        content?: ContentItem,
        category?: string
      ) => void;
    }) => {
      const [canScrollLeft, setCanScrollLeft] = useState(false);
      const [canScrollRight, setCanScrollRight] = useState(false);

      const checkScrollability = useCallback(() => {
        const container = document.getElementById(`carousel-${sectionId}`);
        if (!container) return;

        const { scrollLeft, scrollWidth, clientWidth } = container;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1); // -1 for rounding
      }, [sectionId]);

      useEffect(() => {
        const container = document.getElementById(`carousel-${sectionId}`);
        if (!container) return;

        // Initial check
        checkScrollability();

        // Add scroll listener
        container.addEventListener("scroll", checkScrollability);

        // Add resize listener to handle dynamic content changes
        const resizeObserver = new ResizeObserver(checkScrollability);
        resizeObserver.observe(container);

        return () => {
          container.removeEventListener("scroll", checkScrollability);
          resizeObserver.disconnect();
        };
      }, [checkScrollability, sectionId]);

      const scrollLeft = useCallback(() => {
        const container = document.getElementById(`carousel-${sectionId}`);
        if (container) {
          container.scrollBy({ left: -500, behavior: "smooth" });
        }
      }, [sectionId]);

      const scrollRight = useCallback(() => {
        const container = document.getElementById(`carousel-${sectionId}`);
        if (container) {
          container.scrollBy({ left: 500, behavior: "smooth" });
        }
      }, [sectionId]);

      return (
        <div className="mb-8 group">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            {category && !showProgress && (
              <Button
                variant="outline"
                className="bg-transparent border-gray-600 text-white hover:bg-gray-700"
                onClick={() =>
                  onViewChange("content-explorer", undefined, category)
                }
              >
                View More
              </Button>
            )}
          </div>
          <div className="relative">
            {/* Dynamic Navigation arrows - only show when scrolling is possible */}
            {canScrollLeft && (
              <button
                className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white p-3 rounded-full z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                onClick={scrollLeft}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            {canScrollRight && (
              <button
                className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white p-3 rounded-full z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                onClick={scrollRight}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* Scrollable content with better spacing and stable position */}
            <div
              id={`carousel-${sectionId}`}
              className="flex gap-6 overflow-x-auto scrollbar-hide pb-4"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              {items.map((item) =>
                showProgress ? (
                  <ContinueWatchingCard key={item.id} item={item} />
                ) : (
                  <div key={item.id} onClick={() => onContentSelect(item)}>
                    <ContentCard
                      item={item}
                      sectionId={sectionId}
                      onContentSelect={onContentSelect}
                      onPlayContent={onPlayContent}
                    />
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      );
    }
  );

  // Better content distribution for scrolling - MEMOIZED to prevent re-renders
  const continueWatchingItems = useMemo(
    () => contentItems.filter((item) => item.progress && item.progress > 0),
    [contentItems]
  );
  const trendingAnimeItems = useMemo(
    () => contentItems.filter((item) => item.type === "animated"),
    [contentItems]
  );
  const newMangaItems = useMemo(
    () => contentItems.filter((item) => item.type === "manga"),
    [contentItems]
  );
  const fanFavoriteItems = useMemo(
    () => [...contentItems].sort((a, b) => (b.rating || 0) - (a.rating || 0)),
    [contentItems]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
        <p className="text-white ml-4">Loading content...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-red-500 text-lg">{error}</p>
        <Button onClick={fetchProjects} className="ml-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Add custom CSS for hiding scrollbars */}
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Navigation Bar */}
      <nav className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="text-2xl font-bold text-red-500">
                {APP_CONFIG.name}
              </div>
              <div className="hidden md:flex items-center gap-6">
                <Button
                  variant="ghost"
                  className="text-white hover:text-red-400"
                  onClick={() =>
                    onViewChange("content-explorer", undefined, "all")
                  }
                >
                  Browse
                </Button>
                <Button
                  variant="ghost"
                  className="text-white hover:text-red-400"
                  onClick={() => onViewChange("calendar")}
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Calendar
                </Button>
                <Button
                  variant="ghost"
                  className="text-white hover:text-red-400"
                  onClick={() => onViewChange("creator")}
                >
                  Creator Hub
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <SearchDropdown
                placeholder="Search anime & manga..."
                onResultClick={handleSearchResultClick}
                className="w-80"
              />
              <ProfileDropdown
                onSettingsClick={() => openModal("isSettingsModalOpen")}
                onContributionsClick={() =>
                  openModal("isContributionsModalOpen")
                }
                onSignInClick={() => setShowAuthModal(true)}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - ARROWS ONLY NAVIGATION */}
      <HeroSection />

      {/* Content Sections with better distribution */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ContentCarousel
          title="Continue Watching/Reading"
          items={continueWatchingItems}
          showProgress={true}
          category="continue-watching"
          sectionId="continue-watching"
          onContentSelect={handleContentSelect}
          onPlayContent={handlePlayContent}
          onViewChange={onViewChange}
        />
        <ContentCarousel
          title="Trending Anime"
          items={trendingAnimeItems}
          category="trending"
          sectionId="trending-anime"
          onContentSelect={handleContentSelect}
          onPlayContent={handlePlayContent}
          onViewChange={onViewChange}
        />
        <ContentCarousel
          title="New Manga Releases"
          items={newMangaItems}
          category="manga"
          sectionId="new-manga"
          onContentSelect={handleContentSelect}
          onPlayContent={handlePlayContent}
          onViewChange={onViewChange}
        />
        <ContentCarousel
          title="Fan-Favorite Projects"
          items={fanFavoriteItems}
          category="favorites"
          sectionId="fan-favorites"
          onContentSelect={handleContentSelect}
          onPlayContent={handlePlayContent}
          onViewChange={onViewChange}
        />
      </div>

      {/* Content Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {selectedContent?.title}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Created by {selectedContent?.creator || "Unknown Creator"}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="grid md:grid-cols-3 gap-6 pr-2 pb-8">
              <div className="md:col-span-1">
                <img
                  src={selectedContent?.image || "/placeholder.svg"}
                  alt={selectedContent?.title}
                  className="w-full rounded-lg"
                />
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <RatingStars
                      rating={selectedContent?.rating || 0}
                      totalRatings={selectedContent?.totalRatings || 0}
                      userRating={userRatings[selectedContent?.id || ""] || 0}
                      onRatingChange={(rating) =>
                        handleRatingChange(selectedContent?.id || "", rating)
                      }
                      interactive={true}
                      size="lg"
                      showTotal={true}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {/* Genre badges */}
                    {selectedContent?.genre && (
                      <Badge
                        key="genre"
                        variant="secondary"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {selectedContent.genre}
                      </Badge>
                    )}
                    {/* Status badge */}
                    {selectedContent?.status && (
                      <Badge
                        key="status"
                        variant="secondary"
                        className="bg-gray-600 hover:bg-gray-700"
                      >
                        {selectedContent.status}
                      </Badge>
                    )}
                    {/* Series type badge */}
                    {selectedContent?.seriesType && (
                      <Badge
                        key="seriesType"
                        variant="secondary"
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {selectedContent.seriesType === "manga"
                          ? "Manga"
                          : selectedContent.seriesType === "manhwa"
                          ? "Manhwa"
                          : selectedContent.seriesType === "manhua"
                          ? "Manhua"
                          : selectedContent.seriesType}
                      </Badge>
                    )}
                  </div>

                  {/* Tags section */}
                  {selectedContent?.tags && selectedContent.tags.length > 0 && (
                    <div className="mb-2">
                      <div className="text-sm text-gray-400 mb-1">Tags:</div>
                      <div className="flex flex-wrap gap-1">
                        {selectedContent.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs border-gray-500 text-gray-300"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="text-sm text-gray-300 mb-2">
                    <span className="font-medium">Creator: </span>
                    {selectedContent?.creator || "Unknown Creator"}
                  </div>
                  {selectedContent?.authors &&
                    selectedContent.authors.length > 0 && (
                      <div className="text-sm text-gray-300">
                        <span className="font-medium">Authors: </span>
                        {selectedContent.authors
                          .map((author) => author.name)
                          .join(", ")}
                      </div>
                    )}
                </div>
              </div>
              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold mb-2">Synopsis</h3>
                <p className="text-gray-300 mb-6">
                  {selectedContent?.synopsis}
                </p>

                {/* Manga Chapters - Always available since platform is for manga first */}
                {selectedContent?.volumes &&
                  selectedContent.volumes.length > 0 && (
                    <div className="mb-6">
                      <HierarchicalDropdown
                        title="Manga Chapters"
                        volumes={selectedContent.volumes}
                        onChapterClick={(volumeTitle, chapterTitle) =>
                          handleReadChapter(selectedContent, chapterTitle)
                        }
                        showStatusBadges={false}
                      />
                    </div>
                  )}

                {/* Fallback to old chapters structure if no volumes */}
                {(!selectedContent?.volumes ||
                  selectedContent.volumes.length === 0) &&
                  selectedContent?.chapters && (
                    <div className="mb-6">
                      <h4 className="text-white font-semibold mb-2">
                        Manga Chapters
                      </h4>
                      <div className="bg-gray-800 border border-gray-700 rounded-lg divide-y divide-gray-700">
                        {selectedContent.chapters.map((chapter) => (
                          <button
                            key={chapter.id}
                            className="w-full text-left px-4 py-2 text-gray-200 hover:bg-gray-700"
                            onClick={() =>
                              handleReadChapter(selectedContent, chapter.title)
                            }
                          >
                            {chapter.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Animation Episodes - Only show if available (community-created) */}
                {selectedContent?.episodes && (
                  <div className="mb-6">
                    <HierarchicalDropdown
                      title="Animated Chapters"
                      volumes={(() => {
                        const episodes = selectedContent.episodes;
                        const episodesPerVolume = 5; // 5 episodes per volume
                        const volumes = [];

                        for (
                          let i = 0;
                          i < episodes.length;
                          i += episodesPerVolume
                        ) {
                          const volumeEpisodes = episodes.slice(
                            i,
                            i + episodesPerVolume
                          );
                          const volumeNumber =
                            Math.floor(i / episodesPerVolume) + 1;

                          volumes.push({
                            id: `animated-volume-${volumeNumber}`,
                            volume_number: volumeNumber,
                            title: `Volume ${volumeNumber}: ${selectedContent.title} Volume ${volumeNumber}`,
                            chapters: volumeEpisodes.map((episode, index) => ({
                              id: `animated-chapter-${i + index}`,
                              title: `${episode}: ${
                                selectedContent.title
                              } Chapter ${i + index + 1}`,
                            })),
                          });
                        }

                        return volumes;
                      })()}
                      onChapterClick={(volumeTitle, chapterTitle) =>
                        handleWatchEpisode(selectedContent, chapterTitle)
                      }
                      showStatusBadges={false}
                    />
                  </div>
                )}

                {/* Community Discussion */}
                <CommentSection
                  contentType="project"
                  contentId={selectedContent?.id || ""}
                  title={selectedContent?.title}
                  projectId={selectedContent?.id}
                />
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <SettingsModal
        open={modalStates.isSettingsModalOpen}
        onOpenChange={() => closeModal("isSettingsModalOpen")}
      />
      <ContributionsModal
        open={modalStates.isContributionsModalOpen}
        onOpenChange={() => closeModal("isContributionsModalOpen")}
      />
      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </div>
  );
}
