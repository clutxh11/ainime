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
import { supabase } from "@/lib/supabase";

type EditorMode = "animate" | "storyboard" | "composite";

interface AnimationEditorProps {
  onViewChange: (view: CurrentView) => void;
  sceneSettings?: {
    sceneName: string;
    canvasWidth: number;
    canvasHeight: number;
    frameRate: number;
    projectId?: string;
    chapterId?: string;
    sequenceId?: string;
    shotId?: string;
    storyboardId?: string;
  };
  mode?: EditorMode; // defaults to 'animate'
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

// Helper to get the active frame folder id from selectedLayerId
function getActiveFrameFolderId(selectedLayerId: string | null) {
  if (!selectedLayerId) return null;
  // e.g. "row1-0-main" or "row1-0-extra-0" => "row1-0"
  const match = selectedLayerId.match(/^(row-\d+-\d+)/);
  return match ? match[1] : null; // Return null if no match
}

// Helper to get file name from imageUrl
function getFileName(url?: string) {
  if (!url) return "";
  try {
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

const getLassoBoundingBox = (points: Point[]) => {
  if (points.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }
  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  return { minX, maxX, minY, maxY };
};

export function AnimationEditor({
  onViewChange,
  sceneSettings,
  mode = "animate",
}: AnimationEditorProps & { mode?: EditorMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<
    "pencil" | "eraser" | "brush" | "move" | "palette"
  >("pencil");
  const [brushSize, setBrushSize] = useState(5);
  const [color, setColor] = useState("#000000");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(1);
  const [currentLayer, setCurrentLayer] = useState<string>("");
  const [onionSkin, setOnionSkin] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // Applied settings that drive the canvas and playback
  const [appliedWidth, setAppliedWidth] = useState<number>(
    sceneSettings?.canvasWidth ?? 1920
  );
  const [appliedHeight, setAppliedHeight] = useState<number>(
    sceneSettings?.canvasHeight ?? 1080
  );
  const [appliedFps, setAppliedFps] = useState<number>(
    sceneSettings?.frameRate ?? 24
  );
  // Draft values used inside the settings modal only
  const [draftWidth, setDraftWidth] = useState<number>(appliedWidth);
  const [draftHeight, setDraftHeight] = useState<number>(appliedHeight);
  const [draftFps, setDraftFps] = useState<number>(appliedFps);
  const [isSaving, setIsSaving] = useState(false);
  // Sync applied + draft settings whenever a new shot/scene is opened
  useEffect(() => {
    if (sceneSettings) {
      setAppliedWidth(sceneSettings.canvasWidth);
      setAppliedHeight(sceneSettings.canvasHeight);
      setAppliedFps(sceneSettings.frameRate);
      setDraftWidth(sceneSettings.canvasWidth);
      setDraftHeight(sceneSettings.canvasHeight);
      setDraftFps(sceneSettings.frameRate);
    }
  }, [
    sceneSettings?.sceneName,
    sceneSettings?.canvasWidth,
    sceneSettings?.canvasHeight,
    sceneSettings?.frameRate,
  ]);

  // Note: save/load helpers are defined later, after timeline state declarations
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
  const [layerOrder, setLayerOrder] = useState<Record<string, string[]>>({});
  const imageCache = useRef<Record<string, HTMLImageElement>>({});
  const [isLooping, setIsLooping] = useState(false);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
  });
  const [clipboard, setClipboard] = useState<DrawingStroke[] | null>(null);
  const [pastePreview, setPastePreview] = useState<DrawingStroke[] | null>(
    null
  );
  const mousePosRef = useRef({ x: 0, y: 0 });
  const longPressTimer = useRef<NodeJS.Timeout>();
  const [isReadyToDrag, setIsReadyToDrag] = useState(false);
  const mouseDownPos = useRef({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [isDraggingResizeBox, setIsDraggingResizeBox] = useState(false);
  const [resizeBox, setResizeBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    strokes: DrawingStroke[];
    originalStrokes: DrawingStroke[]; // To revert on cancel
    initialX: number;
    initialY: number;
    initialWidth: number;
    initialHeight: number;
  } | null>(null);
  const lastErasePointRef = useRef<Point | null>(null);

  // Custom color sets state
  const [customColorSets, setCustomColorSets] = useState<{
    [key: string]: string[];
  }>({});
  const [newSetName, setNewSetName] = useState("");
  const [isCreatingSet, setIsCreatingSet] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

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
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);
  // Map of timeline cell → storage key for the image placed there (rowId|frameIndex → key)
  const [frameAssetKeys, setFrameAssetKeys] = useState<Record<string, string>>(
    {}
  );
  // Custom folder display names (e.g., Page 1) keyed by folderId "row-1-0"
  const [folderNames, setFolderNames] = useState<Record<string, string>>({});
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderValue, setEditingFolderValue] = useState<string>("");

  // -------- Folder CRUD (for storyboard mode or when timeline hidden) --------
  // Moved below to ensure saveToUndoStack is declared first

  // -------- Persistence helpers (now that timeline state exists) --------
  const serializeDocument = useCallback(() => {
    return {
      version: 1,
      sceneSettings: {
        sceneName: sceneSettings?.sceneName ?? "Scene",
        width: appliedWidth,
        height: appliedHeight,
        fps: appliedFps,
        units: "px",
      },
      rows,
      frameCount,
      timeline: { drawingFrames, layerOrder },
      layers: { folderLayers, layerStrokes },
      uiState: { currentFrame, selectedRow, zoom, onionSkin, showGrid },
      // Persist per-frame asset keys so we can re-sign URLs on load
      frameAssetKeys,
      // Storyboard: persist custom page names
      folderNames,
    } as const;
  }, [
    sceneSettings?.sceneName,
    appliedWidth,
    appliedHeight,
    appliedFps,
    rows,
    frameCount,
    drawingFrames,
    layerOrder,
    folderLayers,
    layerStrokes,
    currentFrame,
    selectedRow,
    zoom,
    onionSkin,
    showGrid,
    frameAssetKeys,
    folderNames,
  ]);

  const saveScene = useCallback(async () => {
    const isStoryboard = mode === "storyboard";
    const targetId = isStoryboard
      ? sceneSettings?.storyboardId
      : sceneSettings?.shotId;
    if (!targetId) return;
    try {
      setIsSaving(true);
      // Read existing data to merge manifest/history
      const { data: row, error: readErr } = await supabase
        .from(isStoryboard ? "storyboards" : "shots")
        .select("data")
        .eq("id", targetId)
        .maybeSingle();
      if (readErr) console.error("Failed to read shot row:", readErr);
      const baseData = (row?.data as any) || {};

      // 1) Serialize current document
      const doc = serializeDocument();

      // 2) Upload versioned JSON into Storage
      const bucket = "animation-scenes"; // Ensure this bucket exists and allows authenticated uploads
      const enableStorage =
        process.env.NEXT_PUBLIC_ENABLE_SCENE_STORAGE === "true";
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const pId = sceneSettings?.projectId || "unknown-project";
      const cId = sceneSettings?.chapterId || "unknown-chapter";
      const sId = sceneSettings?.sequenceId || "unknown-seq";
      const key = `${pId}/${cId}/${sId}/${
        isStoryboard ? `storyboard-${targetId}` : `shot-${targetId}`
      }/scene/scene-${ts}.json`;

      let uploadOk = false;
      if (enableStorage) {
        try {
          const blob = new Blob([JSON.stringify(doc)], {
            type: "application/json",
          });
          const { error: upErr } = await supabase.storage
            .from(bucket)
            .upload(key, blob, { upsert: true });
          if (upErr) {
            console.error(
              "Storage upload failed, will still update DB row:",
              upErr
            );
          } else {
            uploadOk = true;
          }
        } catch (e) {
          console.error("Unexpected Storage upload error:", e);
        }
      }

      // 3) Merge DB row data with latest settings and manifest
      const prevManifest: any[] = Array.isArray(baseData?.manifest)
        ? baseData.manifest
        : [];
      const nextManifest = uploadOk
        ? [
            ...prevManifest,
            {
              key,
              saved_at: new Date().toISOString(),
              width: appliedWidth,
              height: appliedHeight,
              fps: appliedFps,
              version: 1,
            },
          ]
        : prevManifest;

      const merged = {
        ...baseData,
        initialized: true,
        width: appliedWidth,
        height: appliedHeight,
        units: "px",
        fps: appliedFps,
        // Keep latest inline for backward-compatibility, but prefer Storage version
        document: doc,
        latest_key: uploadOk ? key : baseData?.latest_key,
        manifest: nextManifest,
      } as any;

      const { error } = await supabase
        .from(isStoryboard ? "storyboards" : "shots")
        .update({ data: merged })
        .eq("id", targetId);
      if (error) console.error("Failed to save scene:", error);
    } finally {
      setIsSaving(false);
    }
  }, [
    mode,
    sceneSettings?.shotId,
    sceneSettings?.storyboardId,
    sceneSettings?.projectId,
    sceneSettings?.chapterId,
    sceneSettings?.sequenceId,
    appliedWidth,
    appliedHeight,
    appliedFps,
    serializeDocument,
  ]);

  useEffect(() => {
    const load = async () => {
      const isStoryboard = mode === "storyboard";
      const targetId = isStoryboard
        ? sceneSettings?.storyboardId
        : sceneSettings?.shotId;
      if (!targetId) return;
      const { data: row, error } = await supabase
        .from(isStoryboard ? "storyboards" : "shots")
        .select("data")
        .eq("id", targetId)
        .maybeSingle();
      if (error) return;
      const data: any = row?.data || {};
      if (typeof data.width === "number") setAppliedWidth(data.width);
      if (typeof data.height === "number") setAppliedHeight(data.height);
      if (typeof data.fps === "number") setAppliedFps(data.fps);

      // Prefer storage-saved latest version; fallback to inline document
      let doc: any = null;
      const latestKey: string | undefined = data?.latest_key;
      const enableStorage =
        process.env.NEXT_PUBLIC_ENABLE_SCENE_STORAGE === "true";
      if (enableStorage && latestKey) {
        try {
          const { data: file, error: dlErr } = await supabase.storage
            .from("animation-scenes")
            .download(latestKey);
          if (!dlErr && file) {
            const text = await file.text();
            doc = JSON.parse(text);
          }
        } catch (e) {
          console.warn(
            "Failed to download latest scene version; will fallback to inline document",
            e
          );
        }
      }
      if (!doc) {
        doc = data.document;
      }
      if (!doc) return;

      try {
        if (Array.isArray(doc.rows)) setRows(doc.rows);
        if (typeof doc.frameCount === "number") setFrameCount(doc.frameCount);
        if (doc.timeline?.drawingFrames)
          setDrawingFrames(doc.timeline.drawingFrames);
        if (doc.timeline?.layerOrder) setLayerOrder(doc.timeline.layerOrder);
        if (doc.layers?.folderLayers) setFolderLayers(doc.layers.folderLayers);
        if (doc.layers?.layerStrokes) setLayerStrokes(doc.layers.layerStrokes);
        if (doc.uiState?.currentFrame)
          setCurrentFrame(doc.uiState.currentFrame);
        if (doc.uiState?.selectedRow) setSelectedRow(doc.uiState.selectedRow);
        if (typeof doc.uiState?.zoom === "number") setZoom(doc.uiState.zoom);
        if (typeof doc.uiState?.onionSkin === "boolean")
          setOnionSkin(doc.uiState.onionSkin);
        if (typeof doc.uiState?.showGrid === "boolean")
          setShowGrid(doc.uiState.showGrid);
        if (doc.folderNames && typeof doc.folderNames === "object") {
          setFolderNames(doc.folderNames);
        }
        if (doc.frameAssetKeys && typeof doc.frameAssetKeys === "object") {
          setFrameAssetKeys(doc.frameAssetKeys);
          // If storage enabled, re-sign URLs for any drawingFrames that have a stored key
          const enableStorage =
            process.env.NEXT_PUBLIC_ENABLE_SCENE_STORAGE === "true";
          if (enableStorage) {
            const bucket = "animation-scenes";
            const entries: Array<[string, string]> = Object.entries(
              doc.frameAssetKeys
            );
            if (entries.length > 0) {
              try {
                const urlMap: Record<string, string> = {};
                // Sign each key
                for (const [cell, k] of entries) {
                  const { data: signed } = await supabase.storage
                    .from(bucket)
                    .createSignedUrl(k, 60 * 60 * 24);
                  if (signed?.signedUrl) urlMap[cell] = signed.signedUrl;
                }
                // Apply signed URLs into drawingFrames
                setDrawingFrames((prev) =>
                  prev.map((df) => {
                    const cellKey = `${df.rowId}|${df.frameIndex}`;
                    if (urlMap[cellKey]) {
                      return { ...df, imageUrl: urlMap[cellKey] };
                    }
                    return df;
                  })
                );
              } catch (e) {
                console.warn("Failed to re-sign frame asset URLs", e);
              }
            }
          }
        }
      } catch (e) {
        console.warn("Failed to hydrate document", e);
      }
    };
    load();
  }, [mode, sceneSettings?.shotId, sceneSettings?.storyboardId]);

  // Set initial current layer

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Actual canvas resolution (for quality)
    const canvasWidth = appliedWidth ?? 800;
    const canvasHeight = appliedHeight ?? 600;
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
  }, [zoom, appliedWidth, appliedHeight]);

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

