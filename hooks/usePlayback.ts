import { useCallback, useEffect } from "react";

export default function usePlayback({
  isPlaying,
  setIsPlaying,
  isLooping,
  maxFrame,
  appliedFps,
  setSelectedFrameNumber,
}: any) {
  const handlePlayPause = useCallback(() => {
    setIsPlaying((p: boolean) => !p);
  }, [setIsPlaying]);

  const handlePrevFrame = useCallback(() => {
    setSelectedFrameNumber((prev: number | null) => {
      const current = prev || 1;
      if (current <= 1) return isLooping ? maxFrame : 1;
      return current - 1;
    });
  }, [isLooping, maxFrame, setSelectedFrameNumber]);

  const handleNextFrame = useCallback(() => {
    setSelectedFrameNumber((prev: number | null) => {
      const current = prev || 1;
      if (current >= maxFrame) return isLooping ? 1 : maxFrame;
      return current + 1;
    });
  }, [isLooping, maxFrame, setSelectedFrameNumber]);

  const handleFirstFrame = useCallback(() => {
    setSelectedFrameNumber(1);
  }, [setSelectedFrameNumber]);

  const handleLastFrame = useCallback(() => {
    setSelectedFrameNumber(maxFrame);
  }, [maxFrame, setSelectedFrameNumber]);

  const handleToggleLoop = useCallback(() => {
    // caller should own isLooping state; we return a toggler
    setIsPlaying((p: boolean) => p); // no-op here, keep API parity
  }, [setIsPlaying]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSelectedFrameNumber((prev: number | null) => {
        const currentFrameNumber = prev || 1;
        if (currentFrameNumber >= maxFrame) {
          if (isLooping) return 1;
          setIsPlaying(false);
          return maxFrame;
        }
        return currentFrameNumber + 1;
      });
    }, 1000 / (appliedFps || 12));
    return () => clearInterval(interval);
  }, [
    isPlaying,
    maxFrame,
    isLooping,
    appliedFps,
    setSelectedFrameNumber,
    setIsPlaying,
  ]);

  return {
    handlePlayPause,
    handlePrevFrame,
    handleNextFrame,
    handleFirstFrame,
    handleLastFrame,
    handleToggleLoop,
  } as const;
}
