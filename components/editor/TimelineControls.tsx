"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RotateCcw, ZoomIn, ZoomOut, Play, Pause, SkipBack, SkipForward } from "lucide-react";

interface TimelineControlsProps {
  zoom: number;
  setZoom: (fn: (prev: number) => number) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function TimelineControls({ zoom, setZoom, isPlaying, onPlayPause, onPrev, onNext }: TimelineControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-sm text-gray-300">Zoom:</Label>
      <Button variant="outline" size="sm" className="text-gray-400 bg-transparent border-gray-600" onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.1))}>
        <ZoomOut className="w-4 h-4" />
      </Button>
      <span className="text-sm text-gray-300 min-w-[60px] text-center">{Math.round(zoom * 100)}%</span>
      <Button variant="outline" size="sm" className="text-gray-400 bg-transparent border-gray-600" onClick={() => setZoom((prev) => Math.min(3, prev + 0.1))}>
        <ZoomIn className="w-4 h-4" />
      </Button>
      <Button variant="outline" size="sm" className="text-gray-400 bg-transparent border-gray-600" onClick={() => setZoom(1)}>
        <RotateCcw className="w-4 h-4" />
      </Button>
      <div className="ml-4 flex items-center gap-2">
        <Button variant="outline" size="sm" className="text-gray-400 bg-transparent border-gray-600" onClick={onPrev}>
          <SkipBack className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" className="text-gray-400 bg-transparent border-gray-600" onClick={onPlayPause}>
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button variant="outline" size="sm" className="text-gray-400 bg-transparent border-gray-600" onClick={onNext}>
          <SkipForward className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}


