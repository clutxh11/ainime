"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
  ChevronUp,
} from "lucide-react";
import type { CurrentView } from "@/types";
import TimelineGrid, { DrawingFrame } from "./timeline-grid";

interface AnimationEditorProps {
  onViewChange: (view: CurrentView) => void;
  sceneSettings?: {
    sceneName: string;
    canvasWidth: number;
    canvasHeight: number;
    frameRate: number;
  };
}

interface Point {
  x: number;
  y: number;
}

// No need for image-specific properties on DrawingStroke
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

export function AnimationEditor({
  onViewChange,
  sceneSettings,
}: AnimationEditorProps) {
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
  const [layerVisibility, setLayerVisibility] = useState<{
    [key: string]: boolean;
  }>({});
  const [editingLayerName, setEditingLayerName] = useState<string | null>(null);
  const [editingLayerValue, setEditingLayerValue] = useState("");

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

  const [totalMovement, setTotalMovement] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [lastWheelTime, setLastWheelTime] = useState(0);

  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [selectedFrameNumber, setSelectedFrameNumber] = useState<number | null>(
    null
  );
  const [layerOpacities, setLayerOpacities] = useState<{
    [key: string]: number;
  }>({});
  const [layerStrokes, setLayerStrokes] = useState<{
    [layerId: string]: DrawingStroke[];
  }>({});
  const [openFolders, setOpenFolders] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [folderLayers, setFolderLayers] = useState<{ [key: string]: string[] }>(
    {}
  );
  const imageCache = useRef<Record<string, HTMLImageElement>>({});
  const [isLooping, setIsLooping] = useState(false);

  const [rows, setRows] = useState([
    { id: "row-1", name: "Row1" },
    { id: "row-2", name: "Row2" },
  ]);
  const [frameCount, setFrameCount] = useState(20);
  const [drawingFrames, setDrawingFrames] = useState<DrawingFrame[]>(() => {
    // Create a background layer if scene settings are provided
    if (sceneSettings) {
      return [
        {
          rowId: "row-1",
          frameIndex: 0,
          length: 1,
          imageUrl: "", // No image, just a background layer
          fileName: `${sceneSettings.sceneName} - Background`,
        },
      ];
    }
    return [];
  });

  const maxFrame = useMemo(() => {
    if (drawingFrames.length === 0) {
      return 1;
    }
    // Find the last frame index that has content
    return Math.max(1, ...drawingFrames.map((df) => df.frameIndex + df.length));
  }, [drawingFrames]);

  // Generate unique stroke IDs
  const generateStrokeId = useCallback(() => {
    return `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const [selectedRow, setSelectedRow] = useState(rows[0].id);
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

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Actual canvas resolution (for quality)
    const canvasWidth = sceneSettings?.canvasWidth ?? 800;
    const canvasHeight = sceneSettings?.canvasHeight ?? 600;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Calculate display size to fit viewport (max 70vh for timeline space)
    const maxDisplayHeight = window.innerHeight * 0.6; // Leave space for timeline
    const maxDisplayWidth = window.innerWidth * 0.7; // Leave space for sidebars

    const scaleX = maxDisplayWidth / canvasWidth;
    const scaleY = maxDisplayHeight / canvasHeight;
    const autoScale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%

    // Apply auto-scaling with zoom
    const finalScale = autoScale * zoom;
    canvas.style.width = `${canvasWidth * finalScale}px`;
    canvas.style.height = `${canvasHeight * finalScale}px`;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    contextRef.current = context;

    drawFrame();
  }, [zoom, sceneSettings]);

  // Helper to get mouse position in canvas coordinates (accounting for zoom)
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    // Map mouse to canvas internal coordinates (pan is handled by CSS transform)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Add this helper function to create an image stroke
  const createImageStroke = async (
    file: File,
    layerId: string,
    x: number,
    y: number
  ): Promise<DrawingStroke> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        // Scale the image to a reasonable size while maintaining aspect ratio
        const maxSize = 200;
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        const width = img.width * scale;
        const height = img.height * scale;

        resolve({
          id: generateStrokeId(),
          points: [], // Images don't need points
          color: "none",
          brushSize: 0,
          tool: "image",
          layerId,
        });
      };
      img.src = url;
    });
  };

  // Restore the original drawStrokes function
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

  // Draw frame layers
  const drawFrameLayers = useCallback(
    (layers: Layer[], isOnionSkin = false) => {
      layers.forEach((layer) => {
        // Check visibility using the new layerVisibility system
        const layerId = layer.id;
        const isVisible = layerVisibility[layerId] !== false;
        if (!isVisible) return;

        const context = contextRef.current;
        if (!context) return;

        // Get opacity from the new layerOpacities system
        const opacity = isOnionSkin
          ? (layerOpacities[layerId] ?? 1) * 0.3
          : layerOpacities[layerId] ?? 1;
        context.globalAlpha = opacity;

        drawStrokes(layer.strokes);
      });

      // Draw strokes from the new layer system
      Object.entries(layerStrokes).forEach(([layerId, strokes]) => {
        // Check visibility using the new layerVisibility system
        const isVisible = layerVisibility[layerId] !== false;
        if (!isVisible) return;

        const context = contextRef.current;
        if (!context) return;

        // Get opacity from the new layerOpacities system
        const opacity = isOnionSkin
          ? (layerOpacities[layerId] ?? 1) * 0.3
          : layerOpacities[layerId] ?? 1;
        context.globalAlpha = opacity;

        drawStrokes(strokes);
      });

      // Only reset globalAlpha if not drawing onion skin
      if (contextRef.current && !isOnionSkin) {
        contextRef.current.globalAlpha = 1;
      }
    },
    [layerVisibility, layerOpacities, layerStrokes, drawStrokes]
  );

  // Update drawFrame to render images from drawingFrames
  const drawFrame = useCallback(() => {
    const context = contextRef.current;
    if (!context) return;
    context.save();
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);

    const frameNumber = selectedFrameNumber ? selectedFrameNumber - 1 : null;

    // 1. Draw white background only for the first frame
    if (frameNumber === 0) {
      context.fillStyle = "white";
      context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    }

    // 2. Draw grid on top of the background
    if (showGrid) {
      context.strokeStyle = "#e0e0e0";
      context.lineWidth = 0.5;
      const gridSize = 20;

      const extendedWidth = context.canvas.width * 2;
      const extendedHeight = context.canvas.height * 2;
      const offsetX = -context.canvas.width / 2;
      const offsetY = -context.canvas.height / 2;

      for (let x = offsetX; x <= extendedWidth; x += gridSize) {
        context.beginPath();
        context.moveTo(x, offsetY);
        context.lineTo(x, extendedHeight);
        context.stroke();
      }
      for (let y = offsetY; y <= extendedHeight; y += gridSize) {
        context.beginPath();
        context.moveTo(offsetX, y);
        context.lineTo(extendedWidth, y);
        context.stroke();
      }
    }

    if (frameNumber === null) {
      context.restore();
      return;
    }

    const drawImage = (imageUrl: string) => {
      if (imageCache.current[imageUrl]) {
        const img = imageCache.current[imageUrl];
        const canvasWidth = context.canvas.width;
        const canvasHeight = context.canvas.height;
        let width = img.width;
        let height = img.height;

        if (width > canvasWidth || height > canvasHeight) {
          const scale = Math.min(canvasWidth / width, canvasHeight / height);
          width *= scale;
          height *= scale;
        }

        const x = (canvasWidth - width) / 2;
        const y = (canvasHeight - height) / 2;
        context.drawImage(img, x, y, width, height);
      } else {
        const img = new Image();
        img.onload = () => {
          imageCache.current[imageUrl] = img;
          drawFrame(); // Redraw once the image is cached
        };
        img.src = imageUrl;
      }
    };

    // 3. Render images for the current frame (underneath strokes)
    drawingFrames
      .filter(
        (df) =>
          df.imageUrl &&
          frameNumber >= df.frameIndex &&
          frameNumber < df.frameIndex + df.length
      )
      .forEach((frame) => drawImage(frame.imageUrl!));

    // 4. Draw onion skin
    if (onionSkin) {
      const prevFrameNumber = frameNumber - 1;
      if (prevFrameNumber >= 0) {
        context.globalAlpha = 0.3;

        // Draw onion-skinned images
        drawingFrames
          .filter(
            (df) =>
              df.imageUrl &&
              prevFrameNumber >= df.frameIndex &&
              prevFrameNumber < df.frameIndex + df.length
          )
          .forEach((frame) => drawImage(frame.imageUrl!));

        // Draw onion-skinned strokes
        const prevFrameFolders = drawingFrames.filter(
          (df) => df.frameIndex === prevFrameNumber
        );
        for (const prevFrame of prevFrameFolders) {
          const prevFolderId = `${prevFrame.rowId}-${prevFrame.frameIndex}`;
          const prevMainLayerId = `${prevFolderId}-main`;
          if (
            layerStrokes[prevMainLayerId] &&
            layerVisibility[prevMainLayerId] !== false
          ) {
            drawStrokes(layerStrokes[prevMainLayerId]);
          }
          (folderLayers[prevFolderId] || []).forEach((_, idx) => {
            const extraLayerId = `${prevFolderId}-extra-${idx}`;
            if (
              layerStrokes[extraLayerId] &&
              layerVisibility[extraLayerId] !== false
            ) {
              drawStrokes(layerStrokes[extraLayerId]);
            }
          });
        }
        context.globalAlpha = 1.0;
      }
    }

    // 5. Draw current frame layers from all rows
    for (const frame of drawingFrames.filter(
      (df) => df.frameIndex === frameNumber
    )) {
      const folderId = `${frame.rowId}-${frame.frameIndex}`;
      const mainLayerId = `${folderId}-main`;
      if (layerVisibility[mainLayerId] !== false && layerStrokes[mainLayerId]) {
        context.globalAlpha = layerOpacities[mainLayerId] ?? 1;
        drawStrokes(layerStrokes[mainLayerId]);
      }
      (folderLayers[folderId] || []).forEach((_, idx) => {
        const extraLayerId = `${folderId}-extra-${idx}`;
        if (
          layerVisibility[extraLayerId] !== false &&
          layerStrokes[extraLayerId]
        ) {
          context.globalAlpha = layerOpacities[extraLayerId] ?? 1;
          drawStrokes(layerStrokes[extraLayerId]);
        }
      });
    }

    // 6. Draw the current stroke on top
    if (currentStroke && selectedLayerId?.includes(`-${frameNumber}`)) {
      context.globalAlpha = 1;
      drawStrokes([currentStroke]);
    }

    // 7. Draw eraser circle if active
    if (eraserCircle && currentTool === "eraser") {
      context.save();
      context.fillStyle = "rgba(128, 128, 128, 0.3)";
      context.beginPath();
      context.arc(eraserCircle.x, eraserCircle.y, eraserSize, 0, 2 * Math.PI);
      context.fill();
      context.restore();
    }

    context.restore();
  }, [
    layerStrokes,
    folderLayers,
    layerVisibility,
    layerOpacities,
    selectedLayerId,
    selectedFrameNumber,
    drawStrokes,
    showGrid,
    currentStroke,
    eraserCircle,
    currentTool,
    eraserSize,
    onionSkin,
    drawingFrames,
  ]);

  // Drawing functions
  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!contextRef.current || !selectedLayerId) return;

      // Handle panning with middle mouse button or spacebar
      if (e.button === 1 || isSpacePressed) {
        setIsPanning(true);
        setPanOffset({ x: e.clientX, y: e.clientY });
        return;
      }

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
        layerId: selectedLayerId,
      };
      setCurrentStroke(newStroke);
    },
    [
      color,
      brushSize,
      currentTool,
      selectedLayerId,
      zoom,
      isSpacePressed,
      eraserSize,
    ]
  );

  useEffect(() => {
    drawFrame();
  }, [selectedFrameNumber, layerVisibility, drawFrame]);

  const handleSidebarSelection = (layerId: string) => {
    setSelectedLayerId(layerId);
    const parts = layerId.split("-");
    if (parts.length >= 3) {
      const frameIndex = parseInt(parts[2], 10);
      if (!isNaN(frameIndex)) {
        setSelectedFrameNumber(frameIndex + 1);
      }
    }
  };

  const handleToggleVisibility = (layerId: string) => {
    setLayerVisibility((prev) => ({
      ...prev,
      [layerId]: prev[layerId] === false ? true : false,
    }));
  };

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !contextRef.current || !currentStroke) return;
      const { x, y } = getCanvasCoords(e);
      setCurrentStroke((prev) =>
        prev ? { ...prev, points: [...prev.points, { x, y }] } : null
      );
      drawFrame();
    },
    [isDrawing, currentStroke, getCanvasCoords, drawFrame]
  );

  const stopDrawing = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (!isDrawing || !currentStroke || !selectedLayerId) return;

    setIsDrawing(false);

    // Add the completed stroke to the permanent layerStrokes state
    setLayerStrokes((prev) => ({
      ...prev,
      [selectedLayerId]: [...(prev[selectedLayerId] || []), currentStroke],
    }));

    setCurrentStroke(null);

    setTimeout(() => saveToUndoStack(), 0);
  }, [isDrawing, isPanning, currentStroke, selectedLayerId]);

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

  // Animation playback
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handlePrevFrame = () => {
    setSelectedFrameNumber((prev) => {
      const current = prev || 1;
      if (current <= 1) return isLooping ? maxFrame : 1;
      return current - 1;
    });
  };

  const handleNextFrame = () => {
    setSelectedFrameNumber((prev) => {
      const current = prev || 1;
      if (current >= maxFrame) return isLooping ? 1 : maxFrame;
      return current + 1;
    });
  };

  const handleFirstFrame = () => {
    setSelectedFrameNumber(1);
  };

  const handleLastFrame = () => {
    setSelectedFrameNumber(maxFrame);
  };

  const handleToggleLoop = () => {
    setIsLooping(!isLooping);
  };

  // Animation playback
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setSelectedFrameNumber((prev) => {
        const currentFrameNumber = prev || 1;

        if (currentFrameNumber >= maxFrame) {
          if (isLooping) {
            return 1; // Loop back to the start
          }
          setIsPlaying(false); // Stop playback
          return maxFrame; // Stay on the last frame
        }
        return currentFrameNumber + 1;
      });
    }, 1000 / (sceneSettings?.frameRate ?? 12));

    return () => clearInterval(interval);
  }, [isPlaying, maxFrame, isLooping, sceneSettings?.frameRate]);

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
    setUndoStack((prev) => {
      // Create a deep copy of the current state
      const currentState = {
        layerStrokes: JSON.parse(JSON.stringify(layerStrokes)),
        folderLayers: JSON.parse(JSON.stringify(folderLayers)),
        drawingFrames: JSON.parse(JSON.stringify(drawingFrames)), // Also save drawingFrames
      };
      return [...prev, currentState];
    });
    setRedoStack([]); // Clear redo stack when new action is performed
  }, [layerStrokes, folderLayers, drawingFrames]);

  // Update handleDrop to create frames and set image URLs
  const handleDrop = useCallback(
    async (rowId: string, frameIndex: number, e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file || !file.type.startsWith("image/")) return;

      const url = URL.createObjectURL(file);

      // Check if a frame already exists at this position
      const existingFrame = drawingFrames.find(
        (df) => df.rowId === rowId && df.frameIndex === frameIndex
      );

      if (existingFrame) {
        // Update existing frame
        setDrawingFrames((prev) =>
          prev.map((df) =>
            df.rowId === rowId && df.frameIndex === frameIndex
              ? { ...df, imageUrl: url, fileName: file.name }
              : df
          )
        );
      } else {
        // Create new frame
        setDrawingFrames((prev) => [
          ...prev,
          {
            rowId,
            frameIndex,
            length: 1,
            imageUrl: url,
            fileName: file.name,
          },
        ]);
      }

      // Select the new frame
      setSelectedLayerId(`${rowId}-${frameIndex}-main`);
      setSelectedFrameNumber(frameIndex + 1);
    },
    [drawingFrames, setDrawingFrames]
  );

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;

    const previousState = undoStack[undoStack.length - 1];
    // Save current state to redo stack
    const currentState = {
      layerStrokes: JSON.parse(JSON.stringify(layerStrokes)),
      folderLayers: JSON.parse(JSON.stringify(folderLayers)),
      drawingFrames: JSON.parse(JSON.stringify(drawingFrames)),
    };

    // Restore previous state
    setLayerStrokes(previousState.layerStrokes);
    setFolderLayers(previousState.folderLayers);
    setDrawingFrames(previousState.drawingFrames);

    // Update stacks
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, currentState]);
  }, [undoStack, layerStrokes, folderLayers, drawingFrames]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;

    const nextState = redoStack[redoStack.length - 1];
    // Save current state to undo stack
    const currentState = {
      layerStrokes: JSON.parse(JSON.stringify(layerStrokes)),
      folderLayers: JSON.parse(JSON.stringify(folderLayers)),
      drawingFrames: JSON.parse(JSON.stringify(drawingFrames)),
    };

    // Restore next state
    setLayerStrokes(nextState.layerStrokes);
    setFolderLayers(nextState.folderLayers);
    setDrawingFrames(nextState.drawingFrames);

    // Update stacks
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, currentState]);
  }, [redoStack, layerStrokes, folderLayers, drawingFrames]);

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
      } else if (e.code === "Space") {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsSpacePressed(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [undo, redo]);

  const currentFrameData = frames.find((f) => f.id === currentFrame);
  const currentLayerData = currentFrameData?.layers.find(
    (l) => l.id === currentLayer
  );

  // Update current layer when selectedLayerId changes (from sidebar)
  useEffect(() => {
    if (selectedLayerId) {
      setCurrentLayer(selectedLayerId);
    }
  }, [selectedLayerId]);

  // Auto-select the first layer on new scene creation
  useEffect(() => {
    // If there's exactly one frame (the default background) and nothing is selected
    if (drawingFrames.length === 1 && !selectedLayerId) {
      const firstFrame = drawingFrames[0];
      const firstLayerId = `${firstFrame.rowId}-${firstFrame.frameIndex}-main`;
      setSelectedLayerId(firstLayerId);
    }
  }, [drawingFrames]); // Run only when drawingFrames array changes

  // Helper to get file name from imageUrl (handles blob/object URLs and real file names)
  function getFileName(url?: string) {
    if (!url) return "";
    try {
      // Try to extract file name from URL or fallback to last segment
      const match = url.match(/([^/]+\.[a-zA-Z0-9]+)(\?|$)/);
      if (match) return match[1];
      return decodeURIComponent(url.split("/").pop() || "");
    } catch {
      return url;
    }
  }

  // Helper to get file name before extension
  function getFileNameBase(url?: string) {
    if (!url) return "";
    try {
      const match = url.match(/([^/]+)\.[a-zA-Z0-9]+(\?|$)/);
      if (match) return match[1];
      return decodeURIComponent(url.split("/").pop() || "").split(".")[0];
    } catch {
      return url;
    }
  }

  // Helper to get file name before extension from a string
  function getFileNameBaseFromString(name?: string) {
    if (!name) return "";
    return name.split(".")[0];
  }

  // Derived sidebar folders from drawingFrames
  const sidebarFolders = drawingFrames.map((df) => {
    const isExtended = df.length > 1;
    return {
      id: `${df.rowId}-${df.frameIndex}`,
      label: isExtended
        ? `Row ${parseInt(df.rowId.split("-")[1])} Frame ${df.frameIndex + 1}:${
            df.frameIndex + df.length
          }`
        : `Row ${parseInt(df.rowId.split("-")[1])} Frame ${df.frameIndex + 1}`,
      imageUrl: df.imageUrl,
      fileName: df.fileName,
      opacity: layerOpacities[`${df.rowId}-${df.frameIndex}`] ?? 1,
      visible: true, // for now
      locked: false, // for now
    };
  });

  const toggleFolder = (id: string) => {
    setOpenFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Handler for opacity change
  const handleOpacityChange = (id: string, value: number) => {
    setLayerOpacities((prev) => ({ ...prev, [id]: value }));
  };

  // Handler for layer rename
  const handleStartRename = (layerId: string, currentName: string) => {
    setEditingLayerName(layerId);
    setEditingLayerValue(currentName);
  };

  const handleSaveRename = (layerId: string) => {
    if (layerId.includes("-extra-")) {
      // Handle extra layer rename
      const [folderId, extraPart] = layerId.split("-extra-");
      const extraIndex = parseInt(extraPart);

      setFolderLayers((prev) => {
        const layers = prev[folderId] || [];
        const newLayers = [...layers];
        newLayers[extraIndex] =
          editingLayerValue || `Untitled.${extraIndex + 2}`;
        return { ...prev, [folderId]: newLayers };
      });
    }
    // Note: Main layer rename would need to update sidebarFolders
    setEditingLayerName(null);
    setEditingLayerValue("");
  };

  const handleCancelRename = () => {
    setEditingLayerName(null);
    setEditingLayerValue("");
  };

  // Helper to get the active frame folder id from selectedLayerId
  function getActiveFrameFolderId(selectedLayerId: string | null) {
    if (!selectedLayerId) return null;
    // e.g. "row1-0-main" or "row1-0-extra-0" => "row1-0"
    const match = selectedLayerId.match(/^(row\d+-\d+)/);
    return match ? match[1] : selectedLayerId;
  }

  // This function will now reorder drawingFrames, not rows.
  function moveFrameFolderUp(folderId: string) {
    setDrawingFrames((prev) => {
      const idx = prev.findIndex(
        (df) => `${df.rowId}-${df.frameIndex}` === folderId
      );
      if (idx > 0) {
        const newFrames = [...prev];
        // Swap the elements
        [newFrames[idx - 1], newFrames[idx]] = [
          newFrames[idx],
          newFrames[idx - 1],
        ];
        return newFrames;
      }
      return prev;
    });
  }

  // This function will also reorder drawingFrames.
  function moveFrameFolderDown(folderId: string) {
    setDrawingFrames((prev) => {
      const idx = prev.findIndex(
        (df) => `${df.rowId}-${df.frameIndex}` === folderId
      );
      if (idx < prev.length - 1 && idx !== -1) {
        const newFrames = [...prev];
        // Swap the elements
        [newFrames[idx], newFrames[idx + 1]] = [
          newFrames[idx + 1],
          newFrames[idx],
        ];
        return newFrames;
      }
      return prev;
    });
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
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
          <div className="flex items-center gap-4">
            {/* Undo/Redo Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-gray-400 bg-transparent border-gray-600"
                onClick={undo}
                disabled={undoStack.length === 0}
                title="Undo"
              >
                <Undo className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-gray-400 bg-transparent border-gray-600"
                onClick={redo}
                disabled={redoStack.length === 0}
                title="Redo"
              >
                <Redo className="w-4 h-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <Label className="text-sm text-gray-300">Zoom:</Label>
              <Button
                variant="outline"
                size="sm"
                className="text-gray-400 bg-transparent border-gray-600"
                onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.1))}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-300 min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                className="text-gray-400 bg-transparent border-gray-600"
                onClick={() => setZoom((prev) => Math.min(3, prev + 0.1))}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-gray-400 bg-transparent border-gray-600"
                onClick={() => setZoom(1)}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

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

      <div className="flex flex-1 min-h-0 relative">
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
              variant={onionSkin ? "default" : "ghost"}
              size="sm"
              className="w-12 h-12 p-0"
              onClick={() => {
                console.log("Onion skin toggled:", !onionSkin);
                setOnionSkin(!onionSkin);
                drawFrame(); // Force redraw when toggling onion skin
              }}
              title="Onion Skin"
            >
              {onionSkin ? (
                <Eye className="w-5 h-5" />
              ) : (
                <EyeOff className="w-s h-5" />
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
              isHoveringToolbar && currentTool !== "move" ? "w-64" : "w-0"
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
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Canvas Area - now scrollable with fixed timeline space */}
          <div
            className="flex-1 bg-gray-900 flex items-center justify-center p-4 min-h-0 overflow-auto"
            style={{ paddingBottom: "280px" }}
          >
            <Card
              className="bg-white"
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
                transition: isPanning ? "none" : "transform 0.1s ease-out",
              }}
            >
              <CardContent className="p-0">
                <canvas
                  ref={canvasRef}
                  className="border border-gray-300 cursor-crosshair"
                  style={{ imageRendering: "pixelated" }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={() => {
                    stopDrawing();
                    setEraserCircle(null);
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  onWheel={(e) => {
                    // Handle trackpad two-finger panning
                    const now = Date.now();
                    if (now - lastWheelTime < 16) return; // Throttle to ~60fps
                    setLastWheelTime(now);

                    // Check if this is a trackpad gesture (deltaMode === 0 and small deltas)
                    if (
                      e.deltaMode === 0 &&
                      Math.abs(e.deltaX) < 50 &&
                      Math.abs(e.deltaY) < 50
                    ) {
                      e.preventDefault();
                      setPanOffset((prev) => ({
                        x: prev.x - e.deltaX,
                        y: prev.y - e.deltaY,
                      }));
                    }
                  }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Timeline - Fixed at bottom of viewport */}
          <div className="fixed bottom-0 left-20 right-80 z-20 bg-gray-800 border-t border-gray-700">
            <TimelineGrid
              rows={rows}
              setRows={setRows}
              frames={frameCount}
              setFrames={setFrameCount}
              drawingFrames={drawingFrames}
              setDrawingFrames={setDrawingFrames}
              selectedRow={selectedRow}
              setSelectedRow={setSelectedRow}
              selectedLayerId={selectedLayerId}
              setSelectedLayerId={setSelectedLayerId}
              selectedFrameNumber={selectedFrameNumber}
              setSelectedFrameNumber={setSelectedFrameNumber}
              onDrop={handleDrop}
              isPlaying={isPlaying}
              onPlayPause={handlePlayPause}
              onPrevFrame={handlePrevFrame}
              onNextFrame={handleNextFrame}
              onFirstFrame={handleFirstFrame}
              onLastFrame={handleLastFrame}
              isLooping={isLooping}
              onToggleLoop={handleToggleLoop}
            />
          </div>
        </div>

        {/* Right Sidebar (Layer Panel) */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 p-4">
          {/* Top row: Add/Delete Layer buttons and Opacity slider */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  selectedLayerId && handleAddLayer(selectedLayerId)
                }
                className="w-8 h-8 p-0"
              >
                +
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (selectedLayerId) {
                    // Delete the strokes for the layer
                    setLayerStrokes((prev) => {
                      const newStrokes = { ...prev };
                      delete newStrokes[selectedLayerId];
                      return newStrokes;
                    });

                    // If it's an extra layer, also remove it from folderLayers
                    if (selectedLayerId.includes("-extra-")) {
                      const [folderId, extraPart] =
                        selectedLayerId.split("-extra-");
                      const extraIndex = parseInt(extraPart);
                      setFolderLayers((prev) => {
                        const layers = prev[folderId] || [];
                        const newLayers = layers.filter(
                          (_, index) => index !== extraIndex
                        );
                        return { ...prev, [folderId]: newLayers };
                      });
                      setSelectedLayerId(null);
                    }
                    saveToUndoStack();
                  }
                }}
                className="w-8 h-8 p-0 text-red-400 hover:text-red-300"
                disabled={!selectedLayerId}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-col items-end flex-1 ml-2">
              <Slider
                value={[
                  (selectedLayerId ? layerOpacities[selectedLayerId] ?? 1 : 1) *
                    100,
                ]}
                onValueChange={([v]) =>
                  selectedLayerId &&
                  handleOpacityChange(selectedLayerId, v / 100)
                }
                min={0}
                max={100}
                step={1}
                className="w-32"
              />
              <span className="text-xs text-gray-400 mt-1">
                Opacity:{" "}
                {Math.round(
                  (selectedLayerId ? layerOpacities[selectedLayerId] ?? 1 : 1) *
                    100
                )}
                %
              </span>
            </div>
          </div>
          {/* Thin Separator */}
          <div className="border-b border-gray-600 mb-4" />
          {/* Tools Section */}
          <div className="space-y-2">
            {sidebarFolders.map((folder) => (
              <div key={folder.id} className="bg-gray-700 rounded shadow">
                {/* Folder Header */}
                <div
                  className={`flex items-center p-2 border-b border-gray-600 rounded-t ${
                    selectedLayerId === folder.id
                      ? "bg-blue-600 text-white"
                      : ""
                  }`}
                >
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFolder(folder.id);
                    }}
                  >
                    {openFolders[folder.id] ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                  <div
                    className="flex items-center gap-2 cursor-pointer ml-2"
                    onClick={() => handleSidebarSelection(folder.id)}
                  >
                    <Folder className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-xs">{folder.label}</span>
                  </div>
                  {/* Up/Down arrows for reordering */}
                  <div className="flex items-center gap-1 ml-auto">
                    {sidebarFolders.length > 1 && (
                      <>
                        {sidebarFolders.findIndex((f) => f.id === folder.id) >
                          0 && (
                          <button
                            className="text-gray-400 hover:text-white px-1"
                            title="Move Up"
                            onClick={() => moveFrameFolderUp(folder.id)}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                        )}
                        {sidebarFolders.findIndex((f) => f.id === folder.id) <
                          sidebarFolders.length - 1 && (
                          <button
                            className="text-gray-400 hover:text-white px-1"
                            title="Move Down"
                            onClick={() => moveFrameFolderDown(folder.id)}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {/* Folder Content (Layer) */}
                {openFolders[folder.id] && (
                  <div className="pl-2 py-2 flex flex-col gap-1 rounded-b">
                    {/* Render image or drawing layer */}
                    <div
                      className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer ${
                        selectedLayerId === `${folder.id}-main`
                          ? "bg-blue-600"
                          : "bg-gray-600 hover:bg-gray-500"
                      }`}
                      onClick={() =>
                        handleSidebarSelection(`${folder.id}-main`)
                      }
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <Eye
                          className={`w-4 h-4 ${
                            layerVisibility[`${folder.id}-main`] !== false
                              ? "text-white"
                              : "text-gray-500"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleVisibility(`${folder.id}-main`);
                          }}
                        />
                        {editingLayerName === `${folder.id}-main` ? (
                          <input
                            value={editingLayerValue}
                            onChange={(e) =>
                              setEditingLayerValue(e.target.value)
                            }
                            onBlur={() => handleSaveRename(`${folder.id}-main`)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handleSaveRename(`${folder.id}-main`);
                              if (e.key === "Escape") handleCancelRename();
                            }}
                            className="text-sm bg-gray-800 text-white px-2 py-1 rounded border border-gray-600 flex-1"
                            autoFocus
                          />
                        ) : (
                          <span className="text-sm text-white flex-1">
                            {folder.fileName
                              ? getFileNameBaseFromString(folder.fileName)
                              : "Untitled.1"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Edit3
                          className="w-3 h-3 text-gray-400 hover:text-white cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            const currentName = folder.fileName
                              ? getFileNameBaseFromString(folder.fileName)
                              : "Untitled.1";
                            handleStartRename(`${folder.id}-main`, currentName);
                          }}
                        />
                        <div className="text-xs text-gray-300">
                          {Math.round(
                            (layerOpacities[`${folder.id}-main`] ?? 1) * 100
                          )}
                          %
                        </div>
                      </div>
                    </div>
                    {/* Render additional layers if any */}
                    {(folderLayers[folder.id] || []).map((layerName, idx) => (
                      <div
                        key={layerName}
                        className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer ${
                          selectedLayerId === `${folder.id}-extra-${idx}`
                            ? "bg-blue-600"
                            : "bg-gray-600 hover:bg-gray-500"
                        }`}
                        onClick={() =>
                          handleSidebarSelection(`${folder.id}-extra-${idx}`)
                        }
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <Eye
                            className={`w-4 h-4 ${
                              layerVisibility[`${folder.id}-extra-${idx}`] !==
                              false
                                ? "text-white"
                                : "text-gray-500"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleVisibility(
                                `${folder.id}-extra-${idx}`
                              );
                            }}
                          />
                          {editingLayerName === `${folder.id}-extra-${idx}` ? (
                            <input
                              value={editingLayerValue}
                              onChange={(e) =>
                                setEditingLayerValue(e.target.value)
                              }
                              onBlur={() =>
                                handleSaveRename(`${folder.id}-extra-${idx}`)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleSaveRename(`${folder.id}-extra-${idx}`);
                                if (e.key === "Escape") handleCancelRename();
                              }}
                              className="text-sm bg-gray-800 text-white px-2 py-1 rounded border border-gray-600 flex-1"
                              autoFocus
                            />
                          ) : (
                            <span className="text-sm text-white flex-1">
                              {layerName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Edit3
                            className="w-3 h-3 text-gray-400 hover:text-white cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartRename(
                                `${folder.id}-extra-${idx}`,
                                layerName
                              );
                            }}
                          />
                          <div className="text-xs text-gray-300">
                            {Math.round(
                              (layerOpacities[`${folder.id}-extra-${idx}`] ??
                                1) * 100
                            )}
                            %
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
