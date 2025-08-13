"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export default function useTimeline(frameCountFromDoc: number, fps: number) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [selectedFrameNumber, setSelectedFrameNumber] = useState<number | null>(1);

  const maxFrame = useMemo(() => Math.max(1, frameCountFromDoc || 1), [frameCountFromDoc]);

  const handlePlayPause = useCallback(() => setIsPlaying((p) => !p), []);
  const handlePrevFrame = useCallback(() => setSelectedFrameNumber((prev) => {
    const current = prev || 1;
    if (current <= 1) return isLooping ? maxFrame : 1;
    return current - 1;
  }), [isLooping, maxFrame]);
  const handleNextFrame = useCallback(() => setSelectedFrameNumber((prev) => {
    const current = prev || 1;
    if (current >= maxFrame) return isLooping ? 1 : maxFrame;
    return current + 1;
  }), [isLooping, maxFrame]);
  const handleFirstFrame = useCallback(() => setSelectedFrameNumber(1), []);
  const handleLastFrame = useCallback(() => setSelectedFrameNumber(maxFrame), [maxFrame]);
  const handleToggleLoop = useCallback(() => setIsLooping((p) => !p), []);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSelectedFrameNumber((prev) => {
        const current = prev || 1;
        if (current >= maxFrame) {
          if (isLooping) return 1;
          clearInterval(interval);
          return maxFrame;
        }
        return current + 1;
      });
    }, 1000 / (fps || 12));
    return () => clearInterval(interval);
  }, [isPlaying, maxFrame, isLooping, fps]);

  return {
    isPlaying,
    isLooping,
    selectedFrameNumber,
    setSelectedFrameNumber,
    maxFrame,
    handlePlayPause,
    handlePrevFrame,
    handleNextFrame,
    handleFirstFrame,
    handleLastFrame,
    handleToggleLoop,
  };
}


