import React, { useRef } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "./ui/table";
import { Button } from "./ui/button";
import {
  Trash2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Repeat,
} from "lucide-react";

export interface DrawingFrame {
  rowId: string;
  frameIndex: number;
  startFrame?: number; // Starting frame for stretched frames (0-based), defaults to frameIndex
  length: number; // for future extension
  imageUrl?: string; // for template image
  fileName?: string;
  // Optional: source folder identity (used by compositing mode)
  folderId?: string;
  // Sequence-specific properties
  sequenceIndex?: number;
  isSequenceFrame?: boolean;
}

interface TimelineGridProps {
  rows: { id: string; name: string }[];
  setRows: (rows: { id: string; name: string }[]) => void;
  frames: number;
  setFrames: React.Dispatch<React.SetStateAction<number>>;
  drawingFrames: DrawingFrame[];
  setDrawingFrames: React.Dispatch<React.SetStateAction<DrawingFrame[]>>;
  selectedRow: string | null;
  setSelectedRow: (id: string) => void;
  selectedLayerId?: string | null;
  setSelectedLayerId?: (id: string) => void;
  selectedFrameNumber?: number | null;
  setSelectedFrameNumber?: (n: number | null) => void;
  onDrop?: (rowId: string, frameIndex: number, e: React.DragEvent) => void;
  isPlaying?: boolean;
  onPlayPause?: () => void;
  onPrevFrame?: () => void;
  onNextFrame?: () => void;
  onFirstFrame?: () => void;
  onLastFrame?: () => void;
  isLooping?: boolean;
  onToggleLoop?: () => void;
  onDeleteFrame: () => void;
  onDeleteRow: () => void;
  onAddRow: () => void;
  // New flags for compositing mode
  hideEditButtons?: boolean;
  suppressFrames?: boolean;
  activeCompositionLabel?: string;
}

