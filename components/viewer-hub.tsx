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
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Play,
  Search,
  MessageCircle,
  Star,
  CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  BookOpen,
} from "lucide-react";
import type {
  CurrentView,
  ContentItem,
  ComponentWithViewChange,
} from "@/types";
import { mockContent, mockHeroContent } from "@/lib/mockData";
import { useModalStates } from "@/hooks/useModalStates";
import { APP_CONFIG } from "@/lib/constants";
import { ProfileModal } from "@/components/profile-modal";
import { SettingsModal } from "@/components/settings-modal";
import { ContributionsModal } from "@/components/contributions-modal";
import { ProfileDropdown } from "@/components/shared/profile-dropdown";
import React from "react";

interface ViewerHubProps extends ComponentWithViewChange {}

// Mock comments for discussion
const mockComments = [
  {
    id: "1",
    author: "AnimeFan123",
    content: "Amazing storyline! Can't wait for the next chapter.",
    timeAgo: "2h ago",
    likes: 45,
  },
  {
    id: "2",
    author: "MangaLover",
    content: "The art style is incredible. Really captures the emotion.",
    timeAgo: "4h ago",
    likes: 23,
  },
  {
    id: "3",
    author: "DragonFan",
    content: "This series keeps getting better with each release!",
    timeAgo: "6h ago",
    likes: 67,
  },
];

