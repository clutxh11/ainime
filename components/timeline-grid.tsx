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
  // Asset ID for unique identification (used for color effects)
  assetId?: string;
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
    handleType: "left" | "right"; // Which handle is being dragged
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
    handleType: "left" | "right",
    e: React.MouseEvent
  ) => {

    setDragging({
      rowId,
      frameIndex,
      startX: e.clientX,
      origLength,
      origStartFrame,
      handleType,
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

      // Helper function to find collision boundaries for a given row
      const findCollisionBoundaries = (rowId: string, excludeFrameIndex: number) => {
        const rowFrames = drawingFrames
          .filter((df) => df.rowId === rowId && df.frameIndex !== excludeFrameIndex)
          .map((df) => ({
            frameIndex: df.frameIndex,
            start: df.startFrame ?? df.frameIndex,
            end: (df.startFrame ?? df.frameIndex) + df.length - 1,
          }))
          .sort((a, b) => a.start - b.start);

        return rowFrames;
      };

      if (dragging.handleType === "right") {
        // Right handle: extend end frame, keep start frame fixed
        let startFrame = dragging.origStartFrame; // Keep the current start frame fixed
        let targetLength = Math.max(1, dragging.origLength + delta);
        let targetEndFrame = startFrame + targetLength - 1;

        // Find collision boundaries - frames that could block this expansion
        const boundaries = findCollisionBoundaries(dragging.rowId, dragging.frameIndex);
        
        // Find the next frame that would block expansion
        const blockingFrame = boundaries.find((frame) => frame.start > startFrame);
        
        let framesToUpdate = [];
        
        if (blockingFrame && targetEndFrame >= blockingFrame.start) {
          // We're hitting a blocking frame - try to push it
          const pushDistance = targetEndFrame - blockingFrame.start + 1; // How much we need to push
          
          // Check if we can push the blocking frame (and any frames behind it)
          let canPush = true;
          let framesToPush = [blockingFrame];
          
          // Find all frames that would need to be pushed in a chain
          let currentPushEnd = blockingFrame.end + pushDistance;
          boundaries.forEach((frame) => {
            if (frame.start > blockingFrame.start && frame.start <= currentPushEnd) {
              framesToPush.push(frame);
              currentPushEnd = Math.max(currentPushEnd, frame.end + pushDistance);
            }
          });
          
          // Check if the final pushed position would have space
          const finalPushEnd = Math.max(...framesToPush.map(f => f.end)) + pushDistance;
          const nextFrameAfterPush = boundaries.find((frame) => 
            frame.start > Math.max(...framesToPush.map(f => f.start))
          );
          
          if (nextFrameAfterPush && finalPushEnd >= nextFrameAfterPush.start) {
            // Can't push - would collide with frame behind
            canPush = false;
          }
          
          if (canPush) {
            // Push all frames in the chain
            framesToUpdate = framesToPush.map((frame) => ({
              frameIndex: frame.frameIndex,
              newStartFrame: frame.start + pushDistance
            }));
            
            // We can extend to our target length
            // (targetLength stays as calculated)
          } else {
            // Can't push - limit extension to just before the blocking frame
            const maxEndFrame = blockingFrame.start - 1;
            if (targetEndFrame > maxEndFrame) {
              targetEndFrame = maxEndFrame;
              targetLength = Math.max(1, maxEndFrame - startFrame + 1);
            }
          }
        }

        // Ensure we have enough timeline frames
        if (targetEndFrame >= frames) {
          setFrames((prev) => targetEndFrame + 1);
        }

        setDrawingFrames((prev) =>
          prev.map((df) => {
            // Update the main frame being dragged
            if (df.rowId === dragging.rowId && df.frameIndex === dragging.frameIndex) {
              return { ...df, length: targetLength, startFrame };
            }
            
            // Update any frames that need to be pushed
            const pushUpdate = framesToUpdate.find(update => update.frameIndex === df.frameIndex);
            if (pushUpdate && df.rowId === dragging.rowId) {
              return { ...df, startFrame: pushUpdate.newStartFrame };
            }
            
            return df;
          })
        );
      } else {
        // Left handle: move start frame backward while keeping END FRAME absolutely fixed
        let originalEndFrame = dragging.origStartFrame + dragging.origLength - 1; // FIXED end position
        let targetStartFrame = Math.max(0, dragging.origStartFrame + delta);
        let targetLength = Math.max(1, originalEndFrame - targetStartFrame + 1);

        // Find collision boundaries - frames that could block moving the start backward  
        const boundaries = findCollisionBoundaries(dragging.rowId, dragging.frameIndex);
        
        // Find frames that would block moving the start frame backward
        const blockingFrame = boundaries.find((frame) => 
          frame.end >= targetStartFrame && frame.start <= targetStartFrame
        );
        
        let framesToUpdate = [];
        
        if (blockingFrame && targetStartFrame < blockingFrame.end + 1) {
          // We're hitting a blocking frame - try to push it backward
          const pushDistance = (blockingFrame.end + 1) - targetStartFrame; // How much we need to push
          
          // Check if we can push the blocking frame (and any frames in front of it)
          let canPush = true;
          let framesToPush = [blockingFrame];
          
          // Find all frames that would need to be pushed in a chain (frames to the left)
          let currentPushStart = blockingFrame.start - pushDistance;
          boundaries.forEach((frame) => {
            if (frame.end < blockingFrame.end && frame.end >= currentPushStart) {
              framesToPush.push(frame);
              currentPushStart = Math.min(currentPushStart, frame.start - pushDistance);
            }
          });
          
          // Check if the final pushed position would have space (can't go below 0)
          const finalPushStart = Math.min(...framesToPush.map(f => f.start)) - pushDistance;
          
          if (finalPushStart < 0) {
            // Can't push - would go below frame 0
            canPush = false;
          } else {
            // Check if pushing would collide with any frame to the left
            const nextFrameBeforePush = boundaries.find((frame) => 
              frame.end < Math.min(...framesToPush.map(f => f.start)) &&
              frame.end >= finalPushStart
            );
            
            if (nextFrameBeforePush) {
              canPush = false;
            }
          }
          
          if (canPush) {
            // Push all frames in the chain
            framesToUpdate = framesToPush.map((frame) => ({
              frameIndex: frame.frameIndex,
              newStartFrame: frame.start - pushDistance
            }));
            
            // We can move to our target start frame
            // (targetStartFrame and targetLength stay as calculated)
          } else {
            // Can't push - limit movement to just after the blocking frame
            const minStartFrame = blockingFrame.end + 1;
            if (targetStartFrame < minStartFrame) {
              targetStartFrame = minStartFrame;
              targetLength = Math.max(1, originalEndFrame - targetStartFrame + 1);
            }
          }
        }

        // Ensure we have enough timeline frames for the end frame
        if (originalEndFrame >= frames) {
          setFrames((prev) => originalEndFrame + 1);
        }

        setDrawingFrames((prev) =>
          prev.map((df) => {
            // Update the main frame being dragged
            if (df.rowId === dragging.rowId && df.frameIndex === dragging.frameIndex) {
              return { ...df, length: targetLength, startFrame: targetStartFrame };
            }
            
            // Update any frames that need to be pushed
            const pushUpdate = framesToUpdate.find(update => update.frameIndex === df.frameIndex);
            if (pushUpdate && df.rowId === dragging.rowId) {
              return { ...df, startFrame: pushUpdate.newStartFrame };
            }
            
            return df;
          })
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
                  const drawing = framesForRender.find((df) => {
                    const startFrame = df.startFrame ?? df.frameIndex;
                    return df.rowId === row.id && startFrame === i;
                  });
                  // Check if this cell is covered by an extended drawing frame
                  const covered = framesForRender.find((df) => {
                    const startFrame = df.startFrame ?? df.frameIndex;
                    return (
                      df.rowId === row.id &&
                      i > startFrame &&
                      i < startFrame + df.length
                    );
                  });
                  if (drawing) {
                    const effectiveStartFrame =
                      drawing.startFrame ?? drawing.frameIndex;
                    const isDragging =
                      dragging &&
                      dragging.rowId === row.id &&
                      dragging.frameIndex === drawing.frameIndex; // Keep using original frameIndex for drag tracking
                    const isSingle = drawing.length === 1;
                    const folderId = `${row.id}-${effectiveStartFrame}`;
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

                          e.stopPropagation();
                          handleCellClick(row.id, effectiveStartFrame);
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
                                      drawing.frameIndex,
                                      drawing.length,
                                      drawing.startFrame ?? drawing.frameIndex,
                                      "right",
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
                                      drawing.frameIndex,
                                      drawing.length,
                                      drawing.startFrame ?? drawing.frameIndex,
                                      "left",
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
                                  } F${(drawing.startFrame ?? i) + 1}:${
                                    (drawing.startFrame ?? i) + drawing.length
                                  }`}</span>
                                </div>
                                {/* Right handle for adjusting end frame */}
                                <span
                                  className="cursor-ew-resize pr-1 select-none flex items-center h-full"
                                  onMouseDown={(e) =>
                                    onMouseDownHandle(
                                      row.id,
                                      drawing.frameIndex,
                                      drawing.length,
                                      drawing.startFrame ?? drawing.frameIndex,
                                      "right",
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
                                    drawing.frameIndex,
                                    drawing.length,
                                    drawing.startFrame ?? drawing.frameIndex,
                                    "right",
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
                                    drawing.frameIndex,
                                    drawing.length,
                                    drawing.startFrame ?? drawing.frameIndex,
                                    "left",
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
                              } F${(drawing.startFrame ?? i) + 1}:${
                                (drawing.startFrame ?? i) + drawing.length
                              }`}</span>
                              {/* Right handle for adjusting end frame */}
                              <span
                                className="cursor-ew-resize pr-1 select-none flex items-center h-full"
                                onMouseDown={(e) =>
                                  onMouseDownHandle(
                                    row.id,
                                    drawing.frameIndex,
                                    drawing.length,
                                    drawing.startFrame ?? drawing.frameIndex,
                                    "right",
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