export default function TimelineGrid({
  rows,
  setRows,
  frames,
  setFrames,
  drawingFrames,
  setDrawingFrames,
  selectedRow,
  setSelectedRow,
  selectedLayerId,
  setSelectedLayerId,
  selectedFrameNumber,
  setSelectedFrameNumber,
  onDrop,
  isPlaying,
  onPlayPause,
  onPrevFrame,
  onNextFrame,
  onFirstFrame,
  onLastFrame,
  isLooping,
  onToggleLoop,
  onDeleteFrame,
  onDeleteRow,
  onAddRow,
  hideEditButtons = false,
  suppressFrames = false,
  activeCompositionLabel = "",
}: TimelineGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    //
  }, []);
  const [dragging, setDragging] = React.useState<null | {
    rowId: string;
    frameIndex: number;
    startX: number;
    origLength: number;
    origStartFrame: number;
    handleType: 'left' | 'right'; // Which handle is being dragged
  }>(null);

  const handleAddFrame = () => {
    if (suppressFrames) return;
    if (!selectedRow) return;

    // Create a set of all occupied frame indices in the selected row
    const occupiedFrames = new Set<number>();
    drawingFrames
      .filter((df) => df.rowId === selectedRow)
      .forEach((df) => {
        for (let i = 0; i < df.length; i++) {
          occupiedFrames.add(df.frameIndex + i);
        }
      });

    // Find the first empty frame
    let targetFrame = 0;
    while (occupiedFrames.has(targetFrame) && targetFrame < frames) {
      targetFrame++;
    }

    // If all frames are filled, grow the timeline
    if (targetFrame >= frames) {
      setFrames((prev) => prev + 1);
    }

    // Add the new frame at the first available spot
    setDrawingFrames((prev) => [
      ...prev,
      { rowId: selectedRow, frameIndex: targetFrame, length: 1 },
    ]);
  };

  // Drag logic for frame extension
  const onMouseDownHandle = (
    rowId: string,
    frameIndex: number,
    origLength: number,
    origStartFrame: number,
    handleType: 'left' | 'right',
    e: React.MouseEvent
  ) => {
    setDragging({ 
      rowId, 
      frameIndex, 
      startX: e.clientX, 
      origLength, 
      origStartFrame, 
      handleType 
    });
    e.stopPropagation();
  };

  // Unified image drop handler that prefers parent handler when provided
  const resolveDrop = (
    rowId: string,
    frameIndex: number,
    e: React.DragEvent
  ) => {
    e.preventDefault();
    if (onDrop) {
      onDrop(rowId, frameIndex, e);
      return;
    }
    if (suppressFrames) return;
    // Fallback local behavior
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    const name = file.name;
    setDrawingFrames((prev) =>
      prev.map((df) =>
        df.rowId === rowId && df.frameIndex === frameIndex
          ? { ...df, imageUrl: url, fileName: name }
          : df
      )
    );
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  React.useEffect(() => {
    if (!dragging) return;
    const onMouseMove = (e: MouseEvent) => {
      const cellWidth = 64; // px, matches w-16
      let delta = Math.round((e.clientX - dragging.startX) / cellWidth);
      
      if (dragging.handleType === 'right') {
        // Right handle: adjust end frame (length)
        let newLength = Math.max(1, dragging.origLength + delta);
        let startFrame = dragging.origStartFrame;
        let endFrame = startFrame + newLength - 1;
        
        if (endFrame >= frames) {
          setFrames((prev) => endFrame + 1);
        }
        
        setDrawingFrames((prev) =>
          prev.map((df) =>
            df.rowId === dragging.rowId && df.frameIndex === dragging.frameIndex
              ? { ...df, length: newLength, startFrame }
              : df
          )
        );
      } else {
        // Left handle: adjust start frame
        let newStartFrame = Math.max(0, dragging.origStartFrame + delta);
        let endFrame = dragging.origStartFrame + dragging.origLength - 1;
        let newLength = Math.max(1, endFrame - newStartFrame + 1);
        
        // Ensure we have enough frames in the timeline
        if (endFrame >= frames) {
          setFrames((prev) => endFrame + 1);
        }
        
        setDrawingFrames((prev) =>
          prev.map((df) =>
            df.rowId === dragging.rowId && df.frameIndex === dragging.frameIndex
              ? { ...df, length: newLength, startFrame: newStartFrame }
              : df
          )
        );
      }
    };
    const onMouseUp = () => {
      setDragging(null);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging, frames]);

  // Modified cell click handler
  const handleCellClick = (rowId: string, frameIndex: number) => {
    if (setSelectedLayerId && setSelectedFrameNumber) {
      const folderId = `${rowId}-${frameIndex}`;
      setSelectedLayerId(folderId);
      // Set frame number to the clicked frame (1-based)
      setSelectedFrameNumber(frameIndex + 1);
    }
  };

  return (
    <div
      ref={gridRef}
      className="w-full bg-gray-900 border-t border-gray-700 p-2"
    >
      <div className="flex items-center gap-2 mb-2">
        {/* Playback Controls */}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={onFirstFrame}
            className="px-2"
            title="Go to First Frame"
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onPrevFrame}
            className="px-2"
            title="Previous Frame"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onPlayPause}
            className="px-2"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onNextFrame}
            className="px-2"
            title="Next Frame"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onLastFrame}
            className="px-2"
            title="Go to Last Frame"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={isLooping ? "default" : "outline"}
            onClick={onToggleLoop}
            className="px-2 ml-2"
            title={isLooping ? "Loop Enabled" : "Loop Disabled"}
          >
            <Repeat className="w-4 h-4" />
          </Button>
        </div>

        {!hideEditButtons && (
          <div className="flex items-center gap-2 ml-4">
            <Button size="sm" variant="outline" onClick={handleAddFrame}>
              + Add Frame
            </Button>
            <Button size="sm" variant="outline" onClick={onAddRow}>
              + Add Row
            </Button>
          </div>
        )}

        {/* Composition indicator (compositing only) */}
        {activeCompositionLabel ? (
          <div className="ml-3">
            <span className="text-[10px] uppercase tracking-wide text-gray-300 bg-gray-700/70 rounded px-1.5 py-0.5">
              Comp: {activeCompositionLabel}
            </span>
          </div>
        ) : null}

        <div className="flex-grow" />

        {!hideEditButtons && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onDeleteFrame}
              disabled={!selectedLayerId}
              className="flex items-center gap-2 text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
              Delete Frame
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onDeleteRow}
              disabled={!selectedRow}
              className="flex items-center gap-2 text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
              Delete Row
            </Button>
          </div>
        )}
      </div>
      <div className="overflow-y-auto max-h-48">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Frames</TableHead>
              {Array.from({ length: frames }).map((_, i) => (
                <TableHead
                  key={i}
                  className={`w-16 text-center ${
                    selectedFrameNumber === i + 1
                      ? "bg-blue-600 text-white"
                      : ""
                  }`}
                >
                  {i + 1}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIdx) => (
              <TableRow key={row.id}>
                <TableCell
                  className={`w-24 cursor-pointer ${
                    selectedRow === row.id ? "bg-blue-700 text-white" : ""
                  }`}
                  onClick={() => setSelectedRow(row.id)}
                >
                  {row.name}
                </TableCell>
                {Array.from({ length: frames }).map((_, i) => {
                  // Find if this cell is the start of a drawing frame
                  const framesForRender = suppressFrames
                    ? ([] as DrawingFrame[])
                    : drawingFrames;
                  const drawing = framesForRender.find(
                    (df) => df.rowId === row.id && df.frameIndex === i
                  );
                  // Check if this cell is covered by an extended drawing frame
                  const covered = framesForRender.find(
                    (df) =>
                      df.rowId === row.id &&
                      i > df.frameIndex &&
                      i < df.frameIndex + df.length
                  );
                  if (drawing) {
                    const isDragging =
                      dragging &&
                      dragging.rowId === row.id &&
                      dragging.frameIndex === i;
                    const isSingle = drawing.length === 1;
                    const folderId = `${row.id}-${i}`;
                    // Check if this cell should be highlighted based on selectedLayerId
                    const isSelected =
                      selectedLayerId === folderId ||
                      selectedLayerId === `${folderId}-main` ||
                      selectedLayerId?.startsWith(`${folderId}-extra-`);
                    return (
                      <TableCell
                        key={row.id + "-" + i}
                        colSpan={drawing.length}
                        className={`h-8 border border-blue-400 text-center align-middle relative p-0 ${
                          isDragging
                            ? "opacity-70"
                            : isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-blue-800"
                        }`}
                        style={{
                          width: `${drawing.length * 64}px`,
                          fontSize: "0.75rem",
                          padding: 0,
                        }}
                        onClick={(e) => {
                          console.log("[Timeline] Cell clicked", {
                            rowId: row.id,
                            frameIndex: i,
                            target: e.target,
                            currentTarget: e.currentTarget,
                            timeStamp: e.timeStamp
                          });
                          e.stopPropagation();
                          handleCellClick(row.id, i);
                        }}
                        onDrop={(e) => resolveDrop(row.id, i, e)}
                        onDragOver={handleDragOver}
                      >
                        <div
                          className={`flex flex-row items-center h-full w-full justify-between`}
                          style={{ height: "100%", width: "100%" }}
                        >
                          {drawing.imageUrl ? (
                            isSingle ? (
                              <>
                                <div className="flex flex-col items-start justify-center pl-1 flex-1 h-full">
                                  <img
                                    src={drawing.imageUrl}
                                    alt="template"
                                    className="h-5 w-auto max-w-[80%] object-contain mb-0.5"
                                  />
                                  <span className="leading-tight select-none">{`R${
                                    rowIdx + 1
                                  }`}</span>
                                  <span className="leading-tight select-none">{`F${
                                    i + 1
                                  }`}</span>
                                </div>
                                {/* Right handle for extending single frame */}
                                <span
                                  className="cursor-ew-resize pr-1 select-none flex items-center h-full"
                                  onMouseDown={(e) =>
                                    onMouseDownHandle(
                                      row.id,
                                      i,
                                      drawing.length,
                                      drawing.startFrame ?? i,
                                      'right',
                                      e
                                    )
                                  }
                                  style={{
                                    userSelect: "none",
                                    fontSize: "0.7em",
                                  }}
                                >
                                  ||
                                </span>
                              </>
                            ) : (
                              <>
                                {/* Left handle for adjusting start frame */}
                                <span
                                  className="cursor-ew-resize pl-1 select-none flex items-center h-full"
                                  onMouseDown={(e) =>
                                    onMouseDownHandle(
                                      row.id,
                                      i,
                                      drawing.length,
                                      drawing.startFrame ?? i,
                                      'left',
                                      e
                                    )
                                  }
                                  style={{
                                    userSelect: "none",
                                    fontSize: "0.7em",
                                  }}
                                >
                                  ||
                                </span>
                                <div className="flex flex-row items-center flex-1 h-full">
                                  <img
                                    src={drawing.imageUrl}
                                    alt="template"
                                    className="h-5 w-auto max-w-[40px] object-contain mr-1"
                                  />
                                  <span className="select-none whitespace-nowrap text-left">{`R${
                                    rowIdx + 1
                                  } F${(drawing.startFrame ?? i) + 1}:${(drawing.startFrame ?? i) + drawing.length}`}</span>
                                </div>
                                {/* Right handle for adjusting end frame */}
                                <span
                                  className="cursor-ew-resize pr-1 select-none flex items-center h-full"
                                  onMouseDown={(e) =>
                                    onMouseDownHandle(
                                      row.id,
                                      i,
                                      drawing.length,
                                      drawing.startFrame ?? i,
                                      'right',
                                      e
                                    )
                                  }
                                  style={{
                                    userSelect: "none",
                                    fontSize: "0.7em",
                                  }}
                                >
                                  ||
                                </span>
                              </>
                            )
                          ) : isSingle ? (
                            <>
                              <div className="flex flex-col items-start justify-center pl-1 flex-1 h-full">
                                <span className="leading-tight select-none">{`R${
                                  rowIdx + 1
                                }`}</span>
                                <span className="leading-tight select-none">{`F${
                                  i + 1
                                }`}</span>
                              </div>
                              {/* Right handle for extending single frame */}
                              <span
                                className="cursor-ew-resize pr-1 select-none flex items-center h-full"
                                onMouseDown={(e) =>
                                  onMouseDownHandle(
                                    row.id,
                                    i,
                                    drawing.length,
                                    drawing.startFrame ?? i,
                                    'right',
                                    e
                                  )
                                }
                                style={{
                                  userSelect: "none",
                                  fontSize: "0.7em",
                                }}
                              >
                                ||
                              </span>
                            </>
                          ) : (
                            <div className="flex flex-row items-center h-full w-full justify-between">
                              {/* Left handle for adjusting start frame */}
                              <span
                                className="cursor-ew-resize pl-1 select-none flex items-center h-full"
                                onMouseDown={(e) =>
                                  onMouseDownHandle(
                                    row.id,
                                    i,
                                    drawing.length,
                                    drawing.startFrame ?? i,
                                    'left',
                                    e
                                  )
                                }
                                style={{
                                  userSelect: "none",
                                  fontSize: "0.7em",
                                }}
                              >
                                ||
                              </span>
                              <span className="select-none whitespace-nowrap flex-1 text-center">{`R${
                                rowIdx + 1
                              } F${(drawing.startFrame ?? i) + 1}:${(drawing.startFrame ?? i) + drawing.length}`}</span>
                              {/* Right handle for adjusting end frame */}
                              <span
                                className="cursor-ew-resize pr-1 select-none flex items-center h-full"
                                onMouseDown={(e) =>
                                  onMouseDownHandle(
                                    row.id,
                                    i,
                                    drawing.length,
                                    drawing.startFrame ?? i,
                                    'right',
                                    e
                                  )
                                }
                                style={{
                                  userSelect: "none",
                                  fontSize: "0.7em",
                                }}
                              >
                                ||
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    );
                  } else if (covered) {
                    // Don't render a cell if it's covered by an extended frame
                    return null;
                  } else {
                    // Allow image drop on empty cell
                    return (
                      <TableCell
                        key={row.id + "-" + i}
                        className="h-8 bg-gray-800 border border-gray-700 text-center align-middle"
                        onDrop={(e) => resolveDrop(row.id, i, e)}
                        onDragOver={(e) => e.preventDefault()}
                      ></TableCell>
                    );
                  }
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