    // 1. Draw white background if specified
    if (frameNumber !== null) {
      const frame = drawingFrames.find((df) => df.frameIndex === 0);
      if (frame) {
        // Only for the background frame
        context.fillStyle = "white";
        context.fillRect(0, 0, context.canvas.width, context.canvas.height);
      }
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

    // 3. Render images for onion skin (underneath strokes)
    if (onionSkin) {
      const prevFrameNumber = frameNumber - 1;
      if (prevFrameNumber >= 0) {
        context.globalAlpha = 0.3;
        drawingFrames
          .filter(
            (df) =>
              df.imageUrl &&
              prevFrameNumber >= df.frameIndex &&
              prevFrameNumber < df.frameIndex + df.length
          )
          .forEach((frame) => drawImage(frame.imageUrl!));
        context.globalAlpha = 1.0;
      }
    }

    // 4. Draw onion-skinned strokes
    if (onionSkin) {
      const prevFrameNumber = frameNumber - 1;
      if (prevFrameNumber >= 0) {
        context.globalAlpha = 0.3;
        const prevFrameFolders = drawingFrames.filter(
          (df) => df.frameIndex === prevFrameNumber
        );
        for (const prevFrame of prevFrameFolders) {
          const prevFolderId = `${prevFrame.rowId}-${prevFrame.frameIndex}`;
          const orderedLayers = layerOrder[prevFolderId] || [];
          for (const layerId of orderedLayers) {
            if (layerStrokes[layerId] && layerVisibility[layerId] !== false) {
              drawStrokes(layerStrokes[layerId]);
            }
          }
        }
        context.globalAlpha = 1.0;
      }
    }

    // 5. Draw current frame layers from all rows in the correct order
    for (const frame of drawingFrames.filter(
      (df) => df.frameIndex === frameNumber
    )) {
      const folderId = `${frame.rowId}-${frame.frameIndex}`;
      const orderedLayers = layerOrder[folderId] || [];

      for (const layerId of orderedLayers) {
        if (layerVisibility[layerId] === false) continue;

        context.globalAlpha = layerOpacities[layerId] ?? 1;

        // If it's the main layer and has an image, draw it
        if (layerId.endsWith("-main") && frame.imageUrl) {
          drawImage(frame.imageUrl);
        }

        // Draw strokes for the layer
        if (layerStrokes[layerId]) {
          drawStrokes(layerStrokes[layerId]);
        }
      }
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

    // 8. Draw lasso selection if active
    if (lassoSelection && lassoSelection.points.length > 0) {
      context.save();
      context.strokeStyle = "rgba(0, 150, 255, 0.8)";
      context.lineWidth = 1;
      context.setLineDash([4, 4]);
      context.beginPath();
      context.moveTo(lassoSelection.points[0].x, lassoSelection.points[0].y);
      for (let i = 1; i < lassoSelection.points.length; i++) {
        context.lineTo(lassoSelection.points[i].x, lassoSelection.points[i].y);
      }
      if (lassoSelection.isActive) {
        context.closePath();
      }
      context.stroke();
      context.restore();
    }

    // Draw paste preview
    if (pastePreview) {
      const { x: cursorX, y: cursorY } = mousePosRef.current;
      const boundingBox = getStrokesBoundingBox(pastePreview);
      const offsetX = cursorX - boundingBox.minX;
      const offsetY = cursorY - boundingBox.minY;

      pastePreview.forEach((stroke) => {
        context.globalAlpha = 0.5; // Make preview semi-transparent
        context.strokeStyle = stroke.color;
        context.lineWidth = stroke.brushSize * zoom;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.beginPath();
        stroke.points.forEach((point, index) => {
          const newX = (point.x + offsetX - panOffset.x) * zoom;
          const newY = (point.y + offsetY - panOffset.y) * zoom;
          if (index === 0) {
            context.moveTo(newX, newY);
          } else {
            context.lineTo(newX, newY);
          }
        });
        context.stroke();
      });
      context.globalAlpha = 1; // Reset alpha
    }

    // Draw resize box if active
    if (isResizing && resizeBox) {
      context.save();
      context.strokeStyle = "#007bff";
      context.lineWidth = 1;
      context.setLineDash([6, 3]);

      const { x, y, width, height } = resizeBox;
      const screenX = (x - panOffset.x) * zoom;
      const screenY = (y - panOffset.y) * zoom;
      const screenWidth = width * zoom;
      const screenHeight = height * zoom;

      // Draw box
      context.strokeRect(screenX, screenY, screenWidth, screenHeight);

      // Draw handles
      const handles = getResizeHandles(resizeBox);
      context.fillStyle = "#007bff";
      Object.values(handles).forEach((handle) => {
        const handleScreenX = (handle.x - panOffset.x) * zoom;
        const handleScreenY = (handle.y - panOffset.y) * zoom;
        context.fillRect(
          handleScreenX,
          handleScreenY,
          handle.size,
          handle.size
        );
      });

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
    layerOrder,
    lassoSelection,
    zoom,
    panOffset,
    pastePreview,
    isResizing,
    resizeBox,
  ]);

  // Drawing functions
  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!contextRef.current || !selectedLayerId) return;
      const coords = getCanvasCoords(e);
      const { x, y } = coords;

