"use client";

import TimelineGrid from "@/components/timeline-grid";

interface Props {
  rows: any[];
  setRows: (v: any) => void;
  frameCount: number;
  setFrameCount: (v: any) => void;
  drawingFrames: any[];
  setDrawingFrames: (v: any) => void;
  selectedRow: string;
  setSelectedRow: (v: any) => void;
  selectedLayerId: string | null;
  setSelectedLayerId: (v: any) => void;
  selectedFrameNumber: number | null;
  setSelectedFrameNumber: (v: any) => void;
  onDrop: any;
  isPlaying: boolean;
  onPlayPause: () => void;
  onPrevFrame: () => void;
  onNextFrame: () => void;
  onFirstFrame: () => void;
  onLastFrame: () => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  onDeleteFrame: () => void;
  onDeleteRow: () => void;
  onAddRow: () => void;
  hideEditButtons?: boolean;
  suppressFrames?: boolean;
  activeCompositionLabel?: string;
}

export default function TimelineDock(props: Props) {
  const { frameCount, setFrameCount, ...rest } = props as any;
  return (
    <div className="fixed bottom-0 left-20 right-80 z-20 bg-gray-800 border-t border-gray-700">
      <TimelineGrid
        frames={frameCount}
        setFrames={setFrameCount}
        activeCompositionLabel={(props as any).activeCompositionLabel}
        {...(rest as any)}
      />
    </div>
  );
}
