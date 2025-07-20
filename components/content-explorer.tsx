"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Search, Filter, Star, Play } from "lucide-react";
import type { CurrentView } from "@/types";

interface ContentExplorerProps {
  category: string;
  onViewChange: (view: CurrentView) => void;
}

const mockContent = [
  {
    id: "1",
    title: "Dragon's Legacy",
    type: "animated",
    genre: "Fantasy",
    rating: 4.8,
    releaseDate: "2025-07-15",
    image: "/placeholder.svg?height=300&width=200",
  },
  {
    id: "2",
    title: "Cyber Samurai",
    type: "manga",
    genre: "Sci-Fi",
    rating: 4.6,
    releaseDate: "2025-07-10",
    image: "/placeholder.svg?height=300&width=200",
  },
  {
    id: "3",
    title: "Magical Academy Chronicles",
    type: "ongoing",
    genre: "Fantasy",
    rating: 4.7,
    releaseDate: "2025-07-12",
    image: "/placeholder.svg?height=300&width=200",
  },
  // Add more mock content...
];

const allMockContent = [
  ...mockContent,
  {
    id: "4",
    title: "Space Pirates Saga",
    type: "manga",
    genre: "Adventure",
    rating: 4.5,
    releaseDate: "2025-07-08",
    image: "/placeholder.svg?height=300&width=200",
  },
  {
    id: "5",
    title: "Mystic Warriors",
    type: "animated",
    genre: "Fantasy",
    rating: 4.9,
    releaseDate: "2025-07-20",
    image: "/placeholder.svg?height=300&width=200",
  },
  {
    id: "6",
    title: "Urban Legends",
    type: "ongoing",
    genre: "Horror",
    rating: 4.3,
    releaseDate: "2025-07-05",
    image: "/placeholder.svg?height=300&width=200",
  },
];

export default function ContentExplorer({
  category,
  onViewChange,
}: ContentExplorerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("popularity");

  const genres = ["Fantasy", "Sci-Fi", "Action", "Romance", "Comedy", "Drama"];
  const mediaTypes = ["Manga", "Anime", "Ongoing"];

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
                <div>
                  <label className="text-sm text-gray-400 mb-3 block">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  >
                    <option value="popularity">Popularity</option>
                    <option value="rating">Rating</option>
                    <option value="release-date">Release Date</option>
                    <option value="title">Title</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content Grid */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-400">
                {mockContent.length} results found
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-gray-600 text-white"
                >
                  Grid View
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-400">
                  List View
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {(category === "all" ? allMockContent : mockContent).map(
                (item) => (
                <Card
                  key={item.id}
                  className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
                >
                  <CardContent className="p-0">
                    <div className="relative">
                      <img
                        src={item.image || "/placeholder.svg"}
                        alt={item.title}
                        className="w-full h-64 object-cover rounded-t-lg"
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
                      <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-12 h-12 text-white" />
                      </div>
                    </div>
                    <div className="p-4">
                        <h3 className="font-semibold text-white mb-2 line-clamp-2">
                          {item.title}
                        </h3>
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm text-gray-300">
                            {item.rating}
                          </span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {item.genre}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
