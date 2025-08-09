"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Search,
  Filter,
  Star,
  Play,
  ChevronDown,
  BookOpen,
} from "lucide-react";
import type { CurrentView, ContentItem } from "@/types";
import { supabase } from "@/lib/supabase";
import {
  getProjectsWithRatings,
  getUserRating,
  submitRating,
} from "@/lib/rating-utils";
import { RatingStars } from "@/components/ui/rating-stars";
import { CommentSection } from "@/components/ui/comment-section";
import { SearchDropdown } from "@/components/ui/search-dropdown";
// SlidingDropdown removed; using HierarchicalDropdown or simple list instead
import { HierarchicalDropdown } from "@/components/ui/hierarchical-dropdown";

interface ContentExplorerProps {
  category: string;
  onViewChange: (view: CurrentView, content?: ContentItem) => void;
}

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
  authors?: any[];
}

export default function ContentExplorer({
  category,
  onViewChange,
}: ContentExplorerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("release-date");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});

  const genres = [
    "Fantasy",
    "Sci-Fi",
    "Action",
    "Romance",
    "Comedy",
    "Drama",
    "Horror",
    "Adventure",
  ];
  const mediaTypes = ["Manga", "Anime", "Ongoing"];

  // Fetch projects from Supabase
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch projects with ratings
        const projectsData = await getProjectsWithRatings();
        setProjects(projectsData);

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

    fetchProjects();
  }, []);

  // Utility function to truncate synopsis
  const truncateSynopsis = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + "...";
  };

  // Convert projects to ContentItem format
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
      views: project.views,
      progress: project.progress,
      seriesType: project.series_type, // Added for series type display
      image:
        project.square_thumbnail_url || project.image_url || "/placeholder.jpg", // Use square thumbnail first
      creator: project.creator_display_name || "Unknown Creator",
      tags: project.tags || [project.genre, project.status], // Use database tags if available, fallback to genre/status
      authors: project.authors || [],
      created_at: project.created_at,
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
      episodes:
        project.chapters?.map((chapter, index) => ({
          id: chapter.id,
          title: chapter.title || `Chapter ${index + 1}`,
          duration: "24 min",
          thumbnail: "/placeholder.jpg",
        })) || [],
      chapters:
        project.chapters?.map((chapter, index) => ({
          id: chapter.id,
          title: chapter.title || `Chapter ${index + 1}`,
          pages: 20,
          thumbnail: "/placeholder.jpg",
        })) || [],
    }));
  }, [projects]);

  // Filter and sort content
  const filteredContent = useMemo(() => {
    let filtered = contentItems;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.synopsis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.authors?.some((author) =>
            author.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
    }

    // Genre filter
    if (selectedGenres.length > 0) {
      filtered = filtered.filter((item) => selectedGenres.includes(item.genre));
    }

    // Media type filter
    if (selectedTypes.length > 0) {
      filtered = filtered.filter((item) => {
        const itemType =
          item.type === "animated"
            ? "Anime"
            : item.type === "manga"
            ? "Manga"
            : "Ongoing";
        return selectedTypes.includes(itemType);
      });
    }

    // Sort
    switch (sortBy) {
      case "rating":
        filtered = [...filtered].sort((a, b) => b.rating - a.rating);
        break;
      case "title":
        filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "release-date":
      default:
        filtered = [...filtered].sort(
          (a, b) =>
            new Date(b.created_at || "").getTime() -
            new Date(a.created_at || "").getTime()
        );
        break;
    }

    return filtered;
  }, [contentItems, searchTerm, selectedGenres, selectedTypes, sortBy]);

  const getCategoryTitle = () => {
    switch (category) {
      case "trending":
        return "Trending Anime";
      case "manga":
        return "New Manga Releases";
      case "favorites":
        return "Fan-Favorite Projects";
      case "continue":
        return "Continue Watching";
      case "all":
        return "Browse All Content";
      default:
        return "All Content";
    }
  };

  const handleContentClick = (content: ContentItem) => {
    setSelectedContent(content);
    setIsModalOpen(true);
  };

  const handleWatchEpisode = (content: ContentItem, episodeTitle: string) => {
    const episode = content.episodes?.find((ep) => ep.title === episodeTitle);
    onViewChange("video", {
      ...content,
      selectedEpisode: episodeTitle,
      selectedEpisodeId: episode?.id || content.id,
    });
  };

  const handleReadChapter = (content: ContentItem, chapterTitle: string) => {
    const chapter = content.chapters?.find((ch) => ch.title === chapterTitle);
    onViewChange("manga", {
      ...content,
      selectedChapter: chapterTitle,
      selectedChapterId: chapter?.id || content.id,
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

  // Memoized Content Card Component with hover effects
  const ContentCard = ({ item }: { item: ContentItem }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
      <div
        className="relative min-w-[250px] group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Card
          className="bg-gray-800 border-gray-700 hover:bg-gray-700 transition-colors cursor-pointer h-full"
          onClick={() => handleContentClick(item)}
        >
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
                  {item.authors && item.authors.length > 0 && (
                    <div className="text-xs text-gray-300">
                      <span className="font-medium">By: </span>
                      {item.authors
                        .filter((author) => author.is_primary)
                        .map((author) => author.name)
                        .join(", ") || item.authors[0]?.name}
                    </div>
                  )}
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
                  {item.rating.toFixed(2)} ({item.totalRatings || 0})
                </span>
              </div>
              {item.authors && item.authors.length > 0 && (
                <div className="text-xs text-gray-400 mb-2">
                  by{" "}
                  {item.authors
                    .filter((author) => author.is_primary)
                    .map((author) => author.name)
                    .join(", ") || item.authors[0]?.name}
                </div>
              )}
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
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-white">Loading content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation */}
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
                Back to Home
              </Button>
              <h1 className="text-xl font-semibold text-white">
                {getCategoryTitle()}
              </h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <div className="w-64 flex-shrink-0">
            <Card className="bg-gray-800 border-gray-700 sticky top-24">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filters
                  {(searchTerm ||
                    selectedGenres.length > 0 ||
                    selectedTypes.length > 0) && (
                    <Badge className="ml-auto bg-red-600 text-xs">
                      {
                        [
                          searchTerm,
                          selectedGenres.length,
                          selectedTypes.length,
                        ].filter(Boolean).length
                      }
                    </Badge>
                  )}
                </h3>

                {/* Search */}
                <div className="mb-6">
                  <label className="text-sm text-gray-400 mb-2 block">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search titles..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>

                {/* Genre Filter */}
                <div className="mb-6">
                  <label className="text-sm text-gray-400 mb-3 block">
                    Genre
                  </label>
                  <div className="space-y-2">
                    {genres.map((genre) => (
                      <div key={genre} className="flex items-center space-x-2">
                        <Checkbox
                          id={genre}
                          checked={selectedGenres.includes(genre)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedGenres([...selectedGenres, genre]);
                            } else {
                              setSelectedGenres(
                                selectedGenres.filter((g) => g !== genre)
                              );
                            }
                          }}
                        />
                        <label
                          htmlFor={genre}
                          className="text-sm text-white cursor-pointer"
                        >
                          {genre}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Media Type Filter */}
                <div className="mb-6">
                  <label className="text-sm text-gray-400 mb-3 block">
                    Media Type
                  </label>
                  <div className="space-y-2">
                    {mediaTypes.map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={type}
                          checked={selectedTypes.includes(type)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedTypes([...selectedTypes, type]);
                            } else {
                              setSelectedTypes(
                                selectedTypes.filter((t) => t !== type)
                              );
                            }
                          }}
                        />
                        <label
                          htmlFor={type}
                          className="text-sm text-white cursor-pointer"
                        >
                          {type}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sort By */}
                <div className="mb-6">
                  <label className="text-sm text-gray-400 mb-3 block">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  >
                    <option value="release-date">Release Date</option>
                    <option value="rating">Rating</option>
                    <option value="title">Title</option>
                  </select>
                </div>

                {/* Clear Filters Button */}
                {(searchTerm ||
                  selectedGenres.length > 0 ||
                  selectedTypes.length > 0) && (
                  <div className="pt-4 border-t border-gray-700">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("");
                        setSelectedGenres([]);
                        setSelectedTypes([]);
                        setSortBy("release-date");
                      }}
                      className="w-full bg-transparent border-gray-600 text-white hover:bg-gray-700"
                    >
                      Clear All Filters
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Content Grid */}
          <div className="flex-1">
            <div className="mb-6">
              <p className="text-gray-400">
                {filteredContent.length} results found
              </p>
            </div>

            {filteredContent.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg mb-4">No content found</p>
                <p className="text-gray-500">
                  Try adjusting your filters or search terms
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredContent.map((item) => (
                  <ContentCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        </div>
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
                          handleReadChapter(
                            selectedContent,
                            `${volumeTitle} - ${chapterTitle}`
                          )
                        }
                        showStatusBadges={false}
                      />
                    </div>
                  )}

                {/* Fallback to simple list if no volumes */}
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
    </div>
  );
}
