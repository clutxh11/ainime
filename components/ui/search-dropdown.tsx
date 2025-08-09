"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Loader2,
  TrendingUp,
  BookOpen,
  Play,
  Star,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface SearchResult {
  id: string;
  title: string;
  description: string;
  genre: string;
  status: string;
  rating: number;
  views: number;
  type: "manga" | "animated";
  image_url?: string;
  created_at: string;
  users?: {
    username: string;
  };
}

interface SearchDropdownProps {
  onResultClick: (result: SearchResult) => void;
  placeholder?: string;
  className?: string;
}

export function SearchDropdown({
  onResultClick,
  placeholder = "Search for manga, animations, creators...",
  className = "",
}: SearchDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingSearches] = useState([
    "Dragon's Legacy",
    "Cyber Samuraii",
    "Fantasy",
    "Action",
    "Romance",
    "Sci-Fi",
  ]);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("recentSearches");
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = useCallback(
    (term: string) => {
      if (!term.trim()) return;

      const updated = [term, ...recentSearches.filter((s) => s !== term)].slice(
        0,
        5
      );
      setRecentSearches(updated);
      localStorage.setItem("recentSearches", JSON.stringify(updated));
    },
    [recentSearches]
  );

  // Search function with debouncing
  const performSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .select(
          `
          *
        `
        )
        .or(
          `title.ilike.%${term}%,description.ilike.%${term}%,genre.ilike.%${term}%`
        )
        .order("views", { ascending: false })
        .limit(10);

      if (error) throw error;

      const searchResults: SearchResult[] = (data || []).map((project) => ({
        id: project.id,
        title: project.title,
        description: project.description,
        genre: project.genre,
        status: project.status,
        rating: 4.5, // Mock rating for now
        views: project.views,
        type: "animated" as const,
        image_url: project.image_url,
        created_at: project.created_at,
        users: { username: "Creator" }, // Placeholder since no users table
      }));

      setResults(searchResults);
    } catch (err) {
      console.error("Search error:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchTerm.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchTerm);
      }, 300);
    } else {
      setResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, performSearch]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle input focus
  const handleInputFocus = () => {
    setIsOpen(true);
  };

  // Handle search term click
  const handleSearchTermClick = (term: string) => {
    setSearchTerm(term);
    saveRecentSearch(term);
    setIsOpen(true);
  };

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    saveRecentSearch(result.title);
    onResultClick(result);
    setIsOpen(false);
    setSearchTerm("");
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm("");
    setResults([]);
    inputRef.current?.focus();
  };

  const getTypeIcon = (type: string) => {
    return type === "manga" ? (
      <BookOpen className="w-4 h-4 text-blue-400" />
    ) : (
      <Play className="w-4 h-4 text-red-400" />
    );
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      Active: "bg-green-600",
      Completed: "bg-blue-600",
      "On Hold": "bg-yellow-600",
      Planning: "bg-gray-600",
    };

    return (
      <Badge
        className={`${
          statusColors[status as keyof typeof statusColors] || "bg-gray-600"
        } text-xs`}
      >
        {status}
      </Badge>
    );
  };

  const formatYear = (dateString: string) => {
    return new Date(dateString).getFullYear();
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={handleInputFocus}
          className="pl-10 pr-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-400">Searching...</span>
            </div>
          )}

          {/* Search Results */}
          {!loading && searchTerm && results.length > 0 && (
            <div className="p-4">
              <div className="text-sm text-gray-400 mb-3">
                Search Results ({results.length})
              </div>
              <div className="space-y-3">
                {results.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className="flex gap-3 p-3 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <img
                      src={result.image_url || "/placeholder.jpg"}
                      alt={result.title}
                      className="w-16 h-12 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getTypeIcon(result.type)}
                        <h3 className="font-semibold text-white truncate">
                          {result.title}
                        </h3>
                        {getStatusBadge(result.status)}
                      </div>
                      <p className="text-sm text-gray-300 line-clamp-2 mb-2">
                        {result.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400" />
                          <span>{result.rating}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {result.genre}
                        </Badge>
                        <span>{formatYear(result.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {!loading && searchTerm && results.length === 0 && (
            <div className="p-8 text-center">
              <Search className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400">
                No results found for "{searchTerm}"
              </p>
              <p className="text-sm text-gray-500">
                Try different keywords or browse trending searches
              </p>
            </div>
          )}

          {/* Default State */}
          {!loading && !searchTerm && (
            <div className="p-4">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-white mb-3">
                    Recent Searches
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term, index) => (
                      <button
                        key={index}
                        onClick={() => handleSearchTermClick(term)}
                        className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm hover:bg-gray-600 transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Searches */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-red-400" />
                  Trending Searches
                </h4>
                <div className="space-y-2">
                  {trendingSearches.map((term, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearchTermClick(term)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-700 transition-colors text-left"
                    >
                      <div className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <span className="text-gray-300 flex-1">{term}</span>
                      <TrendingUp className="w-4 h-4 text-red-400" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
