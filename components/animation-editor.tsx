"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Plus,
  Save,
  Pencil,
  Eraser,
  Eye,
  EyeOff,
  Undo,
  Redo,
  Trash2,
  Palette,
  Layers,
  Download,
  RotateCcw,
  Move,
  ZoomIn,
  ZoomOut,
  Grid,
  Folder,
  FolderOpen,
  Lock,
  Unlock,
  Copy,
  Settings,
  ChevronDown,
  ChevronRight,
  Edit3,
  Lasso,
  X,
} from "lucide-react";
import type { CurrentView } from "@/types";

interface AnimationEditorProps {
  onViewChange: (view: CurrentView) => void;
}

interface Point {
  x: number;
  y: number;
}

interface DrawingStroke {
  id: string;
  points: Point[];
  color: string;
  brushSize: number;
  tool: string;
  layerId: string;
}

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendingMode: string;
  strokes: DrawingStroke[];
  thumbnail?: string;
}

interface Frame {
  id: number;
  name: string;
  expanded: boolean;
  layers: Layer[];
  thumbnail?: string;
}

interface SelectionArea {
  points: Point[];
  selectedStrokes: DrawingStroke[];
}

export function AnimationEditor({ onViewChange }: AnimationEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<
    "pencil" | "eraser" | "brush" | "move"
  >("pencil");
  const [brushSize, setBrushSize] = useState(5);
  const [color, setColor] = useState("#000000");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(1);
  const [currentLayer, setCurrentLayer] = useState<string>("");
  const [onionSkin, setOnionSkin] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [editingLayer, setEditingLayer] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const [isSelecting, setIsSelecting] = useState(false);
  const [eraserStyle, setEraserStyle] = useState<"precision" | "stroke">(
    "precision"
  );
  const [eraserSize, setEraserSize] = useState(10);
  const [isHoveringToolbar, setIsHoveringToolbar] = useState(false);
  const [eraserCircle, setEraserCircle] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [lassoSelection, setLassoSelection] = useState<{
    points: Point[];
    selectedStrokeIds: string[];
    isActive: boolean;
  } | null>(null);
  const [originalLassoPoints, setOriginalLassoPoints] = useState<Point[]>([]);
  const [originalStrokePositions, setOriginalStrokePositions] = useState<{
    [strokeId: string]: { points: Point[] };
  }>({});

  // Generate unique stroke IDs
  const generateStrokeId = useCallback(() => {
    return `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const [frames, setFrames] = useState<Frame[]>([
    {
      id: 1,
      name: "Frame 1",
      expanded: true,
      layers: [
        {
          id: "1-1",
          name: "Untitled.1",
          visible: true,
          locked: false,
          opacity: 100,
          blendingMode: "Normal",
          strokes: [],
        },
      ],
    },
  ]);
  const [currentStroke, setCurrentStroke] = useState<DrawingStroke | null>(
    null
  );
  const [undoStack, setUndoStack] = useState<Frame[][]>([]);
  const [redoStack, setRedoStack] = useState<Frame[][]>([]);

  // Set initial current layer
  useEffect(() => {
    const currentFrameData = frames.find((f) => f.id === currentFrame);
    if (currentFrameData && currentFrameData.layers.length > 0) {
      // Only set current layer if it's not already set or if the current layer doesn't exist in this frame
      if (
        !currentLayer ||
        !currentFrameData.layers.find((l) => l.id === currentLayer)
      ) {
        setCurrentLayer(currentFrameData.layers[0].id);
      }
    }
  }, [currentFrame, frames, currentLayer]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas width/height to match display size * zoom
    const displayWidth = 800;
    const displayHeight = 600;
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    canvas.style.width = `${displayWidth * zoom}px`;
    canvas.style.height = `${displayHeight * zoom}px`;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    contextRef.current = context;

    drawFrame();
  }, [zoom]);

  // Helper to get mouse position in canvas coordinates (accounting for zoom)
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    // Map mouse to canvas internal coordinates
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Drawing functions
  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!contextRef.current || !currentLayer) return;
      const { x, y } = getCanvasCoords(e);

      if (currentTool === "move") {
        // Check if clicking inside existing lasso selection
        if (lassoSelection && lassoSelection.isActive) {
          if (isPointInPolygon({ x, y }, lassoSelection.points)) {
            // Clicking inside lasso - start moving selected strokes
            setIsDragging(true);
            // Store the initial mouse position for drag offset calculation
            setDragOffset({ x, y });
            // Store original lasso points
            setOriginalLassoPoints([...lassoSelection.points]);
            // Store original stroke positions
            const originalPositions: {
              [strokeId: string]: { points: Point[] };
            } = {};
            lassoSelection.selectedStrokeIds.forEach((strokeId) => {
              const stroke = frames
                .find((f) => f.id === currentFrame)
                ?.layers.find((l) => l.id === currentLayer)
                ?.strokes.find((s) => s.id === strokeId);
              if (stroke) {
                originalPositions[strokeId] = {
                  points: [...stroke.points],
                };
              }
            });
            setOriginalStrokePositions(originalPositions);
            return;
          } else {
            // Clicking outside lasso - clear selection
            setLassoSelection(null);
            setOriginalLassoPoints([]);
            setOriginalStrokePositions({});
          }
        }

        // Start new lasso selection
        setIsSelecting(true);
        setLassoSelection({
          points: [{ x, y }],
          selectedStrokeIds: [],
          isActive: false,
        });
        return;
      }

      setIsDrawing(true);

      // For eraser tool, we'll handle stroke creation in the draw function
      if (currentTool === "eraser") {
        return;
      }

      contextRef.current.beginPath();
      contextRef.current.moveTo(x, y);

      const newStroke: DrawingStroke = {
        id: generateStrokeId(),
        points: [{ x, y }],
        color,
        brushSize: currentTool === "eraser" ? eraserSize : brushSize,
        tool: currentTool,
        layerId: currentLayer,
      };
      setCurrentStroke(newStroke);
    },
    [
      color,
      brushSize,
      currentTool,
      currentLayer,
      zoom,
      frames,
      currentFrame,
      lassoSelection,
      eraserSize,
    ]
  );

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!contextRef.current) return;
      const { x, y } = getCanvasCoords(e);

      // Update eraser circle position when eraser tool is active
      if (currentTool === "eraser") {
        setEraserCircle({ x, y });
      }

      if (currentTool === "move" && isSelecting && lassoSelection) {
        // Continue lasso selection
        setLassoSelection((prev) =>
          prev
            ? {
                ...prev,
                points: [...prev.points, { x, y }],
              }
            : null
        );
        return;
      }

      if (currentTool === "move" && isDragging && lassoSelection) {
        // Handle moving selected strokes
        const currentOffsetX = x - dragOffset.x;
        const currentOffsetY = y - dragOffset.y;

        console.log(
          "Dragging - Total Movement:",
          currentOffsetX,
          currentOffsetY,
          "Selected strokes:",
          lassoSelection.selectedStrokeIds.length
        );
        console.log(
          "Selected stroke details:",
          lassoSelection.selectedStrokeIds
            .map((strokeId) => {
              const stroke = frames
                .find((f) => f.id === currentFrame)
                ?.layers.find((l) => l.id === currentLayer)
                ?.strokes.find((s) => s.id === strokeId);
              return stroke
                ? {
                    id: stroke.id,
                    points: stroke.points.length,
                    color: stroke.color,
                    firstPoint: stroke.points[0],
                    lastPoint: stroke.points[stroke.points.length - 1],
                  }
                : null;
            })
            .filter(Boolean)
        );

        setFrames((prev) => {
          const newFrames = prev.map((frame) =>
            frame.id === currentFrame
              ? {
                  ...frame,
                  layers: frame.layers.map((layer) =>
                    layer.id === currentLayer
                      ? {
                          ...layer,
                          strokes: layer.strokes.map((stroke) => {
                            // Check if this stroke is in the selected strokes by ID
                            const isSelected =
                              lassoSelection.selectedStrokeIds.includes(
                                stroke.id
                              );

                            if (isSelected) {
                              console.log(
                                "Moving stroke",
                                stroke.id,
                                "with total movement:",
                                currentOffsetX,
                                currentOffsetY
                              );
                              const originalPosition =
                                originalStrokePositions[stroke.id];
                              if (originalPosition) {
                                console.log(
                                  "Using original position for stroke",
                                  stroke.id
                                );
                                return {
                                  ...stroke,
                                  points: originalPosition.points.map(
                                    (point) => ({
                                      x: point.x + currentOffsetX,
                                      y: point.y + currentOffsetY,
                                    })
                                  ),
                                };
                              }
                            }
                            return stroke;
                          }),
                        }
                      : layer
                  ),
                }
              : frame
          );
          return newFrames;
        });

        // Update lasso selection points to move with the content
        setLassoSelection((prev) =>
          prev
            ? {
                ...prev,
                points: originalLassoPoints.map((point) => ({
                  x: point.x + currentOffsetX,
                  y: point.y + currentOffsetY,
                })),
              }
            : null
        );

        // Save to undo stack after moving strokes
        setTimeout(() => saveToUndoStack(), 0);
        return;
      }

      if (!isDrawing) return;

      // Handle eraser tool differently - remove strokes instead of drawing
      if (currentTool === "eraser") {
        // Create an eraser stroke for visual feedback
        if (!currentStroke) {
          const eraserStroke: DrawingStroke = {
            id: generateStrokeId(),
            points: [{ x, y }],
            color: "#ffffff",
            brushSize: eraserSize,
            tool: "eraser",
            layerId: currentLayer,
          };
          setCurrentStroke(eraserStroke);
        } else {
          setCurrentStroke((prev) =>
            prev
              ? {
                  ...prev,
                  points: [...prev.points, { x, y }],
                }
              : null
          );
        }

        // Handle different eraser styles
        if (eraserStyle === "stroke") {
          // Stroke eraser: remove entire strokes that intersect with the eraser
          setFrames((prev) => {
            const newFrames = prev.map((frame) =>
              frame.id === currentFrame
                ? {
                    ...frame,
                    layers: frame.layers.map((layer) =>
                      layer.id === currentLayer
                        ? {
                            ...layer,
                            strokes: layer.strokes.filter((stroke) => {
                              // Check if any point in the stroke is within eraser radius
                              const shouldRemove = stroke.points.some(
                                (point) => {
                                  const distance = Math.sqrt(
                                    (point.x - x) ** 2 + (point.y - y) ** 2
                                  );
                                  return distance <= eraserSize;
                                }
                              );

                              return !shouldRemove;
                            }),
                          }
                        : layer
                    ),
                  }
                : frame
            );
            return newFrames;
          });
        } else {
          // Precision eraser: remove parts of strokes within eraser radius
          setFrames((prev) => {
            const newFrames = prev.map((frame) =>
              frame.id === currentFrame
                ? {
                    ...frame,
                    layers: frame.layers.map((layer) =>
                      layer.id === currentLayer
                        ? {
                            ...layer,
                            strokes: layer.strokes
                              .map((stroke) => {
                                // Filter out points that are within eraser radius
                                const filteredPoints = stroke.points.filter(
                                  (point) => {
                                    const distance = Math.sqrt(
                                      (point.x - x) ** 2 + (point.y - y) ** 2
                                    );
                                    return distance > eraserSize;
                                  }
                                );

                                // If stroke has enough points left, return modified stroke
                                if (filteredPoints.length >= 2) {
                                  return {
                                    ...stroke,
                                    points: filteredPoints,
                                  };
                                } else {
                                  // If stroke has less than 2 points, remove it entirely
                                  return null;
                                }
                              })
                              .filter(Boolean) as DrawingStroke[], // Remove null strokes
                          }
                        : layer
                    ),
                  }
                : frame
            );
            return newFrames;
          });
        }
        return;
      }

      // Normal drawing for non-eraser tools
      if (!currentStroke) return;

      contextRef.current.lineTo(x, y);
      contextRef.current.stroke();

      setCurrentStroke((prev) =>
        prev
          ? {
              ...prev,
              points: [...prev.points, { x, y }],
              brushSize: currentTool === "eraser" ? eraserSize : brushSize,
            }
          : null
      );
    },
    [
      isDrawing,
      currentStroke,
      zoom,
      currentTool,
      isSelecting,
      lassoSelection,
      isDragging,
      dragOffset,
      currentFrame,
      eraserSize,
      brushSize,
      currentLayer,
      eraserStyle,
    ]
  );

  const stopDrawing = useCallback(() => {
    if (currentTool === "move") {
      if (isSelecting && lassoSelection) {
        // Complete lasso selection - close the loop and find strokes within the area
        const closedPoints = [...lassoSelection.points];
        if (closedPoints.length > 2) {
          // Close the loop by connecting the last point to the first
          closedPoints.push(closedPoints[0]);
        }

        const currentFrameData = frames.find((f) => f.id === currentFrame);
        if (currentFrameData) {
          const currentLayerData = currentFrameData.layers.find(
            (l) => l.id === currentLayer
          );
          if (currentLayerData) {
            const selectedStrokeIds: string[] = [];
            currentLayerData.strokes.forEach((stroke) => {
              // Check if any point in the stroke is within the selection area
              if (
                stroke.points.some((point) =>
                  isPointInPolygon(point, closedPoints)
                )
              ) {
                selectedStrokeIds.push(stroke.id);
              }
            });

            // Update lasso selection with closed loop and selected stroke IDs
            setLassoSelection({
              points: closedPoints,
              selectedStrokeIds,
              isActive: true,
            });
            console.log(
              "Lasso created with selected strokes:",
              selectedStrokeIds.length
            );
            console.log("Selected stroke IDs:", selectedStrokeIds);
          }
        }
        setIsSelecting(false);
        return;
      } else if (isDragging) {
        setIsDragging(false);
        setOriginalLassoPoints([]);
        setOriginalStrokePositions({});
        return;
      }
      return;
    }

    if (!isDrawing) return;

    setIsDrawing(false);

    // For eraser tool, we don't save the eraser stroke, just the erasing action
    if (currentTool === "eraser") {
      setCurrentStroke(null);
      // Save to undo stack after erasing
      setTimeout(() => saveToUndoStack(), 0);
      return;
    }

    if (!currentStroke) return;

    contextRef.current?.closePath();

    // Save stroke to current layer
    setFrames((prev) => {
      const newFrames = prev.map((frame) =>
        frame.id === currentFrame
          ? {
              ...frame,
              layers: frame.layers.map((layer) =>
                layer.id === currentLayer
                  ? { ...layer, strokes: [...layer.strokes, currentStroke] }
                  : layer
              ),
            }
          : frame
      );
      return newFrames;
    });

    // Save to undo stack after adding stroke
    setTimeout(() => saveToUndoStack(), 0);

    setCurrentStroke(null);

    // Hide eraser circle when not using eraser tool
    if (currentTool !== "eraser") {
      setEraserCircle(null);
    }
  }, [
    isDrawing,
    currentStroke,
    currentFrame,
    currentLayer,
    frames,
    currentTool,
    isSelecting,
    lassoSelection,
    isDragging,
  ]);

  // Helper function to check if a point is inside a polygon
  const isPointInPolygon = (point: Point, polygon: Point[]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      if (
        polygon[i].y > point.y !== polygon[j].y > point.y &&
        point.x <
          ((polygon[j].x - polygon[i].x) * (point.y - polygon[i].y)) /
            (polygon[j].y - polygon[i].y) +
            polygon[i].x
      ) {
        inside = !inside;
      }
    }
    return inside;
  };

  // Draw current frame
  const drawFrame = useCallback(() => {
    const context = contextRef.current;
    const canvas = canvasRef.current;
    if (!context || !canvas) return;

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid (always in unscaled context)
    if (showGrid) {
      context.save();
      context.strokeStyle = "#e5e7eb";
      context.lineWidth = 1;
      const gridSize = 20;

      for (let x = 0; x <= canvas.width; x += gridSize) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, canvas.height);
        context.stroke();
      }

      for (let y = 0; y <= canvas.height; y += gridSize) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(canvas.width, y);
        context.stroke();
      }
      context.restore();
    }

    // Draw onion skin (previous frame)
    if (onionSkin && currentFrame > 1) {
      const prevFrame = frames.find((f) => f.id === currentFrame - 1);
      if (prevFrame) {
        drawFrameLayers(prevFrame.layers, true);
      }
    }

    // Draw current frame layers
    const currentFrameData = frames.find((f) => f.id === currentFrame);
    if (currentFrameData) {
      drawFrameLayers(currentFrameData.layers);
    }

    // Draw current stroke
    if (currentStroke) {
      drawStrokes([currentStroke]);
    }

    // Draw lasso selection area
    if (
      lassoSelection &&
      lassoSelection.points.length > 1 &&
      currentTool === "move"
    ) {
      context.strokeStyle = "#3b82f6";
      context.lineWidth = 2;
      context.setLineDash([5, 5]);
      context.beginPath();
      context.moveTo(lassoSelection.points[0].x, lassoSelection.points[0].y);
      for (let i = 1; i < lassoSelection.points.length; i++) {
        context.lineTo(lassoSelection.points[i].x, lassoSelection.points[i].y);
      }
      context.stroke();
      context.setLineDash([]);
    }

    // Draw eraser circle
    if (eraserCircle && currentTool === "eraser") {
      context.save();
      context.fillStyle = "rgba(128, 128, 128, 0.3)"; // Light gray with transparency
      context.beginPath();
      context.arc(eraserCircle.x, eraserCircle.y, eraserSize, 0, 2 * Math.PI);
      context.fill();
      context.restore();
    }
  }, [
    frames,
    currentFrame,
    onionSkin,
    showGrid,
    currentStroke,
    currentTool,
    lassoSelection,
    eraserCircle,
    eraserSize,
  ]);

  // Draw frame layers
  const drawFrameLayers = useCallback(
    (layers: Layer[], isOnionSkin = false) => {
      layers.forEach((layer) => {
        if (!layer.visible) return;

        const context = contextRef.current;
        if (!context) return;

        // For onion skin, multiply the layer opacity by the onion skin opacity
        const opacity = isOnionSkin
          ? (layer.opacity / 100) * 0.3
          : layer.opacity / 100;
        context.globalAlpha = opacity;

        drawStrokes(layer.strokes);
      });

      // Only reset globalAlpha if not drawing onion skin
      if (contextRef.current && !isOnionSkin) {
        contextRef.current.globalAlpha = 1;
      }
    },
    []
  );

  // Draw strokes helper
  const drawStrokes = useCallback((strokes: DrawingStroke[]) => {
    const context = contextRef.current;
    if (!context) return;

    strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;

      context.strokeStyle = stroke.color;
      context.lineWidth = stroke.brushSize;
      context.globalCompositeOperation = "source-over";

      context.beginPath();
      context.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length; i++) {
        context.lineTo(stroke.points[i].x, stroke.points[i].y);
      }

      context.stroke();
    });
  }, []);

  // Update canvas when frame changes
  useEffect(() => {
    drawFrame();
  }, [drawFrame, currentFrame, frames]);

  // Animation playback
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentFrame((prev) => {
        if (prev >= frames.length) {
          setIsPlaying(false);
          return 1;
        }
        return prev + 1;
      });
    }, 200); // 5 FPS

    return () => clearInterval(interval);
  }, [isPlaying, frames.length]);

  // Tools
  const tools = [
    { id: "pencil", icon: Pencil, label: "Pencil" },
    { id: "brush", icon: Palette, label: "Brush" },
    { id: "eraser", icon: Eraser, label: "Eraser" },
    { id: "move", icon: Move, label: "Move" },
  ];

  // Frame management
  const addFrame = () => {
    const newFrame: Frame = {
      id: frames.length + 1,
      name: `Frame ${frames.length + 1}`,
      expanded: false,
      layers: [
        {
          id: `${frames.length + 1}-1`,
          name: "Untitled.1",
          visible: true,
          locked: false,
          opacity: 100,
          blendingMode: "Normal",
          strokes: [],
        },
      ],
    };
    setFrames((prev) => {
      const newFrames = [...prev, newFrame];
      setTimeout(() => saveToUndoStack(), 0);
      return newFrames;
    });
  };

  const deleteFrame = () => {
    if (frames.length <= 1) return;
    setFrames((prev) => {
      const newFrames = prev.filter((f) => f.id !== currentFrame);
      setTimeout(() => saveToUndoStack(), 0);
      return newFrames;
    });
    setCurrentFrame((prev) => Math.max(1, prev - 1));
  };

  const duplicateFrame = () => {
    const currentFrameData = frames.find((f) => f.id === currentFrame);
    if (!currentFrameData) return;

    const newFrame: Frame = {
      id: frames.length + 1,
      name: `${currentFrameData.name} Copy`,
      expanded: false,
      layers: currentFrameData.layers.map((layer) => ({
        ...layer,
        id: `${frames.length + 1}-${layer.id.split("-")[1]}`,
        strokes: [...layer.strokes],
      })),
    };
    setFrames((prev) => {
      const newFrames = [...prev, newFrame];
      setTimeout(() => saveToUndoStack(), 0);
      return newFrames;
    });
  };

  // Layer management
  const addLayer = () => {
    const currentFrameData = frames.find((f) => f.id === currentFrame);
    if (!currentFrameData) return;

    const layerCount = currentFrameData.layers.length;
    const newLayer: Layer = {
      id: `${currentFrame}-${Date.now()}`,
      name: `Untitled.${layerCount + 1}`,
      visible: true,
      locked: false,
      opacity: 100,
      blendingMode: "Normal",
      strokes: [],
    };

    setFrames((prev) => {
      const newFrames = prev.map((frame) =>
        frame.id === currentFrame
          ? { ...frame, layers: [...frame.layers, newLayer] }
          : frame
      );
      setTimeout(() => saveToUndoStack(), 0);
      return newFrames;
    });
  };

  const deleteLayer = (layerId: string) => {
    setFrames((prev) => {
      const newFrames = prev.map((frame) =>
        frame.id === currentFrame
          ? { ...frame, layers: frame.layers.filter((l) => l.id !== layerId) }
          : frame
      );
      setTimeout(() => saveToUndoStack(), 0);
      return newFrames;
    });
  };

  const toggleLayerVisibility = (layerId: string) => {
    setFrames((prev) =>
      prev.map((frame) =>
        frame.id === currentFrame
          ? {
              ...frame,
              layers: frame.layers.map((layer) =>
                layer.id === layerId
                  ? { ...layer, visible: !layer.visible }
                  : layer
              ),
            }
          : frame
      )
    );
  };

  const toggleLayerLock = (layerId: string) => {
    setFrames((prev) =>
      prev.map((frame) =>
        frame.id === currentFrame
          ? {
              ...frame,
              layers: frame.layers.map((layer) =>
                layer.id === layerId
                  ? { ...layer, locked: !layer.locked }
                  : layer
              ),
            }
          : frame
      )
    );
  };

  const toggleFrameExpansion = (frameId: number) => {
    setFrames((prev) =>
      prev.map((frame) =>
        frame.id === frameId ? { ...frame, expanded: !frame.expanded } : frame
      )
    );
  };

  // Layer renaming
  const startEditingLayer = (layerId: string, currentName: string) => {
    setEditingLayer(layerId);
    setEditingName(currentName);
  };

  const saveLayerName = () => {
    if (!editingLayer) return;

    setFrames((prev) => {
      const newFrames = prev.map((frame) =>
        frame.id === currentFrame
          ? {
              ...frame,
              layers: frame.layers.map((layer) =>
                layer.id === editingLayer
                  ? { ...layer, name: editingName }
                  : layer
              ),
            }
          : frame
      );
      setTimeout(() => saveToUndoStack(), 0);
      return newFrames;
    });

    setEditingLayer(null);
    setEditingName("");
  };

  const cancelEditing = () => {
    setEditingLayer(null);
    setEditingName("");
  };

  // Handle Enter and Escape keys for layer renaming
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveLayerName();
    } else if (e.key === "Escape") {
      cancelEditing();
    }
  };

  // Export
  const exportAnimation = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = "animation.png";
    link.href = canvas.toDataURL();
    link.click();
  };

  // Undo/Redo functions
  const saveToUndoStack = useCallback(() => {
    setUndoStack((prev) => [...prev, JSON.parse(JSON.stringify(frames))]);
    setRedoStack([]); // Clear redo stack when new action is performed
  }, [frames]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;

    const previousState = undoStack[undoStack.length - 1];
    const currentState = JSON.parse(JSON.stringify(frames));

    setFrames(previousState);
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, currentState]);
  }, [undoStack, frames]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;

    const nextState = redoStack[redoStack.length - 1];
    const currentState = JSON.parse(JSON.stringify(frames));

    setFrames(nextState);
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, currentState]);
  }, [redoStack, frames]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  const currentFrameData = frames.find((f) => f.id === currentFrame);
  const currentLayerData = currentFrameData?.layers.find(
    (l) => l.id === currentLayer
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Top Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewChange("creator")}
              className="text-gray-300 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Creator Hub
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <h1 className="text-lg font-semibold">Animation Editor</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-gray-400 bg-transparent border-gray-600"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" size="sm">
              Publish
            </Button>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 min-h-0">
        {/* Collapsible Toolbar */}
        <div
          className="relative flex items-stretch"
          onMouseEnter={() => setIsHoveringToolbar(true)}
          onMouseLeave={() => setIsHoveringToolbar(false)}
        >
          {/* Tool Sidebar */}
          <div className="w-20 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-4 gap-2 flex-shrink-0">
            {tools.map((tool) => (
              <Button
                key={tool.id}
                variant={currentTool === tool.id ? "default" : "ghost"}
                size="sm"
                className="w-12 h-12 p-0"
                onClick={() => {
                  setCurrentTool(tool.id as any);
                  // Reset move tool state when switching tools
                  if (tool.id !== "move") {
                    setLassoSelection(null);
                    setOriginalLassoPoints([]);
                    setOriginalStrokePositions({});
                    setIsSelecting(false);
                    setIsDragging(false);
                  }
                  // Hide eraser circle when switching away from eraser tool
                  if (tool.id !== "eraser") {
                    setEraserCircle(null);
                  }
                }}
                title={tool.label}
              >
                <tool.icon className="w-5 h-5" />
              </Button>
            ))}

            <Separator className="w-8 my-2" />

            <Button
              variant="ghost"
              size="sm"
              className="w-12 h-12 p-0"
              onClick={undo}
              disabled={undoStack.length === 0}
              title="Undo"
            >
              <Undo className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-12 h-12 p-0"
              onClick={redo}
              disabled={redoStack.length === 0}
              title="Redo"
            >
              <Redo className="w-5 h-5" />
            </Button>

            <Separator className="w-8 my-2" />

            <Button
              variant={onionSkin ? "default" : "ghost"}
              size="sm"
              className="w-12 h-12 p-0"
              onClick={() => setOnionSkin(!onionSkin)}
              title="Onion Skin"
            >
              {onionSkin ? (
                <Eye className="w-5 h-5" />
              ) : (
                <EyeOff className="w-5 h-5" />
              )}
            </Button>

            <Button
              variant={showGrid ? "default" : "ghost"}
              size="sm"
              className="w-12 h-12 p-0"
              onClick={() => setShowGrid(!showGrid)}
              title="Show Grid"
            >
              <Grid className="w-5 h-5" />
            </Button>
          </div>

          {/* Sliding Settings Panel */}
          <div
            className={`bg-gray-800 border-r border-gray-700 transition-all duration-300 ease-in-out overflow-hidden ${
              isHoveringToolbar ? "w-64" : "w-0"
            }`}
          >
            <div className="p-4 space-y-4 min-w-64">
              {/* Pencil/Brush Settings */}
              {(currentTool === "pencil" || currentTool === "brush") && (
                <>
                  <div>
                    <Label className="text-sm font-medium">Color</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-12 h-8 p-1 border-gray-600"
                      />
                      <Input
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="flex-1"
                        placeholder="#000000"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">
                      Brush Size: {brushSize}px
                    </Label>
                    <Slider
                      value={[brushSize]}
                      onValueChange={(value) => setBrushSize(value[0])}
                      max={50}
                      min={1}
                      step={1}
                      className="mt-2"
                    />
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-sm font-medium">Quick Colors</Label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {[
                        "#000000",
                        "#ff0000",
                        "#00ff00",
                        "#0000ff",
                        "#ffff00",
                        "#ff00ff",
                        "#00ffff",
                        "#ffffff",
                      ].map((c) => (
                        <button
                          key={c}
                          className="w-8 h-8 rounded border-2 border-gray-600 hover:border-white"
                          style={{ backgroundColor: c }}
                          onClick={() => setColor(c)}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Eraser Settings */}
              {currentTool === "eraser" && (
                <>
                  <div>
                    <h3 className="text-sm font-medium mb-3">ERASER STYLE</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 border border-gray-600 rounded-lg">
                        <div className="w-8 h-8 bg-gray-600 rounded flex items-center justify-center">
                          <Eraser className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            Precision Eraser
                          </div>
                          <div className="text-xs text-gray-400">
                            Erase exact areas touched by eraser
                          </div>
                        </div>
                        <Button
                          variant={
                            eraserStyle === "precision" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setEraserStyle("precision")}
                        >
                          Select
                        </Button>
                      </div>

                      <div className="flex items-center gap-3 p-3 border border-gray-600 rounded-lg">
                        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                          <Eraser className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            Stroke Eraser
                          </div>
                          <div className="text-xs text-gray-400">
                            Remove entire strokes when touched
                          </div>
                        </div>
                        <Button
                          variant={
                            eraserStyle === "stroke" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setEraserStyle("stroke")}
                        >
                          Select
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-3">ERASER SIZE</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Size: {eraserSize}px</Label>
                      </div>
                      <Slider
                        value={[eraserSize]}
                        onValueChange={(value) => setEraserSize(value[0])}
                        max={100}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Zoom Controls (always visible) */}
              <div>
                <Label className="text-sm font-medium">
                  Zoom: {Math.round(zoom * 100)}%
                </Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.1))}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom(1)}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom((prev) => Math.min(3, prev + 0.1))}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Canvas Area */}
          <div className="flex-1 bg-gray-900 flex items-center justify-center p-4 min-h-0">
            <Card className="bg-white max-w-full max-h-full">
              <CardContent className="p-0">
                <canvas
                  ref={canvasRef}
                  className="border border-gray-300 cursor-crosshair max-w-full max-h-full"
                  style={{ imageRendering: "pixelated" }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={() => {
                    stopDrawing();
                    setEraserCircle(null);
                  }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Timeline */}
          <div className="bg-gray-800 border-t border-gray-700 p-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentFrame(1)}
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentFrame(frames.length)}
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-300 ml-4">
                  Frame {currentFrame} of {frames.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-gray-600"
                  onClick={addFrame}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Frame
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-gray-600"
                  onClick={duplicateFrame}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-gray-600"
                  onClick={deleteFrame}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-gray-600"
                  onClick={exportAnimation}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {frames.map((frame) => (
                <Card
                  key={frame.id}
                  className={`min-w-[100px] cursor-pointer transition-colors flex-shrink-0 ${
                    currentFrame === frame.id
                      ? "bg-blue-600 border-blue-500"
                      : "bg-gray-700 border-gray-600 hover:bg-gray-600"
                  }`}
                  onClick={() => setCurrentFrame(frame.id)}
                >
                  <CardContent className="p-2">
                    <div className="w-full h-16 bg-gray-600 rounded mb-2 flex items-center justify-center">
                      <span className="text-xs text-gray-400">
                        Frame {frame.id}
                      </span>
                    </div>
                    <div className="text-xs text-center text-gray-300">
                      {frame.id === 1
                        ? "0.0s"
                        : `${((frame.id - 1) * 0.1).toFixed(1)}s`}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Layer Panel */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-gray-700 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Layers</h3>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-8 h-8 p-0"
                  onClick={addLayer}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Opacity Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-400">Opacity</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-6 h-6 p-0"
                  onClick={() =>
                    currentLayerData && deleteLayer(currentLayerData.id)
                  }
                  title="Delete Layer"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              <Slider
                value={[currentLayerData?.opacity || 100]}
                onValueChange={(value) => {
                  if (currentLayerData) {
                    setFrames((prev) =>
                      prev.map((frame) =>
                        frame.id === currentFrame
                          ? {
                              ...frame,
                              layers: frame.layers.map((layer) =>
                                layer.id === currentLayer
                                  ? { ...layer, opacity: value[0] }
                                  : layer
                              ),
                            }
                          : frame
                      )
                    );
                  }
                }}
                max={100}
                min={0}
                step={1}
                className="w-full"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {frames.map((frame) => (
                <div key={frame.id}>
                  {/* Frame Header */}
                  <div
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                      currentFrame === frame.id
                        ? "bg-blue-600"
                        : "hover:bg-gray-700"
                    }`}
                    onClick={() => toggleFrameExpansion(frame.id)}
                  >
                    {frame.expanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    {frame.expanded ? (
                      <FolderOpen className="w-4 h-4" />
                    ) : (
                      <Folder className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium">{frame.name}</span>
                  </div>

                  {/* Frame Layers */}
                  {frame.expanded && (
                    <div className="ml-6 space-y-1">
                      {frame.layers.map((layer) => (
                        <div
                          key={layer.id}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                            currentLayer === layer.id
                              ? "bg-blue-500"
                              : "hover:bg-gray-700"
                          }`}
                          onClick={() => setCurrentLayer(layer.id)}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-6 h-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLayerVisibility(layer.id);
                            }}
                          >
                            {layer.visible ? (
                              <Eye className="w-4 h-4" />
                            ) : (
                              <EyeOff className="w-4 h-4" />
                            )}
                          </Button>

                          <div className="w-6 h-6 bg-gray-600 rounded flex items-center justify-center">
                            <span className="text-xs text-gray-400">L</span>
                          </div>

                          {editingLayer === layer.id ? (
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={handleKeyPress}
                              onBlur={saveLayerName}
                              className="flex-1 text-sm h-6"
                              autoFocus
                            />
                          ) : (
                            <span className="text-sm flex-1">{layer.name}</span>
                          )}

                          <span className="text-xs text-gray-400">
                            {layer.opacity}%
                          </span>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-6 h-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLayerLock(layer.id);
                            }}
                          >
                            {layer.locked ? (
                              <Lock className="w-4 h-4" />
                            ) : (
                              <Unlock className="w-4 h-4" />
                            )}
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-6 h-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditingLayer(layer.id, layer.name);
                            }}
                            title="Rename Layer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>

                          {currentLayer === layer.id && (
                            <Pencil className="w-4 h-4 text-blue-400" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