      if (isResizing && resizeBox) {
        // Check for handle clicks
        const handles = getResizeHandles(resizeBox);
        for (const [handleName, handle] of Object.entries(handles)) {
          const handleScreenX = (handle.x - panOffset.x) * zoom;
          const handleScreenY = (handle.y - panOffset.y) * zoom;
          if (
            x >= handleScreenX &&
            x <= handleScreenX + handle.size &&
            y >= handleScreenY &&
            y <= handleScreenY + handle.size
          ) {
            setActiveHandle(handleName);
            return;
          }
        }

        // Check for clicking inside box to drag
        const { x: boxX, y: boxY, width, height } = resizeBox;
        if (x >= boxX && x <= boxX + width && y >= boxY && y <= boxY + height) {
          setIsDraggingResizeBox(true);
          setDragOffset({ x: x - boxX, y: y - boxY });
          return;
        }

        // Clicking outside cancels resize
        setIsResizing(false);
        setResizeBox(null);
        setActiveHandle(null);
        setIsDraggingResizeBox(false);
        return;
      }

      // Handle panning with middle mouse button or spacebar
      if (e.button === 1 || isSpacePressed) {
        setIsPanning(true);
        setPanOffset({ x: e.clientX, y: e.clientY });
        return;
      }

      if (currentTool === "move") {
        // Check if clicking inside existing lasso selection
        if (lassoSelection && lassoSelection.isActive) {
          if (isPointInPolygon({ x, y }, lassoSelection.points)) {
            // Clicking inside lasso - start moving selected strokes
            setIsDragging(true);
            setDragOffset({ x, y });
            setOriginalLassoPoints([...lassoSelection.points]);

            const originalPositions: {
              [strokeId: string]: { points: Point[] };
            } = {};
            if (selectedLayerId) {
              const allStrokesOnLayer = layerStrokes[selectedLayerId] || [];
              lassoSelection.selectedStrokeIds.forEach((strokeId) => {
                const stroke = allStrokesOnLayer.find((s) => s.id === strokeId);
                if (stroke) {
                  originalPositions[strokeId] = {
                    points: JSON.parse(JSON.stringify(stroke.points)),
                  };
                }
              });
            }
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
        const coords = getCanvasCoords(e);
        lastErasePointRef.current = coords;
        // Trigger erase on initial click
        draw(e);
        return;
      }

      contextRef.current.beginPath();
      contextRef.current.moveTo(x, y);

      const newStroke: DrawingStroke = {
        id: generateStrokeId(),
        points: [{ x, y }],
        color,
        brushSize:
          (currentTool as string) === "eraser" ? eraserSize : brushSize,
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
      lassoSelection,
      layerStrokes,
      isResizing,
      resizeBox,
      panOffset,
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
      const coords = getCanvasCoords(e);
      const { x: currentX, y: currentY } = coords;

      if (isResizing && isDraggingResizeBox && resizeBox) {
        const newX = currentX - dragOffset.x;
        const newY = currentY - dragOffset.y;

        const deltaX = newX - resizeBox.x;
        const deltaY = newY - resizeBox.y;

        const movedStrokes = resizeBox.strokes.map((stroke) => ({
          ...stroke,
          points: stroke.points.map((p) => ({
            x: p.x + deltaX,
            y: p.y + deltaY,
          })),
        }));

        setResizeBox({
          ...resizeBox,
          x: newX,
          y: newY,
          strokes: movedStrokes,
        });

        if (selectedLayerId) {
          setLayerStrokes((prev) => {
            const otherStrokes =
              prev[selectedLayerId]?.filter(
                (s) => !movedStrokes.some((ms) => ms.id === s.id)
              ) || [];
            return {
              ...prev,
              [selectedLayerId]: [...otherStrokes, ...movedStrokes],
            };
          });
        }
        drawFrame();
        return;
      }

      if (isResizing && activeHandle && resizeBox) {
        // Use the stable initial dimensions for scaling calculations
        const {
          initialX,
          initialY,
          initialWidth,
          initialHeight,
          originalStrokes,
        } = resizeBox;

        let newWidth = initialWidth;
        let newHeight = initialHeight;
        let newX = initialX;
        let newY = initialY;

        switch (activeHandle) {
          case "topLeft":
            newWidth = initialX + initialWidth - currentX;
            newHeight = initialY + initialHeight - currentY;
            newX = currentX;
            newY = currentY;
            break;
          case "topRight":
            newWidth = currentX - initialX;
            newHeight = initialY + initialHeight - currentY;
            newY = currentY;
            break;
          case "bottomLeft":
            newWidth = initialX + initialWidth - currentX;
            newHeight = currentY - initialY;
            newX = currentX;
            break;
          case "bottomRight":
            newWidth = currentX - initialX;
            newHeight = currentY - initialY;
            break;
        }

        // Enforce minimum size
        if (newWidth < 10) {
          newWidth = 10;
          if (activeHandle.includes("Left")) {
            newX = initialX + initialWidth - 10;
          }
        }
        if (newHeight < 10) {
          newHeight = 10;
          if (activeHandle.includes("top")) {
            newY = initialY + initialHeight - 10;
          }
        }

        // Calculate scale factors based on the stable INITIAL dimensions
        const scaleX = initialWidth === 0 ? 1 : newWidth / initialWidth;
        const scaleY = initialHeight === 0 ? 1 : newHeight / initialHeight;

        // Transform strokes based on their relation to the initial box
        const transformedStrokes = originalStrokes.map((stroke) => {
          const newPoints = stroke.points.map((p) => {
            const relativeX = p.x - initialX;
            const relativeY = p.y - initialY;
            return {
              x: newX + relativeX * scaleX,
              y: newY + relativeY * scaleY,
            };
          });
          return { ...stroke, points: newPoints };
        });

        setResizeBox({
          ...resizeBox,
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
          strokes: transformedStrokes,
        });

        if (selectedLayerId) {
          setLayerStrokes((prev) => {
            const otherStrokes =
              prev[selectedLayerId]?.filter(
                (s) => !transformedStrokes.some((ts) => ts.id === s.id)
              ) || [];
            return {
              ...prev,
              [selectedLayerId]: [...otherStrokes, ...transformedStrokes],
            };
          });
        }
        drawFrame();
        return;
      }

      if (isDragging && currentTool === "move" && lassoSelection) {
        const deltaX = currentX - dragOffset.x;
        const deltaY = currentY - dragOffset.y;

        const newLassoPoints = originalLassoPoints.map((p) => ({
          x: p.x + deltaX,
          y: p.y + deltaY,
        }));
        setLassoSelection((prev) =>
          prev ? { ...prev, points: newLassoPoints } : null
        );

        if (selectedLayerId) {
          const allStrokesOnLayer = layerStrokes[selectedLayerId] || [];
          const newStrokesForLayer = allStrokesOnLayer.map((stroke) => {
            if (lassoSelection.selectedStrokeIds.includes(stroke.id)) {
              const originalStroke = originalStrokePositions[stroke.id];
              if (originalStroke) {
                const newPoints = originalStroke.points.map((p) => ({
                  x: p.x + deltaX,
                  y: p.y + deltaY,
                }));
                return { ...stroke, points: newPoints };
              }
            }
            return stroke;
          });

          setLayerStrokes((prev) => ({
            ...prev,
            [selectedLayerId]: newStrokesForLayer,
          }));
        }

        drawFrame();
        return;
      }

      if (isSelecting && currentTool === "move" && lassoSelection) {
        setLassoSelection({
          ...lassoSelection,
          points: [...lassoSelection.points, { x: currentX, y: currentY }],
        });
        drawFrame();
        return;
      }

      // Handle eraser tool
      if (currentTool === "eraser" && isDrawing && selectedLayerId) {
        const lastPoint = lastErasePointRef.current;
        const pointsToErase: Point[] = [coords];

        if (lastPoint) {
          const dist = Math.sqrt(
            Math.pow(currentX - lastPoint.x, 2) +
              Math.pow(currentY - lastPoint.y, 2)
          );
          // Interpolate points for smoother, more consistent erasing
          const step = 2; // Check every 2 pixels
          const numSteps = Math.ceil(dist / step);

          if (numSteps > 1) {
            for (let i = 1; i < numSteps; i++) {
              const t = i / numSteps;
              pointsToErase.push({
                x: lastPoint.x * (1 - t) + currentX * t,
                y: lastPoint.y * (1 - t) + currentY * t,
              });
            }
          }
        }

        let currentLayerStrokes = layerStrokes[selectedLayerId] || [];
        let hasChanged = false;

        pointsToErase.forEach((erasePoint) => {
          if (eraserStyle === "stroke") {
            const initialCount = currentLayerStrokes.length;
            currentLayerStrokes = currentLayerStrokes.filter((stroke) => {
              const isIntersecting = stroke.points.some((point) => {
                const distance = Math.sqrt(
                  Math.pow(point.x - erasePoint.x, 2) +
                    Math.pow(point.y - erasePoint.y, 2)
                );
                return distance <= eraserSize;
              });
              return !isIntersecting;
            });
            if (currentLayerStrokes.length < initialCount) {
              hasChanged = true;
            }
          } else {
            // Precision eraser
            const strokesAfterErasing: DrawingStroke[] = [];
            let layerModifiedInPass = false;

            currentLayerStrokes.forEach((stroke) => {
              const segments: Point[][] = [];
              let currentSegment: Point[] = [];

              for (const point of stroke.points) {
                const distance = Math.sqrt(
                  Math.pow(point.x - erasePoint.x, 2) +
                    Math.pow(point.y - erasePoint.y, 2)
                );

                if (distance <= Math.max(2.5, eraserSize)) {
                  // Point is erased, end the current segment
                  if (currentSegment.length > 1) {
                    segments.push(currentSegment);
                  }
                  currentSegment = [];
                } else {
                  // Point is kept, add to segment
                  currentSegment.push(point);
                }
              }

              // Add the last running segment
              if (currentSegment.length > 1) {
                segments.push(currentSegment);
              }

              // If the stroke was split, replace it with new segments
              if (
                segments.length > 1 ||
                (segments.length === 1 &&
                  segments[0].length < stroke.points.length)
              ) {
                layerModifiedInPass = true;
                segments.forEach((segPoints) => {
                  strokesAfterErasing.push({
                    ...stroke,
                    id: generateStrokeId(),
                    points: segPoints,
                  });
                });
              } else if (
                segments.length === 1 &&
                segments[0].length === stroke.points.length
              ) {
                // Stroke was untouched in this pass
                strokesAfterErasing.push(stroke);
              }
              // If segments is empty, the whole stroke was erased.
            });

            if (layerModifiedInPass) {
              hasChanged = true;
              currentLayerStrokes = strokesAfterErasing;
            }
          }
        });

        if (hasChanged) {
          setLayerStrokes((prev) => ({
            ...prev,
            [selectedLayerId]: currentLayerStrokes,
          }));
        }

        lastErasePointRef.current = coords;
        setEraserCircle(coords);
        drawFrame();
        return;
      }

      if (!isDrawing || !contextRef.current || !currentStroke) return;

      setCurrentStroke((prev) =>
        prev
          ? { ...prev, points: [...prev.points, { x: currentX, y: currentY }] }
          : null
      );
      drawFrame();
    },
    [
      getCanvasCoords,
      isResizing,
      isDraggingResizeBox,
      resizeBox,
      dragOffset,
      selectedLayerId,
      activeHandle,
      isDragging,
      currentTool,
      lassoSelection,
      originalLassoPoints,
      originalStrokePositions,
      layerStrokes,
      isSelecting,
      isDrawing,
      contextRef,
      currentStroke,
      drawFrame,
      eraserStyle,
      eraserSize,
      generateStrokeId,
    ]
  );

  // Undo/Redo functions
  const saveToUndoStack = useCallback(() => {
    setUndoStack((prev) => {
      // Create a deep copy of the current state
      const currentState = {
        layerStrokes: JSON.parse(JSON.stringify(layerStrokes)),
        folderLayers: JSON.parse(JSON.stringify(folderLayers)),
        drawingFrames: JSON.parse(JSON.stringify(drawingFrames)), // Also save drawingFrames
        layerOrder: JSON.parse(JSON.stringify(layerOrder)), // Save layerOrder
      };
      return [...prev, currentState];
    });
    setRedoStack([]); // Clear redo stack when new action is performed
  }, [layerStrokes, folderLayers, drawingFrames, layerOrder]);

  const handleDrop = useCallback(
    (rowId: string, frameIndex: number, e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file || !file.type.startsWith("image/")) return;

      // If storage is enabled, upload image and store its key; otherwise fallback to blob URL
      const enableStorage =
        process.env.NEXT_PUBLIC_ENABLE_SCENE_STORAGE === "true";
      const doUpload = async () => {
        let imageUrl = "";
        let key: string | undefined = undefined;
        if (
          enableStorage &&
          sceneSettings?.projectId &&
          sceneSettings?.chapterId &&
          sceneSettings?.sequenceId &&
          sceneSettings?.shotId
        ) {
          try {
            const bucket = "animation-scenes";
            const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
            const ts = new Date().toISOString().replace(/[:.]/g, "-");
            // Per-shot frame assets
            key = `${sceneSettings.projectId}/${sceneSettings.chapterId}/${sceneSettings.sequenceId}/${sceneSettings.shotId}/assets/frames/${rowId}/${frameIndex}/${ts}-${safeName}`;
            const { error: upErr } = await supabase.storage
              .from(bucket)
              .upload(key, file, { upsert: true, contentType: file.type });
            if (upErr) {
              console.error(
                "Image upload failed; falling back to blob URL",
                upErr
              );
              imageUrl = URL.createObjectURL(file);
            } else {
              const { data: signed } = await supabase.storage
                .from(bucket)
                .createSignedUrl(key, 60 * 60 * 24); // 24h
              imageUrl = signed?.signedUrl || URL.createObjectURL(file);
            }
          } catch (err) {
            console.error(
              "Unexpected image upload error; falling back to blob URL",
              err
            );
            imageUrl = URL.createObjectURL(file);
          }
        } else {
          imageUrl = URL.createObjectURL(file);
        }

        // Save asset key reference for later re-signing
        if (key) {
          setFrameAssetKeys((prev) => ({
            ...prev,
            [`${rowId}|${frameIndex}`]: key!,
          }));
        }

        const url = imageUrl;

        setDrawingFrames((prev) => {
          const existingFrame = prev.find(
            (df) => df.rowId === rowId && df.frameIndex === frameIndex
          );

          if (existingFrame) {
            return prev.map((df) =>
              df.rowId === rowId && df.frameIndex === frameIndex
                ? { ...df, imageUrl: url, fileName: file.name }
                : df
            );
          } else {
            return [
              ...prev,
              {
                rowId,
                frameIndex,
                length: 1,
                imageUrl: url,
                fileName: file.name,
              },
            ];
          }
        });

        // Select the new frame
        setSelectedLayerId(`${rowId}-${frameIndex}-main`);
        setSelectedFrameNumber(frameIndex + 1);

        setTimeout(() => saveToUndoStack(), 0);
      };

      // Run async upload + state update
      void doUpload();
    },
    [saveToUndoStack]
  );