export function ViewerHub({ onViewChange }: ViewerHubProps) {
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Use centralized modal state management
  const { modalStates, openModal, closeModal } = useModalStates();

  // Memoize filtered content to improve performance
  const filteredContent = useMemo(() => {
    if (!searchTerm) return mockContent;
    return mockContent.filter(
      (item) =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tags.some((tag) =>
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );
  }, [searchTerm]);

  // Stable callback functions to prevent re-renders
  const handleContentSelect = useCallback((content: ContentItem) => {
    setSelectedContent(content);
    setIsModalOpen(true);
  }, []);

  const handlePlayContent = useCallback(
    (content: ContentItem) => {
      if (content.type === "animated" || content.episodes) {
        onViewChange("video", content);
      } else {
        onViewChange("manga", content);
      }
    },
    [onViewChange]
  );

  const handleWatchEpisode = useCallback(
    (content: ContentItem, episode: string) => {
      onViewChange("video", { ...content, selectedEpisode: episode });
    },
    [onViewChange]
  );

  const handleReadChapter = useCallback(
    (content: ContentItem, chapter: string) => {
      onViewChange("manga", { ...content, selectedChapter: chapter });
    },
    [onViewChange]
  );

  // Completely isolated Hero Section Component
  const HeroSection = React.memo(() => {
    const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
    const [autoPlay, setAutoPlay] = useState(true);

    useEffect(() => {
      if (!autoPlay) return;

      const interval = setInterval(() => {
        setCurrentHeroIndex((prev) => (prev + 1) % mockHeroContent.length);
      }, 6000);
      return () => clearInterval(interval);
    }, [autoPlay]);

    const goToPrevious = useCallback(() => {
      setAutoPlay(false);
      setCurrentHeroIndex(
        (prev) => (prev - 1 + mockHeroContent.length) % mockHeroContent.length
      );
    }, []);

    const goToNext = useCallback(() => {
      setAutoPlay(false);
      setCurrentHeroIndex((prev) => (prev + 1) % mockHeroContent.length);
    }, []);

    const currentHero = mockHeroContent[currentHeroIndex];

    return (
      <div className="relative h-[500px] overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent z-10" />
        <img
          src={currentHero.image}
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

        <div className="absolute inset-0 z-20 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-2xl">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
                {currentHero.title}
              </h1>
              <p className="text-lg text-gray-300 mb-6">
                {currentHero.description}
              </p>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                  <span className="text-white font-medium">
                    {currentHero.rating}
                  </span>
                </div>
                <div className="flex gap-2">
                  {currentHero.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="bg-gray-800 text-gray-300"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-4">
                <Button
                  size="lg"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => handlePlayContent(currentHero)}
                >
                  <Play className="w-5 h-5 mr-2" />
                  {currentHero.type === "animated" ? "Watch Now" : "Read Now"}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-gray-600 text-white hover:bg-gray-800"
                  onClick={() => handleContentSelect(currentHero)}
                >
                  More Info
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Simple progress indicator (NO clickable circles) */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20">
          <div className="flex gap-2">
            {mockHeroContent.map((_, index) => (
              <div
                key={index}
                className={`h-1 transition-all duration-300 ${
                  index === currentHeroIndex
                    ? "w-8 bg-red-500 rounded-full"
                    : "w-6 bg-gray-500 rounded-full"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  });

  // Memoized Continue Watching Card Component
  const ContinueWatchingCard = React.memo(({ item }: { item: ContentItem }) => (
    <Card
      className="min-w-[350px] bg-gray-800 border-gray-700 hover:bg-gray-700 transition-colors cursor-pointer"
      onClick={() => {
        if (item.currentEpisode) {
          onViewChange("video", {
            ...item,
            selectedEpisode: `Episode ${item.currentEpisode}`,
          });
        } else if (item.currentChapter) {
          onViewChange("manga", {
            ...item,
            selectedChapter: `Chapter ${item.currentChapter}`,
          });
        }
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
            <p className="text-xs text-gray-400 mb-2">
              {item.currentEpisode
                ? `Episode ${item.currentEpisode}`
                : `Chapter ${item.currentChapter}`}
            </p>
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
                      {item.chapters && (
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          <span>{item.chapters.length} chapters</span>
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
                  <span className="text-sm text-gray-300">{item.rating}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {item.tags.slice(0, 2).map((tag) => (
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
    () => mockContent.filter((item) => item.progress && item.progress > 0),
    []
  );
  const trendingAnimeItems = useMemo(
    () => mockContent.filter((item) => item.type === "animated"),
    []
  );
  const newMangaItems = useMemo(
    () => mockContent.filter((item) => item.type === "manga"),
    []
  );
  const fanFavoriteItems = useMemo(
    () => [...mockContent].sort((a, b) => b.rating - a.rating),
    []
  );

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
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search anime & manga..."
                  className="pl-10 w-64 bg-gray-800 border-gray-700 text-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <ProfileDropdown
                onSettingsClick={() => openModal("isSettingsModalOpen")}
                onContributionsClick={() =>
                  openModal("isContributionsModalOpen")
                }
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
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="grid md:grid-cols-3 gap-6 pr-2">
              <div className="md:col-span-1">
                <img
                  src={selectedContent?.image || "/placeholder.svg"}
                  alt={selectedContent?.title}
                  className="w-full rounded-lg"
                />
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{selectedContent?.rating}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedContent?.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold mb-2">Synopsis</h3>
                <p className="text-gray-300 mb-6">
                  {selectedContent?.synopsis}
                </p>

                {/* Manga Chapters - Always available since platform is for manga first */}
                {selectedContent?.chapters && (
                  <div className="mb-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between border-gray-600 hover:bg-gray-700 bg-transparent"
                        >
                          Manga Chapters
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full bg-gray-700 border-gray-600">
                        {selectedContent.chapters.map((chapter, index) => (
                          <DropdownMenuItem
                            key={index}
                            onClick={() =>
                              handleReadChapter(selectedContent, chapter)
                            }
                            className="text-white hover:bg-gray-600"
                          >
                            {chapter}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                {/* Animation Episodes - Only show if available (community-created) */}
                {selectedContent?.episodes && (
                  <div className="mb-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between border-gray-600 hover:bg-gray-700 bg-transparent"
                        >
                          Animated Episodes
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full bg-gray-700 border-gray-600">
                        {selectedContent.episodes.map((episode, index) => (
                          <DropdownMenuItem
                            key={index}
                            onClick={() =>
                              handleWatchEpisode(selectedContent, episode)
                            }
                            className="text-white hover:bg-gray-600"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            {episode}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                {/* Community Discussion */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Community Discussion
                  </h3>
                  <div className="bg-gray-700 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-sm text-gray-300">
                        Join the conversation
                      </span>
                    </div>
                    <Input
                      placeholder="Share your thoughts..."
                      className="bg-gray-600 border-gray-500"
                    />
                  </div>

                  <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                    {mockComments.map((comment) => (
                      <div
                        key={comment.id}
                        className="bg-gray-700 rounded-lg p-3 mr-2"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-white text-sm">
                            {comment.author}
                          </span>
                          <span className="text-xs text-gray-400">
                            {comment.timeAgo}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm mb-2">
                          {comment.content}
                        </p>
                        <div className="flex items-center gap-2">
                          <button className="flex items-center gap-1 text-gray-400 hover:text-white text-xs">
                            <ThumbsUp className="w-3 h-3" />
                            {comment.likes}
                          </button>
                          <button className="text-gray-400 hover:text-white text-xs">
                            Reply
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
    </div>
  );
}
