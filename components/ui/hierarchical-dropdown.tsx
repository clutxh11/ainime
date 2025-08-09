"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Chapter {
  id: string;
  title: string;
  status?: string;
  release_date?: string;
}

interface Volume {
  id: string;
  volume_number: number;
  title: string;
  description?: string;
  chapters: Chapter[];
}

interface HierarchicalDropdownProps {
  title: string;
  volumes: Volume[];
  onChapterClick: (volumeTitle: string, chapterTitle: string) => void;
  className?: string;
  showStatusBadges?: boolean;
  volumeLabel?: string;
}

export function HierarchicalDropdown({
  title,
  volumes,
  onChapterClick,
  className,
  showStatusBadges = true,
  volumeLabel = "chapters",
}: HierarchicalDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedVolumes, setExpandedVolumes] = useState<Set<string>>(
    new Set()
  );
  const contentRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setExpandedVolumes(new Set());
    }
  };

  const toggleVolume = (volumeId: string) => {
    const newExpanded = new Set(expandedVolumes);
    if (newExpanded.has(volumeId)) {
      newExpanded.delete(volumeId);
    } else {
      newExpanded.add(volumeId);
    }
    setExpandedVolumes(newExpanded);
  };

  const handleChapterClick = (volumeTitle: string, chapterTitle: string) => {
    onChapterClick(volumeTitle, chapterTitle);
    setIsOpen(false);
    setExpandedVolumes(new Set());
  };

  return (
    <div className={cn("w-full relative", className)}>
      <Button
        variant="outline"
        onClick={toggleDropdown}
        className="w-full justify-between border-gray-600 hover:bg-gray-700 bg-transparent"
      >
        {title}
        {isOpen ? (
          <ChevronUp className="w-4 h-4 transition-transform duration-200" />
        ) : (
          <ChevronDown className="w-4 h-4 transition-transform duration-200" />
        )}
      </Button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div
          ref={contentRef}
          className="mt-2 border border-gray-600 rounded-md bg-gray-700 shadow-lg max-h-[750px] overflow-y-auto"
        >
          {volumes.map((volume, volumeIndex) => (
            <div
              key={volume.id}
              className="border-b border-gray-600 last:border-b-0"
            >
              {/* Volume Header */}
              <button
                onClick={() => toggleVolume(volume.id)}
                className="w-full px-4 py-3 text-left text-white hover:bg-gray-600 transition-colors duration-150 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <ChevronRight
                    className={cn(
                      "w-4 h-4 transition-transform duration-200",
                      expandedVolumes.has(volume.id) && "rotate-90"
                    )}
                  />
                  <span className="font-medium">{volume.title}</span>
                  <span className="text-sm text-gray-400">
                    ({volume.chapters.length} {volumeLabel})
                  </span>
                </div>
              </button>

              {/* Chapters List */}
              <div
                className={cn(
                  "overflow-hidden transition-all duration-200 ease-in-out",
                  expandedVolumes.has(volume.id) ? "max-h-[500px]" : "max-h-0"
                )}
              >
                <div className="max-h-[450px] overflow-y-auto">
                  {volume.chapters.map((chapter, chapterIndex) => (
                    <button
                      key={chapter.id}
                      onClick={() =>
                        handleChapterClick(volume.title, chapter.title)
                      }
                      className="w-full px-8 py-2 text-left text-gray-300 hover:bg-gray-600 transition-colors duration-150 flex items-center gap-2 border-l-2 border-gray-600 hover:border-gray-400"
                    >
                      <span className="text-sm">{chapter.title}</span>
                      {showStatusBadges &&
                        chapter.status &&
                        chapter.status === "Finalized" && (
                          <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                            Finalized
                          </span>
                        )}
                      {showStatusBadges &&
                        chapter.status &&
                        chapter.status === "Draft" && (
                          <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">
                            Draft
                          </span>
                        )}
                      {showStatusBadges &&
                        chapter.status &&
                        chapter.status === "Storyboard" && (
                          <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                            Storyboard
                          </span>
                        )}
                      {showStatusBadges &&
                        chapter.status &&
                        chapter.status === "In-Betweening" && (
                          <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">
                            In-Betweening
                          </span>
                        )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