  const stopDrawing = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isDragging) {
      setIsDragging(false);
      setOriginalLassoPoints([]);
      setOriginalStrokePositions({});
      if (lassoSelection) {
        showContextMenuForSelection(lassoSelection);
      }
      saveToUndoStack();
      return;
    }

    if (isSelecting && currentTool === "move" && lassoSelection) {
      setIsSelecting(false);
      if (lassoSelection.points.length < 3) {
        // Not a valid selection area, so clear it
        setLassoSelection(null);
        return;
      }

      const allStrokesOnLayer = layerStrokes[selectedLayerId || ""] || [];
      const selectedStrokeIds = allStrokesOnLayer
        .filter((stroke) =>
          stroke.points.some((point) =>
            isPointInPolygon(point, lassoSelection.points)
          )
        )
        .map((stroke) => stroke.id);

      const finalSelection = {
        ...lassoSelection,
        isActive: true,
        selectedStrokeIds: selectedStrokeIds,
      };
      setLassoSelection(finalSelection);
      showContextMenuForSelection(finalSelection); // Show menu on selection
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
  }, [
    isDrawing,
    isPanning,
    currentStroke,
    selectedLayerId,
    isSelecting,
    currentTool,
    lassoSelection,
    layerStrokes,
    isDragging, // Added dependency
    saveToUndoStack,
  ]);

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
  }, [isPlaying, maxFrame, isLooping, appliedFps]);

  // Tools
  const tools = [
    { id: "pencil", icon: Pencil, label: "Pencil" },
    { id: "palette", icon: Palette, label: "Palette" },
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
    if (!canvas || typeof window === "undefined") return;

    const link = document.createElement("a");
    link.download = "animation.png";
    link.href = canvas.toDataURL();
    link.click();
  };

  // Undo/Redo functions
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;

    const previousState = undoStack[undoStack.length - 1];
    // Save current state to redo stack
    const currentState = {
      layerStrokes: JSON.parse(JSON.stringify(layerStrokes)),
      folderLayers: JSON.parse(JSON.stringify(folderLayers)),
      drawingFrames: JSON.parse(JSON.stringify(drawingFrames)),
      layerOrder: JSON.parse(JSON.stringify(layerOrder)),
    };

    // Restore previous state
    setLayerStrokes(previousState.layerStrokes);
    setFolderLayers(previousState.folderLayers);
    setDrawingFrames(previousState.drawingFrames);
    setLayerOrder(previousState.layerOrder);

    // Update stacks
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, currentState]);
  }, [undoStack, layerStrokes, folderLayers, drawingFrames, layerOrder]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;

    const nextState = redoStack[redoStack.length - 1];
    // Save current state to undo stack
    const currentState = {
      layerStrokes: JSON.parse(JSON.stringify(layerStrokes)),
      folderLayers: JSON.parse(JSON.stringify(folderLayers)),
      drawingFrames: JSON.parse(JSON.stringify(drawingFrames)),
      layerOrder: JSON.parse(JSON.stringify(layerOrder)),
    };

    // Restore next state
    setLayerStrokes(nextState.layerStrokes);
    setFolderLayers(nextState.folderLayers);
    setDrawingFrames(nextState.drawingFrames);
    setLayerOrder(nextState.layerOrder);

    // Update stacks
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, currentState]);
  }, [redoStack, layerStrokes, folderLayers, drawingFrames, layerOrder]);

  // Folder CRUD now that saveToUndoStack exists
  const addFolder = useCallback(() => {
    const targetRowId = selectedRow || "row-1";
    const rowFrames = drawingFrames.filter((df) => df.rowId === targetRowId);
    const nextIndex =
      rowFrames.length > 0
        ? Math.max(...rowFrames.map((f) => f.frameIndex)) + 1
        : 0;
    const folderId = `${targetRowId}-${nextIndex}`;

    setDrawingFrames((prev) => [
      ...prev,
      {
        rowId: targetRowId,
        frameIndex: nextIndex,
        length: 1,
        imageUrl: "",
        fileName: "",
      },
    ]);
    setLayerOrder((prev) => ({ ...prev, [folderId]: [`${folderId}-main`] }));
    setFolderLayers((prev) => ({ ...prev, [folderId]: [] }));
    setOpenFolders((prev) => ({ ...prev, [folderId]: true }));
    setSelectedLayerId(`${folderId}-main`);
    setSelectedFrameNumber(nextIndex + 1);
    saveToUndoStack();
  }, [drawingFrames, selectedRow, saveToUndoStack]);

  const deleteSelectedFolder = useCallback(() => {
    const folderId = getActiveFrameFolderId(selectedLayerId || "");
    if (!folderId) return;
    setDrawingFrames((prev) =>
      prev.filter((df) => `${df.rowId}-${df.frameIndex}` !== folderId)
    );
    setLayerStrokes((prev) => {
      const next: Record<string, DrawingStroke[]> = {} as any;
      for (const [key, value] of Object.entries(prev)) {
        if (!key.startsWith(folderId)) next[key] = value as any;
      }
      return next as any;
    });
    setFolderLayers((prev) => {
      const copy = { ...prev } as any;
      delete copy[folderId];
      return copy;
    });
    setLayerOrder((prev) => {
      const copy = { ...prev } as any;
      delete copy[folderId];
      return copy;
    });
    setSelectedLayerId(null);
    saveToUndoStack();
  }, [selectedLayerId, saveToUndoStack]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    // Only add event listeners on the client side
    if (typeof window === "undefined") return;

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

  // When drawingFrames are updated (e.g., loaded, created), initialize layerOrder
  useEffect(() => {
    setLayerOrder((prevOrder) => {
      const newOrder = { ...prevOrder };
      drawingFrames.forEach((df) => {
        const folderId = `${df.rowId}-${df.frameIndex}`;
        if (!newOrder[folderId]) {
          newOrder[folderId] = [`${folderId}-main`];
        }
      });
      return newOrder;
    });
  }, [drawingFrames]);

  // Derived sidebar folders from drawingFrames
  const sidebarFolders = drawingFrames.map((df, index) => {
    const id = `${df.rowId}-${df.frameIndex}`;
    const isExtended = df.length > 1;
    const defaultLabel = isExtended
      ? `Row ${parseInt(df.rowId.split("-")[1])} Frame ${df.frameIndex + 1}:${
          df.frameIndex + df.length
        }`
      : `Row ${parseInt(df.rowId.split("-")[1])} Frame ${df.frameIndex + 1}`;
    const storyboardLabel = folderNames[id] || `Page ${index + 1}`;
    return {
      id,
      label: mode === "storyboard" ? storyboardLabel : defaultLabel,
      imageUrl: df.imageUrl,
      fileName: df.fileName,
      opacity: layerOpacities[id] ?? 1,
      visible: true,
      locked: false,
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

  const handleAddLayer = (activeLayerId: string) => {
    const folderId = getActiveFrameFolderId(activeLayerId);
    if (!folderId) return;

    const newLayerIndex = (folderLayers[folderId] || []).length;
    const newLayerId = `${folderId}-extra-${newLayerIndex}`;
    const newLayerName = `Untitled.${newLayerIndex + 2}`;

    setFolderLayers((prev) => ({
      ...prev,
      [folderId]: [...(prev[folderId] || []), newLayerName],
    }));

    setLayerOrder((prev) => ({
      ...prev,
      [folderId]: [...(prev[folderId] || []), newLayerId],
    }));

    saveToUndoStack();
  };

  const handleAddRow = () => {
    setRows((prevRows) => {
      const existingRowNumbers = prevRows.map((row) => {
        const match = row.id.match(/row-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      });
      const maxRowNumber = Math.max(0, ...existingRowNumbers);
      const newRowNumber = maxRowNumber + 1;
      const newId = `row-${newRowNumber}`;
      return [...prevRows, { id: newId, name: `Row ${newRowNumber}` }];
    });
  };

  const handleDeleteFrame = () => {
    if (!selectedLayerId) return;

    const frameFolderId = getActiveFrameFolderId(selectedLayerId);
    if (!frameFolderId) return;

    const [rowId, frameIndexStr] = frameFolderId.split("-");
    const frameIndex = parseInt(frameIndexStr, 10);

    // Remove the frame and its associated layers
    setDrawingFrames((prev) =>
      prev.filter((df) => !(df.rowId === rowId && df.frameIndex === frameIndex))
    );
    setLayerStrokes((prev) => {
      const newStrokes = { ...prev };
      Object.keys(newStrokes).forEach((key) => {
        if (key.startsWith(frameFolderId)) {
          delete newStrokes[key];
        }
      });
      return newStrokes;
    });
    setFolderLayers((prev) => {
      const newFolderLayers = { ...prev };
      delete newFolderLayers[frameFolderId];
      return newFolderLayers;
    });

    setLayerOrder((prev) => {
      const newOrder = { ...prev };
      delete newOrder[frameFolderId];
      return newOrder;
    });

    setSelectedLayerId(null);
    setSelectedFrameNumber(null);
    saveToUndoStack();
  };

  const handleDeleteRow = () => {
    if (!selectedRow) return;

    // Remove all frames and layers associated with the row
    setDrawingFrames((prev) => prev.filter((df) => df.rowId !== selectedRow));
    setRows((prev) => prev.filter((row) => row.id !== selectedRow));
    setLayerStrokes((prev) => {
      const newStrokes = { ...prev };
      Object.keys(newStrokes).forEach((key) => {
        if (key.startsWith(selectedRow)) {
          delete newStrokes[key];
        }
      });
      return newStrokes;
    });
    setFolderLayers((prev) => {
      const newFolderLayers = { ...prev };
      Object.keys(newFolderLayers).forEach((key) => {
        if (key.startsWith(selectedRow)) {
          delete newFolderLayers[key];
        }
      });
      return newFolderLayers;
    });

    setSelectedRow("");
    setSelectedLayerId(null);
    setSelectedFrameNumber(null);
    saveToUndoStack();
  };

  const moveLayer = (
    folderId: string,
    layerId: string,
    direction: "up" | "down"
  ) => {
    setLayerOrder((prev) => {
      const order = prev[folderId];
      if (!order) return prev;

      const index = order.indexOf(layerId);
      if (index === -1) return prev;

      const newOrder = [...order];
      if (direction === "up" && index > 0) {
        [newOrder[index - 1], newOrder[index]] = [
          newOrder[index],
          newOrder[index - 1],
        ];
      } else if (direction === "down" && index < order.length - 1) {
        [newOrder[index + 1], newOrder[index]] = [
          newOrder[index],
          newOrder[index + 1],
        ];
      }

      return { ...prev, [folderId]: newOrder };
    });
  };

  const moveFrameFolderUp = (folderId: string) => {
    // This function would move a frame folder up in the timeline
    // For now, we'll implement a placeholder that saves to undo stack
    saveToUndoStack();
  };

  const moveFrameFolderDown = (folderId: string) => {
    // This function would move a frame folder down in the timeline
    // For now, we'll implement a placeholder that saves to undo stack
    saveToUndoStack();
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  const handleDeleteSelectedStrokes = () => {
    if (!lassoSelection || !selectedLayerId) return;

    setLayerStrokes((prev) => ({
      ...prev,
      [selectedLayerId]: (prev[selectedLayerId] || []).filter(
        (stroke) => !lassoSelection.selectedStrokeIds.includes(stroke.id)
      ),
    }));

    setLassoSelection(null);
    handleCloseContextMenu();
    saveToUndoStack();
  };

  const handleDuplicateSelectedStrokes = () => {
    if (!lassoSelection || !selectedLayerId) return;
    const strokesToDuplicate = (layerStrokes[selectedLayerId] || []).filter(
      (stroke) => lassoSelection.selectedStrokeIds.includes(stroke.id)
    );
    const newStrokes = strokesToDuplicate.map((stroke) => ({
      ...stroke,
      id: generateStrokeId(),
      points: stroke.points.map((p) => ({ x: p.x + 10, y: p.y + 10 })),
    }));

    setLayerStrokes((prev) => ({
      ...prev,
      [selectedLayerId]: [...prev[selectedLayerId], ...newStrokes],
    }));

    // Update selection to the new strokes
    const newSelectionPoints = lassoSelection.points.map((p) => ({
      x: p.x + 10,
      y: p.y + 10,
    }));
    setLassoSelection({
      points: newSelectionPoints,
      isActive: true,
      selectedStrokeIds: newStrokes.map((s) => s.id),
    });

    handleCloseContextMenu();
    saveToUndoStack();
  };

  const handleCopySelectedStrokes = useCallback(() => {
    if (!lassoSelection || !selectedLayerId) return;
    const strokesToCopy = (layerStrokes[selectedLayerId] || [])
      .filter((stroke) => lassoSelection.selectedStrokeIds.includes(stroke.id))
      .map((s) => JSON.parse(JSON.stringify(s))); // Deep copy

    setClipboard(strokesToCopy);
    handleCloseContextMenu();
  }, [lassoSelection, layerStrokes, selectedLayerId]);

  const handleCutSelectedStrokes = useCallback(() => {
    handleCopySelectedStrokes();
    handleDeleteSelectedStrokes();
    handleCloseContextMenu();
  }, [
    lassoSelection,
    layerStrokes,
    selectedLayerId,
    handleDeleteSelectedStrokes,
  ]);

  const pasteFromClipboard = useCallback(() => {
    if (clipboard && selectedLayerId) {
      setPastePreview(clipboard);
      setLassoSelection(null); // Clear any existing selection
      handleCloseContextMenu();
    }
  }, [clipboard, selectedLayerId]);

  const showContextMenuForSelection = (selection: { points: Point[] }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { minX, maxX, minY, maxY } = getLassoBoundingBox(selection.points);

    // Convert canvas coords to screen coords for the menu
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;

    const menuX = rect.left + ((minX + maxX) / 2) * scaleX;
    const menuY = rect.top + maxY * scaleY + 15; // 15px offset below

    setContextMenu({ visible: true, x: menuX, y: menuY });
  };

  // Helper to get bounding box of multiple strokes
  const getStrokesBoundingBox = (strokes: DrawingStroke[]) => {
    if (strokes.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    strokes.forEach((stroke) => {
      stroke.points.forEach((point) => {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      });
    });
    return { minX, maxX, minY, maxY };
  };

  const handleResizeClick = () => {
    if (!lassoSelection || !selectedLayerId) return;

    const selectedStrokes = (layerStrokes[selectedLayerId] || []).filter(
      (stroke) => lassoSelection.selectedStrokeIds.includes(stroke.id)
    );

    if (selectedStrokes.length === 0) return;

    // Calculate bounding box
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    selectedStrokes.forEach((stroke) => {
      stroke.points.forEach((point) => {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      });
    });

    // Create resize box with padding
    const padding = 10;
    const boxX = minX - padding;
    const boxY = minY - padding;
    const boxWidth = maxX - minX + padding * 2;
    const boxHeight = maxY - minY + padding * 2;

    setResizeBox({
      x: boxX,
      y: boxY,
      width: boxWidth,
      height: boxHeight,
      strokes: selectedStrokes,
      originalStrokes: JSON.parse(JSON.stringify(selectedStrokes)), // Deep copy for reverting
      initialX: boxX,
      initialY: boxY,
      initialWidth: boxWidth,
      initialHeight: boxHeight,
    });

    setIsResizing(true);
    setLassoSelection(null);
    handleCloseContextMenu();
  };

  const getResizeHandles = (box: typeof resizeBox) => {
    if (!box) return {};
    const handleSize = 8;
    const { x, y, width, height } = box;
    return {
      topLeft: {
        x: x - handleSize / 2,
        y: y - handleSize / 2,
        size: handleSize,
        cursor: "nwse-resize",
      },
      topRight: {
        x: x + width - handleSize / 2,
        y: y - handleSize / 2,
        size: handleSize,
        cursor: "nesw-resize",
      },
      bottomLeft: {
        x: x - handleSize / 2,
        y: y + height - handleSize / 2,
        size: handleSize,
        cursor: "nesw-resize",
      },
      bottomRight: {
        x: x + width - handleSize / 2,
        y: y + height - handleSize / 2,
        size: handleSize,
        cursor: "nwse-resize",
      },
    };
  };

  const handleMouseUp = () => {
    // Panning
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    // Resizing
    if (isResizing) {
      if (activeHandle) {
        setActiveHandle(null);
        if (resizeBox) {
          setResizeBox((prev) =>
            prev
              ? {
                  ...prev,
                  originalStrokes: JSON.parse(JSON.stringify(prev.strokes)),
                }
              : null
          );
        }
        saveToUndoStack();
      }
      if (isDraggingResizeBox) {
        setIsDraggingResizeBox(false);
        if (resizeBox) {
          setResizeBox((prev) =>
            prev
              ? {
                  ...prev,
                  originalStrokes: JSON.parse(JSON.stringify(prev.strokes)),
                }
              : null
          );
        }
        saveToUndoStack();
      }
      return;
    }

    // Move tool - finishing a drag
    if (isDragging) {
      setIsDragging(false);
      setOriginalLassoPoints([]);
      setOriginalStrokePositions({});
      if (lassoSelection) {
        showContextMenuForSelection(lassoSelection);
      }
      saveToUndoStack();
      return;
    }

    // Move tool - finishing a lasso selection
    if (isSelecting && currentTool === "move" && lassoSelection) {
      setIsSelecting(false);
      if (lassoSelection.points.length < 3) {
        setLassoSelection(null);
        return;
      }
      const allStrokesOnLayer = layerStrokes[selectedLayerId || ""] || [];
      const selectedStrokeIds = allStrokesOnLayer
        .filter((stroke) =>
          stroke.points.some((point) =>
            isPointInPolygon(point, lassoSelection.points)
          )
        )
        .map((stroke) => stroke.id);

      const finalSelection = {
        ...lassoSelection,
        isActive: true,
        selectedStrokeIds: selectedStrokeIds,
      };
      setLassoSelection(finalSelection);
      showContextMenuForSelection(finalSelection);
      return;
    }

    // Eraser tool - save changes to undo stack
    if (currentTool === "eraser" && selectedLayerId) {
      saveToUndoStack();
      lastErasePointRef.current = null; // Clear ref on mouse up
      return;
    }

    // Regular drawing
    if (isDrawing && currentStroke && selectedLayerId) {
      setIsDrawing(false);
      if (currentStroke.points.length > 1) {
        setLayerStrokes((prevStrokes) => ({
          ...prevStrokes,
          [selectedLayerId]: [
            ...(prevStrokes[selectedLayerId] || []),
            currentStroke,
          ],
        }));
        saveToUndoStack();
      }
      setCurrentStroke(null);
    }
  };

  const handleConfirmResize = () => {
    if (!isResizing) return;
    setIsResizing(false);
    setResizeBox(null);
    setActiveHandle(null);
    setIsDraggingResizeBox(false);
    // Final state is already in layerStrokes, just need to save
    saveToUndoStack();
  };

  // Custom color set functions
  const createColorSet = () => {
    if (newSetName.trim()) {
      setCustomColorSets((prev) => ({
        ...prev,
        [newSetName.trim()]: [],
      }));
      setNewSetName("");
      setIsCreatingSet(false);
    }
  };

  const addColorToSet = (setName: string, color: string) => {
    setCustomColorSets((prev) => ({
      ...prev,
      [setName]: [...(prev[setName] || []), color],
    }));
  };

  const removeColorFromSet = (setName: string, colorIndex: number) => {
    setCustomColorSets((prev) => ({
      ...prev,
      [setName]: prev[setName].filter((_, index) => index !== colorIndex),
    }));
  };

  const deleteColorSet = (setName: string) => {
    setCustomColorSets((prev) => {
      const newSets = { ...prev };
      delete newSets[setName];
      return newSets;
    });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === " ") {
      e.preventDefault();
      undo();
    } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
      e.preventDefault();
      redo();
    } else if ((e.ctrlKey || e.metaKey) && e.key === "c") {
      handleCopySelectedStrokes();
    } else if ((e.ctrlKey || e.metaKey) && e.key === "v") {
      pasteFromClipboard();
    } else if (e.key === "Enter" && isResizing) {
      handleConfirmResize();
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      e.preventDefault();
      setIsSpacePressed(false);
    }
  };

  // Add event listeners for keyboard shortcuts
  useEffect(() => {
    // Only add event listeners on the client side
    if (typeof window === "undefined") return;

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

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
            <h1 className="text-lg font-semibold">
              {mode === "storyboard"
                ? "Storyboard Editor"
                : mode === "composite"
                ? "Compositing Editor"
                : "Animation Editor"}
            </h1>
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

            {/* Scene Settings */}
            <Button
              variant="outline"
              size="sm"
              className="text-gray-400 bg-transparent border-gray-600"
              onClick={() => setIsSettingsOpen(true)}
              title="Scene settings"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="text-gray-400 bg-transparent border-gray-600"
              onClick={saveScene}
              disabled={isSaving}
              title="Save settings"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save"}
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
              (isHoveringToolbar || isColorPickerOpen) && currentTool !== "move"
                ? "w-64"
                : "w-0"
            }`}
          >
            <div className="p-4 space-y-4 min-w-64">
              {/* Pencil Settings */}
              {currentTool === "pencil" && (
                <>
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
                </>
              )}

              {/* Palette Settings */}
              {currentTool === "palette" && (
                <>
                  <div>
                    <Label className="text-sm font-medium">Color</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        onFocus={() => setIsColorPickerOpen(true)}
                        onBlur={() => setIsColorPickerOpen(false)}
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

                  {/* Custom Color Sets */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">Custom Sets</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsCreatingSet(true)}
                        className="h-6 px-2 text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        New Set
                      </Button>
                    </div>

                    {/* Create New Set */}
                    {isCreatingSet && (
                      <div className="flex items-center gap-2 mb-3 p-2 border border-gray-600 rounded">
                        <Input
                          value={newSetName}
                          onChange={(e) => setNewSetName(e.target.value)}
                          placeholder="Set name"
                          className="flex-1 h-6 text-xs"
                          onKeyPress={(e) =>
                            e.key === "Enter" && createColorSet()
                          }
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={createColorSet}
                          className="h-6 px-2 text-xs"
                        >
                          Create
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsCreatingSet(false);
                            setNewSetName("");
                          }}
                          className="h-6 px-2 text-xs"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}

                    {/* Display Custom Sets */}
                    {Object.entries(customColorSets).map(
                      ([setName, colors]) => (
                        <div key={setName} className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-medium">
                              {setName}
                            </Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteColorSet(setName)}
                              className="h-6 px-2 text-xs text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {colors.map((c, index) => (
                              <button
                                key={index}
                                className="w-8 h-8 rounded border-2 border-gray-600 hover:border-white relative group"
                                style={{ backgroundColor: c }}
                                onClick={() => setColor(c)}
                              >
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center">
                                  <X
                                    className="w-3 h-3 text-white opacity-0 group-hover:opacity-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeColorFromSet(setName, index);
                                    }}
                                  />
                                </div>
                              </button>
                            ))}
                            <button
                              className="w-8 h-8 rounded border-2 border-dashed border-gray-600 hover:border-white flex items-center justify-center"
                              onClick={() => addColorToSet(setName, color)}
                            >
                              <Plus className="w-3 h-3 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      )
                    )}
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
                  onDragOver={(e) => {
                    // Allow dropping files onto canvas
                    e.preventDefault();
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const file = e.dataTransfer?.files?.[0];
                    if (!file || !file.type.startsWith("image/")) return;
                    // Determine current folder from selectedLayerId
                    const folderId = getActiveFrameFolderId(selectedLayerId || "");
                    if (!folderId) {
                      // If none selected, create a new folder and use its main layer
                      const targetRowId = selectedRow || "row-1";
                      const rowFrames = drawingFrames.filter((df) => df.rowId === targetRowId);
                      const nextIndex = rowFrames.length > 0 ? Math.max(...rowFrames.map((f) => f.frameIndex)) + 1 : 0;
                      const newFolderId = `${targetRowId}-${nextIndex}`;
                      setDrawingFrames((prev) => [
                        ...prev,
                        { rowId: targetRowId, frameIndex: nextIndex, length: 1, imageUrl: "", fileName: file.name },
                      ]);
                      setLayerOrder((prev) => ({ ...prev, [newFolderId]: [`${newFolderId}-main`] }));
                      setFolderLayers((prev) => ({ ...prev, [newFolderId]: [] }));
                      setOpenFolders((prev) => ({ ...prev, [newFolderId]: true }));
                      setSelectedLayerId(`${newFolderId}-main`);
                    }

                    const activeFolderId = getActiveFrameFolderId(selectedLayerId || "") ||
                      (() => {
                        const targetRowId = selectedRow || "row-1";
                        const rowFrames = drawingFrames.filter((df) => df.rowId === targetRowId);
                        const idx = rowFrames.length > 0 ? Math.max(...rowFrames.map((f) => f.frameIndex)) + 1 : 0;
                        return `${targetRowId}-${idx}`;
                      })();

                    // Ensure a new extra layer is created for this image
                    setFolderLayers((prev) => {
                      const next = { ...prev } as any;
                      if (!next[activeFolderId]) next[activeFolderId] = [];
                      const newName = `Untitled.${(next[activeFolderId].length || 0) + 1}`;
                      next[activeFolderId] = [...next[activeFolderId], newName];
                      return next;
                    });
                    setLayerOrder((prev) => {
                      const next = { ...prev } as any;
                      if (!next[activeFolderId]) next[activeFolderId] = [`${activeFolderId}-main`];
                      const newLayerId = `${activeFolderId}-extra-${next[activeFolderId].length}`;
                      next[activeFolderId] = [...next[activeFolderId], newLayerId];
                      return next;
                    });

                    const newExtraIndex = (folderLayers[activeFolderId]?.length || 0);
                    const newLayerId = `${activeFolderId}-extra-${newExtraIndex}`;

                    // Create an image stroke centered; minimal stroke contains metadata
                    const stroke: DrawingStroke = {
                      id: generateStrokeId(),
                      points: [],
                      color: "none",
                      brushSize: 0,
                      tool: "image",
                      layerId: newLayerId,
                    };
                    setLayerStrokes((prev) => ({
                      ...prev,
                      [newLayerId]: [...(prev[newLayerId] || []), stroke],
                    }));

                    // Upload to Storage if enabled, else use blob URL
                    let imageUrl = "";
                    let key: string | undefined = undefined;
                    const enableStorage = process.env.NEXT_PUBLIC_ENABLE_SCENE_STORAGE === "true";
                    if (
                      enableStorage &&
                      sceneSettings?.projectId &&
                      sceneSettings?.chapterId &&
                      sceneSettings?.sequenceId
                    ) {
                      try {
                        const bucket = "animation-scenes";
                        const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
                        const ts = new Date().toISOString().replace(/[:.]/g, "-");
                        const keyBase = `${sceneSettings.projectId}/${sceneSettings.chapterId}/${sceneSettings.sequenceId}/${mode === "storyboard" ? `storyboard-${sceneSettings?.storyboardId || "unknown"}` : `shot-${sceneSettings?.shotId || "unknown"}`}`;
                        key = `${keyBase}/assets/pages/${activeFolderId}/${ts}-${safeName}`;
                        const { error: upErr } = await supabase.storage
                          .from(bucket)
                          .upload(key, file, { upsert: true, contentType: file.type });
                        if (!upErr) {
                          const { data: signed } = await supabase.storage
                            .from(bucket)
                            .createSignedUrl(key, 60 * 60 * 24);
                          imageUrl = signed?.signedUrl || URL.createObjectURL(file);
                        } else {
                          imageUrl = URL.createObjectURL(file);
                        }
                      } catch {
                        imageUrl = URL.createObjectURL(file);
                      }
                    } else {
                      imageUrl = URL.createObjectURL(file);
                    }

                    // Attach to drawingFrames cell representing this folder's main index
                    setDrawingFrames((prev) => {
                      const [rowId, frameIndexStr] = activeFolderId.split("-").slice(0, 2);
                      const frameIndex = parseInt(frameIndexStr);
                      const exists = prev.find((df) => df.rowId === rowId && df.frameIndex === frameIndex);
                      if (exists) {
                        return prev.map((df) =>
                          df.rowId === rowId && df.frameIndex === frameIndex
                            ? { ...df, imageUrl, fileName: file.name }
                            : df
                        );
                      }
                      return [...prev, { rowId, frameIndex, length: 1, imageUrl, fileName: file.name }];
                    });

                    // Record key for re-signing later
                    if (key) {
                      setFrameAssetKeys((prev) => ({
                        ...prev,
                        [`${activeFolderId.replace("-", "|")}`]: key,
                      }));
                    }

                    setSelectedLayerId(newLayerId);
                    saveToUndoStack();
                  }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={handleMouseUp}
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

          {/* Context Menu */}
          {contextMenu.visible && lassoSelection?.isActive && (
            <div
              style={{
                position: "fixed",
                top: contextMenu.y,
                left: contextMenu.x,
                transform: "translateX(-50%)",
                zIndex: 100,
              }}
              className="bg-gray-900 rounded-lg shadow-xl border border-gray-700 flex items-center p-1"
            >
              <Button
                variant="ghost"
                size="sm"
                className="px-3"
                onClick={handleCutSelectedStrokes}
              >
                Cut
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="px-3"
                onClick={handleCopySelectedStrokes}
              >
                Copy
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="px-3 text-red-500 hover:text-red-400"
                onClick={handleDeleteSelectedStrokes}
              >
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="px-3"
                onClick={handleDuplicateSelectedStrokes}
              >
                Duplicate
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="px-3"
                onClick={handleResizeClick}
              >
                Resize
              </Button>
            </div>
          )}

          {/* Timeline - hidden in storyboard mode */}
          {mode !== "storyboard" && (
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
                onDeleteFrame={handleDeleteFrame}
                onDeleteRow={handleDeleteRow}
                onAddRow={handleAddRow}
              />
            </div>
          )}
        </div>

        {/* Right Sidebar (Layer Panel) */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 p-4 flex flex-col">
          {/* Top Controls Area */}
          <div className="flex-shrink-0">
            {/* Folders toolbar (Storyboard only) */}
            {mode === "storyboard" && (
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Folders</h3>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={addFolder}
                    className="w-8 h-8"
                    title="Add Frame"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={deleteSelectedFolder}
                    className="w-8 h-8 text-red-500 hover:text-red-400"
                    title="Delete Frame"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Header: Layers Title + Action Buttons */}
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-medium text-gray-200">Layers</h2>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    selectedLayerId && handleAddLayer(selectedLayerId)
                  }
                  className="w-8 h-8"
                  title="Add Layer"
                >
                  <Plus className="w-5 h-5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (selectedLayerId) {
                      // Delete logic...
                      setLayerStrokes((prev) => {
                        const newStrokes = { ...prev };
                        delete newStrokes[selectedLayerId];
                        return newStrokes;
                      });
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
                  className="w-8 h-8 text-red-500 hover:text-red-400"
                  disabled={!selectedLayerId}
                  title="Delete Layer"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Spacer before opacity */}
            <div className="mb-2" />

            {/* Opacity Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-medium">
                <Label htmlFor="opacity-slider">Opacity</Label>
                <span className="text-gray-300">
                  {Math.round(
                    (selectedLayerId
                      ? layerOpacities[selectedLayerId] ?? 1
                      : 1) * 100
                  )}
                  %
                </span>
              </div>
              <Slider
                id="opacity-slider"
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
                className="w-full"
              />
            </div>
          </div>

          {/* Thin Separator */}
          <div className="border-b border-gray-600 my-4 flex-shrink-0" />

          {/* Scrollable Layers List */}
          <ScrollArea className="flex-1 pr-2">
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
                      {editingFolderId === folder.id ? (
                        <input
                          className="text-xs bg-gray-800 text-white px-2 py-1 rounded border border-gray-600"
                          value={editingFolderValue}
                          onChange={(e) =>
                            setEditingFolderValue(e.target.value)
                          }
                          onBlur={() => {
                            setFolderNames((prev) => ({
                              ...prev,
                              [folder.id]: editingFolderValue || folder.label,
                            }));
                            setEditingFolderId(null);
                            setEditingFolderValue("");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              setFolderNames((prev) => ({
                                ...prev,
                                [folder.id]: editingFolderValue || folder.label,
                              }));
                              setEditingFolderId(null);
                              setEditingFolderValue("");
                            }
                            if (e.key === "Escape") {
                              setEditingFolderId(null);
                              setEditingFolderValue("");
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <span className="font-medium text-xs">
                          {folder.label}
                        </span>
                      )}
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
                    {/* Rename pencil (Storyboard only) */}
                    {mode === "storyboard" && (
                      <button
                        className="ml-2 text-gray-400 hover:text-white"
                        title="Rename Page"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingFolderId(folder.id);
                          setEditingFolderValue(
                            folderNames[folder.id] || folder.label
                          );
                        }}
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {/* Folder Content (Layer) */}
                  {openFolders[folder.id] && (
                    <div className="pl-2 py-2 flex flex-col gap-1 rounded-b">
                      {(layerOrder[folder.id] || []).map(
                        (layerId, layerIndex) => {
                          const isMain = layerId.endsWith("-main");
                          const extraLayerIndex = isMain
                            ? -1
                            : parseInt(layerId.split("-extra-")[1], 10);
                          const layerName = isMain
                            ? folder.fileName
                              ? getFileNameBaseFromString(folder.fileName)
                              : "Untitled.1"
                            : folderLayers[folder.id]?.[extraLayerIndex] ||
                              `Untitled.${extraLayerIndex + 2}`;

                          return (
                            <div
                              key={layerId}
                              className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer ${
                                selectedLayerId === layerId
                                  ? "bg-blue-600"
                                  : "bg-gray-600 hover:bg-gray-500"
                              }`}
                              onClick={() => handleSidebarSelection(layerId)}
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <Eye
                                  className={`w-4 h-4 ${
                                    layerVisibility[layerId] !== false
                                      ? "text-white"
                                      : "text-gray-500"
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleVisibility(layerId);
                                  }}
                                />
                                {editingLayerName === layerId ? (
                                  <input
                                    value={editingLayerValue}
                                    onChange={(e) =>
                                      setEditingLayerValue(e.target.value)
                                    }
                                    onBlur={() => handleSaveRename(layerId)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter")
                                        handleSaveRename(layerId);
                                      if (e.key === "Escape")
                                        handleCancelRename();
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
                                    const currentName = folder.fileName
                                      ? getFileNameBaseFromString(
                                          folder.fileName
                                        )
                                      : "Untitled.1";
                                    handleStartRename(layerId, currentName);
                                  }}
                                />
                                <div className="text-xs text-gray-300">
                                  {Math.round(
                                    (layerOpacities[layerId] ?? 1) * 100
                                  )}
                                  %
                                </div>
                                {/* Up/Down arrows for reordering layers */}
                                <div className="flex flex-col">
                                  <button
                                    className="text-gray-400 hover:text-white disabled:opacity-25"
                                    title="Move Up"
                                    disabled={layerIndex === 0}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      moveLayer(folder.id, layerId, "up");
                                    }}
                                  >
                                    <ChevronUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    className="text-gray-400 hover:text-white disabled:opacity-25"
                                    title="Move Down"
                                    disabled={
                                      layerIndex ===
                                      (layerOrder[folder.id]?.length || 0) - 1
                                    }
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      moveLayer(folder.id, layerId, "down");
                                    }}
                                  >
                                    <ChevronDown className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsSettingsOpen(false)}
          />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-gray-800 border border-gray-700 rounded-lg p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4">
              Scene Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Scene Name
                </label>
                <input
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-300"
                  value={sceneSettings?.sceneName ?? "Scene"}
                  disabled
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Width
                  </label>
                  <input
                    type="number"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    value={draftWidth}
                    onChange={(e) =>
                      setDraftWidth(parseInt(e.target.value || "0", 10))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Height
                  </label>
                  <input
                    type="number"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    value={draftHeight}
                    onChange={(e) =>
                      setDraftHeight(parseInt(e.target.value || "0", 10))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Units
                  </label>
                  <input
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-300"
                    value="px"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Frame Rate
                  </label>
                  <input
                    type="number"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    value={draftFps}
                    onChange={(e) =>
                      setDraftFps(parseInt(e.target.value || "0", 10))
                    }
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded px-3 py-2"
                  onClick={async () => {
                    // Commit draft → applied
                    setAppliedWidth(draftWidth);
                    setAppliedHeight(draftHeight);
                    setAppliedFps(draftFps);
                    setIsSettingsOpen(false);
                  }}
                >
                  Apply
                </button>
                <button
                  className="border border-gray-600 text-gray-300 rounded px-3 py-2"
                  onClick={() => setIsSettingsOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
