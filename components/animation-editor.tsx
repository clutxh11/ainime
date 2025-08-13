"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";

import { Pencil, Palette, Eraser, Move } from "lucide-react";
import TopBar from "@/components/editor/TopBar";
import ToolSidebar from "@/components/editor/ToolSidebar";
import CanvasViewport from "@/components/editor/CanvasViewport";
import SettingsPanel from "@/components/editor/SettingsPanel";
import LayersPanel from "@/components/editor/LayersPanel";
import EditorSettingsModal from "@/components/editor/EditorSettingsModal";
import CtxMenu from "@/components/editor/ContextMenu";

import ExportModal from "@/components/editor/ExportModal";
import type { CurrentView } from "@/types";
import type { DrawingFrame } from "./timeline-grid";
import TimelineDock from "@/components/editor/TimelineDock";
import { supabase } from "@/lib/supabase";
import { getOrCreateComposition } from "@/lib/sequences";
import { slugifyName } from "@/lib/editor/paths";
import { renderFrameToContextImpl } from "@/lib/editor/canvas-render";
import { drawFrameImpl } from "@/lib/editor/canvas-draw";
import { runExport } from "@/lib/editor/export-runner";
import {
  isPointInPolygon,
  getStrokesBoundingBox,
  getResizeHandles,
  getLassoBoundingBox,
} from "@/lib/editor/geometry";


import {
  serializeDocument as buildDocument,
  saveSceneDoc,
  loadSceneDoc,
} from "@/lib/editor/persistence";
import useKeyboardShortcuts from "@/hooks/useKeyboardShortcuts";
import useSelectionTools from "@/hooks/useSelectionTools";
import useResizeHandlers from "@/hooks/useResizeHandlers";
import useCanvasInteractions from "@/hooks/useCanvasInteractions";

type EditorMode = "animate" | "storyboard" | "composite";

interface AnimationEditorProps {
  onViewChange: (view: CurrentView) => void;
  sceneSettings?: {
    sceneName: string;
    canvasWidth: number;
    canvasHeight: number;
    frameRate: number;
    projectId?: string;
    projectTitle?: string;
    chapterId?: string;
    chapterTitle?: string;
    sequenceId?: string;
    shotId?: string;
    storyboardId?: string;
    sequenceCode?: string;
    shotCode?: string;
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

// moved to lib/editor/geometry

// Helper to get the active frame folder id from selectedLayerId
function getActiveFrameFolderId(selectedLayerId: string | null) {
  if (!selectedLayerId) return null;
  // e.g. "row1-0-main" or "row1-0-extra-0" => "row1-0"
  const match = selectedLayerId.match(/^(row-\d+-\d+)/);
  return match ? match[1] : null; // Return null if no match
}

// moved helpers to lib/editor/paths

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
  const [onionSkin, setOnionSkin] = useState(false);
  // In compositing mode the grid toggle button is hidden, so default grid OFF
  const [showGrid, setShowGrid] = useState(mode === "composite" ? false : true);
  const [zoom, setZoom] = useState(1);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // Editable name in settings (shot or sequence)
  const [draftName, setDraftName] = useState<string>("");
  const [nameOverride, setNameOverride] = useState<string | undefined>(
    undefined
  );
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
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
  const [compositionId, setCompositionId] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportFolderName, setExportFolderName] = useState<string>(
    (sceneSettings?.sceneName || "Export").replace(/\s+/g, "_")
  );
  // File naming scheme: for now only frame-folder shorthand (e.g., R1F1)
  const [exportNameScheme, setExportNameScheme] =
    useState<"frame-folder">("frame-folder");
  const [exportFormat, setExportFormat] = useState<"png" | "jpg" | "webp">(
    "png"
  );
  const [exportRowAllFrames, setExportRowAllFrames] = useState(false);
  const [exportLayersMerge, setExportLayersMerge] = useState<boolean>(true);
  // Optional native folder picker handle (File System Access API)
  // Optional native folder handle (if user chooses one)
  const [exportDirHandle, setExportDirHandle] = useState<any | null>(null);
  // Initialize draftName whenever sceneSettings changes
  useEffect(() => {
    const initial =
      (mode === "storyboard"
        ? sceneSettings?.sequenceCode
        : sceneSettings?.shotCode) ||
      sceneSettings?.sceneName ||
      "";
    setDraftName(initial);
  }, [
    mode,
    sceneSettings?.sequenceCode,
    sceneSettings?.shotCode,
    sceneSettings?.sceneName,
  ]);
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
    // Create a blank background page; layer name comes from layers list (Untitled.1)
    return [
      {
        rowId: "row-1",
        frameIndex: 0,
        length: 1,
        imageUrl: "",
        fileName: "",
      },
    ];
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
    return buildDocument({
      sceneName: nameOverride ?? sceneSettings?.sceneName ?? "Scene",
      width: appliedWidth,
      height: appliedHeight,
      fps: appliedFps,
      rows,
      frameCount,
      drawingFrames,
      layerOrder,
      folderLayers,
      layerStrokes,
      selectedRow,
      zoom,
      onionSkin,
      showGrid,
      frameAssetKeys,
      folderNames,
    });
  }, [
    nameOverride,
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
    selectedRow,
    zoom,
    onionSkin,
    showGrid,
    frameAssetKeys,
    folderNames,
  ]);

  const saveScene = useCallback(async () => {
    const isStoryboard = mode === "storyboard";
    const isComposite = mode === "composite";
    const targetId = isStoryboard
      ? sceneSettings?.storyboardId
      : isComposite
      ? compositionId
      : sceneSettings?.shotId;
    if (!targetId) return;
    try {
      setIsSaving(true);
      await saveSceneDoc({
        mode,
        targetId,
        scene: {
          sceneName:
            nameOverride ??
            sceneSettings?.sceneName ??
            sceneSettings?.shotCode ??
            "Scene",
          width: appliedWidth,
          height: appliedHeight,
          fps: appliedFps,
          rows,
          frameCount,
          drawingFrames,
          layerOrder,
          folderLayers,
          layerStrokes,
          selectedRow,
          zoom,
          onionSkin,
          showGrid,
          frameAssetKeys,
          folderNames,
          projectTitle: sceneSettings?.projectTitle,
          projectId: sceneSettings?.projectId,
          chapterTitle: sceneSettings?.chapterTitle,
          chapterId: sceneSettings?.chapterId,
          sequenceCode: sceneSettings?.sequenceCode,
          sequenceId: sceneSettings?.sequenceId,
          shotCode: sceneSettings?.shotCode,
          shotId: sceneSettings?.shotId || undefined,
        },
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    mode,
    compositionId,
    sceneSettings?.storyboardId,
    sceneSettings?.shotId,
    sceneSettings?.projectTitle,
    sceneSettings?.projectId,
    sceneSettings?.chapterTitle,
    sceneSettings?.chapterId,
    sceneSettings?.sequenceCode,
    sceneSettings?.sequenceId,
    sceneSettings?.shotCode,
    nameOverride,
    appliedWidth,
    appliedHeight,
    appliedFps,
    rows,
    frameCount,
    drawingFrames,
    layerOrder,
    folderLayers,
    layerStrokes,
    selectedRow,
    zoom,
    onionSkin,
    showGrid,
    frameAssetKeys,
    folderNames,
  ]);

  const compositionBootstrapRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      const isStoryboard = mode === "storyboard";
      // Ensure composition exists
      if (
        mode === "composite" &&
        sceneSettings?.projectId &&
        sceneSettings?.chapterId &&
        !compositionBootstrapRef.current
      ) {
        try {
          compositionBootstrapRef.current = true;
          const comp = await getOrCreateComposition({
            projectId: sceneSettings.projectId,
            chapterId: sceneSettings.chapterId,
            title: sceneSettings.sceneName,
          });
          if (comp) setCompositionId(comp.id);
        } catch (e) {
          console.warn("Failed to initialize composition", e);
        }
      }
      const isCompositeLoad = mode === "composite";
      const targetId = isStoryboard
        ? sceneSettings?.storyboardId
        : isCompositeLoad
        ? compositionId
        : sceneSettings?.shotId;
      if (!targetId) return;
      const { data, doc } = await loadSceneDoc({ mode, targetId });
      if (!data) return;
      if (typeof data.width === "number") setAppliedWidth(data.width);
      if (typeof data.height === "number") setAppliedHeight(data.height);
      if (typeof data.fps === "number") setAppliedFps(data.fps);

      if (!doc) return;

      try {
        if (Array.isArray(doc.rows)) setRows(doc.rows);
        if (typeof doc.frameCount === "number") setFrameCount(doc.frameCount);
        if (doc.timeline?.drawingFrames)
          setDrawingFrames(doc.timeline.drawingFrames);
        if (doc.timeline?.layerOrder) setLayerOrder(doc.timeline.layerOrder);
        if (doc.layers?.folderLayers) setFolderLayers(doc.layers.folderLayers);
        if (doc.layers?.layerStrokes) setLayerStrokes(doc.layers.layerStrokes);
        
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
            const bucket =
              process.env.NEXT_PUBLIC_SCENE_BUCKET || "animation-assets";
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

  // Helper to load an image for export rendering
  const loadImage = useCallback((src: string) => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }, []);

  // Render a specific frame index directly into the provided 2D context (used by export)
  const renderFrameToContext = useCallback(
    async (
      frameIndex: number,
      targetCtx: CanvasRenderingContext2D,
      includeGrid: boolean
    ) => {
      await renderFrameToContextImpl(
        frameIndex,
        targetCtx,
        includeGrid,
        drawingFrames,
        layerOrder,
        layerVisibility,
        layerOpacities,
        layerStrokes
      );
    },
    [drawingFrames, layerOrder, layerVisibility, layerOpacities, layerStrokes]
  );

  // Export handler: defined after drawFrame to avoid hoist ordering issues
  let handleExport = useCallback(() => {}, []);

  // Update drawFrame to render images from drawingFrames
  const drawFrame = useCallback(() => {
    const context = contextRef.current;
    if (!context) return;
    const frameNumber = selectedFrameNumber ? selectedFrameNumber - 1 : null;
    drawFrameImpl(context, {
      frameNumber,
      showGrid,
      drawingFrames,
      layerOrder,
      layerVisibility,
      layerOpacities,
      layerStrokes,
      currentStroke,
      eraserCircle,
      currentTool,
      eraserSize,
      onionSkin,
      zoom,
      panOffset,
      lassoSelection: lassoSelection
        ? { points: lassoSelection.points, isActive: lassoSelection.isActive }
        : null,
      pastePreview,
      isResizing,
      resizeBox,
      imageCache: imageCache.current,
    });
  }, [
    selectedFrameNumber,
    showGrid,
    drawingFrames,
    layerOrder,
    layerVisibility,
    layerOpacities,
    layerStrokes,
    currentStroke,
    eraserCircle,
    currentTool,
    eraserSize,
    onionSkin,
    zoom,
    panOffset,
    lassoSelection,
    pastePreview,
    isResizing,
    resizeBox,
    ]);
 
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
      const currentState = {
        layerStrokes: JSON.parse(JSON.stringify(layerStrokes)),
        folderLayers: JSON.parse(JSON.stringify(folderLayers)),
        drawingFrames: JSON.parse(JSON.stringify(drawingFrames)),
        layerOrder: JSON.parse(JSON.stringify(layerOrder)),
      };
      return [...prev, currentState];
    });
    setRedoStack([]);
  }, [layerStrokes, folderLayers, drawingFrames, layerOrder]);

  const { startDrawing, handleMouseUp } = useCanvasInteractions({
    canvasRef,
    contextRef,
    getCanvasCoords,
    drawFrame,
    zoom,
    panOffset,
    setPanOffset,
    isSpacePressed,
    selectedLayerId,
    currentTool,
    color,
    brushSize,
    eraserSize,
    eraserStyle,
    setIsPanning,
    setIsDrawing,
    setCurrentStroke: (s: any) => setCurrentStroke(s as any),
    generateStrokeId,
    layerStrokes,
    setLayerStrokes: setLayerStrokes as React.Dispatch<React.SetStateAction<Record<string, any[]>>> as any,
    lassoSelection,
    setLassoSelection,
    isResizing,
    resizeBox,
    setResizeBox,
    isDraggingResizeBox,
    setIsDraggingResizeBox,
    dragOffset,
    setDragOffset,
    activeHandle,
    setActiveHandle,
    originalLassoPoints,
    setOriginalLassoPoints,
    originalStrokePositions,
    setOriginalStrokePositions,
    isPanning,
    saveToUndoStack,
    getResizeHandles,
    isPointInPolygon,
    lastErasePointRef,
  });

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
            const bucket =
              process.env.NEXT_PUBLIC_SCENE_BUCKET || "animation-assets";
            const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
            const ts = new Date().toISOString().replace(/[:.]/g, "-");
            // Per-shot frame assets
            const projectPart = `${slugifyName(sceneSettings.projectTitle)}-${
              sceneSettings.projectId
            }`;
            const chapterPart = `${slugifyName(sceneSettings.chapterTitle)}-${
              sceneSettings.chapterId
            }`;
            const sequencePart = `${slugifyName(sceneSettings.sequenceCode)}-${
              sceneSettings.sequenceId
            }`;
            const shotPart = `shot-${slugifyName(sceneSettings.shotCode)}-${
              sceneSettings.shotId
            }`;
            key = `${projectPart}/${chapterPart}/${sequencePart}/${shotPart}/assets/frames/${rowId}/${frameIndex}/${ts}-${safeName}`;
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
  

  

  

  

  

  // Layer management
  

  

  

  

  

  // Layer renaming
  const startEditingLayer = (layerId: string, currentName: string) => {
    setEditingLayer(layerId);
    setEditingName(currentName);
  };

  const saveLayerName = () => {
    if (!editingLayer) return;
    setEditingLayer(null);
    setEditingName("");
  };

  const cancelEditing = () => {
    setEditingLayer(null);
    setEditingName("");
  };

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

  // Install shortcuts after handlers are defined below (using layout effect pattern)



  // Update current layer when selectedLayerId changes (from sidebar)

  // Auto-select the first layer on new scene creation
  useEffect(() => {
    // If there's exactly one frame (the default background) and nothing is selected
    if (drawingFrames.length === 1 && !selectedLayerId) {
      const firstFrame = drawingFrames[0];
      const firstLayerId = `${firstFrame.rowId}-${firstFrame.frameIndex}-main`;
      setSelectedLayerId(firstLayerId);
      // Ensure the timeline selection mirrors the default selection
      setSelectedRow(firstFrame.rowId);
      setSelectedFrameNumber(firstFrame.frameIndex + 1);
      // Trigger an initial draw if the canvas is ready
      requestAnimationFrame(() => drawFrame());
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

    const parts = frameFolderId.split("-");
    // folderId format is `row-<n>-<frameIndex>`
    const rowId = `${parts[0]}-${parts[1]}`;
    const frameIndex = parseInt(parts[2], 10);

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

  const reorderFrameFolder = (folderId: string, direction: "up" | "down") => {
    setDrawingFrames((prev) => {
      if (!Array.isArray(prev) || prev.length === 0) return prev;

      // folderId is `${rowId}-${frameIndex}` where rowId looks like `row-1`
      const parts = folderId.split("-");
      if (parts.length < 3) return prev;
      const rowId = `${parts[0]}-${parts[1]}`;
      const frameIndex = parseInt(parts[2], 10);

      // indices of all folders sharing the same frameIndex (z-order for that frame)
      const indicesInFrame: number[] = [];
      prev.forEach((df, i) => {
        if (df.frameIndex === frameIndex) indicesInFrame.push(i);
      });

      const currentAbsoluteIndex = prev.findIndex(
        (df) => df.rowId === rowId && df.frameIndex === frameIndex
      );
      if (currentAbsoluteIndex === -1) return prev;

      const position = indicesInFrame.indexOf(currentAbsoluteIndex);
      if (position === -1) return prev;

      const targetPos = direction === "up" ? position - 1 : position + 1;
      if (targetPos < 0 || targetPos >= indicesInFrame.length) return prev; // no-op at edges

      const swapA = indicesInFrame[position];
      const swapB = indicesInFrame[targetPos];
      const next = [...prev];
      [next[swapA], next[swapB]] = [next[swapB], next[swapA]];
      return next;
    });
    saveToUndoStack();
  };

  const moveFrameFolderUp = (folderId: string) =>
    reorderFrameFolder(folderId, "up");
  const moveFrameFolderDown = (folderId: string) =>
    reorderFrameFolder(folderId, "down");

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

  // Keyboard shortcuts will be installed after pasteFromClipboard is defined

  const pasteFromClipboard = useCallback(() => {
    if (clipboard && selectedLayerId) {
      setPastePreview(clipboard);
      setLassoSelection(null); // Clear any existing selection
      handleCloseContextMenu();
    }
  }, [clipboard, selectedLayerId]);

  // Now that handlers exist, install keyboard shortcuts
  useKeyboardShortcuts({
    onUndo: undo,
    onRedo: redo,
    onSpaceDown: () => setIsSpacePressed(true),
    onSpaceUp: () => setIsSpacePressed(false),
    onCopy: handleCopySelectedStrokes,
    onPaste: pasteFromClipboard,
    onEnter: () => {
      if (isResizing) handleConfirmResize();
    },
  });

  const {
    handleResizeClick,
    handleConfirmResize,
    showContextMenuForSelection,
  } = useResizeHandlers({
    canvasRef,
    setContextMenu,
    lassoSelection,
    selectedLayerId,
    layerStrokes,
    setLayerStrokes: setLayerStrokes as React.Dispatch<React.SetStateAction<Record<string, any[]>>> as any,
    setLassoSelection,
    handleCloseContextMenu,
    setIsResizing,
    setResizeBox,
    saveToUndoStack,
    setActiveHandle,
    setIsDraggingResizeBox,
  });

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


  // Now that drawFrame exists, define export using it
  handleExport = useCallback(async () => {
    try {
      await runExport({
        width: appliedWidth,
        height: appliedHeight,
        renderFrameToContext,
        exportFormat,
        exportDirHandle,
        exportFolderName,
        exportRowAllFrames,
        selectedRow,
        selectedFrameNumber,
        drawingFrames,
      });
      setIsExportOpen(false);
    } catch (e) {
      console.warn("Export failed", e);
    }
  }, [
    appliedWidth,
    appliedHeight,
    renderFrameToContext,
    exportFormat,
    exportDirHandle,
    exportFolderName,
    exportRowAllFrames,
    selectedRow,
    selectedFrameNumber,
    drawingFrames,
  ]);

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
      {/* Top Navigation */}
      <TopBar
        mode={mode}
        sceneSettings={sceneSettings}
        nameOverride={nameOverride}
        onBack={() => onViewChange("project-detail")}
        undo={undo}
        redo={redo}
        undoDisabled={undoStack.length === 0}
        redoDisabled={redoStack.length === 0}
        zoom={zoom}
        onZoomIn={() => setZoom((prev) => Math.min(3, prev + 0.1))}
        onZoomOut={() => setZoom((prev) => Math.max(0.5, prev - 0.1))}
        onZoomReset={() => setZoom(1)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onSave={saveScene}
        isSaving={isSaving}
      />

      <div className="flex flex-1 min-h-0 relative">
        {/* Collapsible Toolbar - hidden in compositing mode */}
        {mode !== "composite" && (
          <div
            className="relative flex items-stretch"
            onMouseEnter={() => setIsHoveringToolbar(true)}
            onMouseLeave={() => setIsHoveringToolbar(false)}
          >
            <ToolSidebar
              visible={true}
              tools={tools as any}
              currentTool={currentTool}
              setCurrentTool={(t) => {
                setCurrentTool(t as any);
                if (t !== "move") {
                  setLassoSelection(null);
                  setOriginalLassoPoints([]);
                  setOriginalStrokePositions({});
                  setIsSelecting(false);
                  setIsDragging(false);
                }
                if (t !== "eraser") {
                  setEraserCircle(null);
                }
              }}
              onionSkin={onionSkin}
              setOnionSkin={(v) => {
                setOnionSkin(v);
                drawFrame();
              }}
              showGrid={showGrid}
              setShowGrid={setShowGrid}
            />

            <ExportModal
              open={isExportOpen}
              onClose={() => setIsExportOpen(false)}
              exportFolderName={exportFolderName}
              setExportFolderName={setExportFolderName}
              exportNameScheme={exportNameScheme}
              setExportNameScheme={setExportNameScheme}
              exportFormat={exportFormat}
              setExportFormat={setExportFormat}
              exportLayersMerge={exportLayersMerge}
              setExportLayersMerge={setExportLayersMerge}
              exportRowAllFrames={exportRowAllFrames}
              setExportRowAllFrames={setExportRowAllFrames}
              mode={mode}
              setExportDirHandle={setExportDirHandle}
              onExport={handleExport}
            />

            <SettingsPanel
              visible={
                (isHoveringToolbar || isColorPickerOpen) &&
                currentTool !== "move"
              }
              currentTool={currentTool as string}
              brushSize={brushSize}
              setBrushSize={(n) => setBrushSize(n)}
              color={color}
              setColor={(c) => setColor(c)}
              isColorPickerOpen={isColorPickerOpen}
              setIsColorPickerOpen={setIsColorPickerOpen}
              customColorSets={customColorSets}
              setCustomColorSets={setCustomColorSets}
              newSetName={newSetName}
              setNewSetName={setNewSetName}
              isCreatingSet={isCreatingSet}
              setIsCreatingSet={setIsCreatingSet}
              eraserStyle={eraserStyle}
              setEraserStyle={setEraserStyle}
              eraserSize={eraserSize}
              setEraserSize={setEraserSize}
            />
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Canvas Area - now scrollable with fixed timeline space */}
          <div
            className="flex-1 bg-gray-900 flex items-center justify-center p-4 min-h-0 overflow-auto"
            style={{ paddingBottom: "280px" }}
          >
            {/* Canvas viewport (hidden in composite mode per current behavior) */}
            <CanvasViewport
              show={mode !== "composite"}
              panX={panOffset.x}
              panY={panOffset.y}
              canvasRef={canvasRef}
              onDragOver={(e) => e.preventDefault()}
              onDrop={async (e) => {
                e.preventDefault();
                const file = e.dataTransfer?.files?.[0];
                if (!file || !file.type.startsWith("image/")) return;
                // Determine current folder from selectedLayerId
                const folderId = getActiveFrameFolderId(selectedLayerId || "");
                if (!folderId) {
                  // If none selected, create a new folder and use its main layer
                  const targetRowId = selectedRow || "row-1";
                  const rowFrames = drawingFrames.filter(
                    (df) => df.rowId === targetRowId
                  );
                  const nextIndex =
                    rowFrames.length > 0
                      ? Math.max(...rowFrames.map((f) => f.frameIndex)) + 1
                      : 0;
                  const newFolderId = `${targetRowId}-${nextIndex}`;
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
                  setLayerOrder((prev) => ({
                    ...prev,
                    [newFolderId]: [`${newFolderId}-main`],
                  }));
                  setFolderLayers((prev) => ({
                    ...prev,
                    [newFolderId]: [],
                  }));
                  setOpenFolders((prev) => ({
                    ...prev,
                    [newFolderId]: true,
                  }));
                  setSelectedLayerId(`${newFolderId}-main`);
                }

                const activeFolderId =
                  getActiveFrameFolderId(selectedLayerId || "") ||
                  (() => {
                    const targetRowId = selectedRow || "row-1";
                    const rowFrames = drawingFrames.filter(
                      (df) => df.rowId === targetRowId
                    );
                    const idx =
                      rowFrames.length > 0
                        ? Math.max(...rowFrames.map((f) => f.frameIndex)) + 1
                        : 0;
                    return `${targetRowId}-${idx}`;
                  })();

                // Ensure a new extra layer is created for this image (compute index deterministically)
                let newLayerId = "";
                setFolderLayers((prev) => {
                  const current = prev[activeFolderId] || [];
                  newLayerId = `${activeFolderId}-extra-${current.length}`;
                  const baseName = file.name.replace(/\.[^/.]+$/, "");
                  return {
                    ...prev,
                    [activeFolderId]: [
                      ...current,
                      baseName || `Untitled.${current.length + 1}`,
                    ],
                  } as any;
                });
                setLayerOrder((prev) => {
                  const base = prev[activeFolderId] || [
                    `${activeFolderId}-main`,
                  ];
                  return {
                    ...prev,
                    [activeFolderId]: [...base, newLayerId],
                  } as any;
                });

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
                const enableStorage =
                  process.env.NEXT_PUBLIC_ENABLE_SCENE_STORAGE === "true";
                if (
                  enableStorage &&
                  sceneSettings?.projectId &&
                  sceneSettings?.chapterId &&
                  sceneSettings?.sequenceId
                ) {
                  try {
                    const bucket =
                      process.env.NEXT_PUBLIC_SCENE_BUCKET ||
                      "animation-assets";
                    const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
                    const ts = new Date().toISOString().replace(/[:.]/g, "-");
                    const projectPart = `${slugifyName(
                      sceneSettings.projectTitle
                    )}-${sceneSettings.projectId}`;
                    const chapterPart = `${slugifyName(
                      sceneSettings.chapterTitle
                    )}-${sceneSettings.chapterId}`;
                    if (mode === "storyboard") {
                      const sbId = sceneSettings?.storyboardId || "unknown";
                      key = `${projectPart}/${chapterPart}/storyboard-${sbId}/assets/pages/${activeFolderId}/${ts}-${safeName}`;
                    } else {
                      const sequencePart = `${slugifyName(
                        sceneSettings.sequenceCode
                      )}-${sceneSettings.sequenceId}`;
                      const shotPart = `shot-${slugifyName(
                        sceneSettings.shotCode
                      )}-${sceneSettings.shotId || "unknown"}`;
                      key = `${projectPart}/${chapterPart}/${sequencePart}/${shotPart}/assets/pages/${activeFolderId}/${ts}-${safeName}`;
                    }
                    const { error: upErr } = await supabase.storage
                      .from(bucket)
                      .upload(key, file, {
                        upsert: true,
                        contentType: file.type,
                      });
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

                // Attach to drawingFrames cell representing this folder's page (for preview)
                setDrawingFrames((prev) => {
                  const parts = activeFolderId.split("-");
                  const rowId = `${parts[0]}-${parts[1]}`;
                  const frameIndex = parseInt(parts[2]);
                  const exists = prev.find(
                    (df) => df.rowId === rowId && df.frameIndex === frameIndex
                  );
                  if (exists) {
                    return prev.map((df) =>
                      df.rowId === rowId && df.frameIndex === frameIndex
                        ? { ...df, imageUrl }
                        : df
                    );
                  }
                  return [
                    ...prev,
                    {
                      rowId,
                      frameIndex,
                      length: 1,
                      imageUrl,
                      fileName: "",
                    },
                  ];
                });

                // Record key for re-signing later
                if (key) {
                  const parts = activeFolderId.split("-");
                  const rowKey = `${parts[0]}-${parts[1]}`;
                  const frameKey = parseInt(parts[2]);
                  setFrameAssetKeys((prev) => ({
                    ...prev,
                    [`${rowKey}|${frameKey}`]: key,
                  }));
                }

                setSelectedLayerId(newLayerId);
                setSelectedFrameNumber(
                  parseInt(activeFolderId.split("-")[2]) + 1
                );
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
                const now = Date.now();
                if (now - lastWheelTime < 16) return;
                setLastWheelTime(now);
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
              isPanning={isPanning}
            />
          </div>

          {/* Context Menu */}
          <CtxMenu
            visible={contextMenu.visible && !!lassoSelection?.isActive}
            x={contextMenu.x}
            y={contextMenu.y}
            onCut={handleCutSelectedStrokes}
            onCopy={handleCopySelectedStrokes}
            onDelete={handleDeleteSelectedStrokes}
            onDuplicate={handleDuplicateSelectedStrokes}
            onResize={handleResizeClick}
          />

          {/* Timeline - hidden in storyboard mode */}
          {mode !== "storyboard" && (
            <TimelineDock
              rows={rows}
              setRows={setRows}
              frameCount={frameCount}
              setFrameCount={setFrameCount as any}
              drawingFrames={drawingFrames}
              setDrawingFrames={setDrawingFrames as any}
              selectedRow={selectedRow}
              setSelectedRow={setSelectedRow as any}
              selectedLayerId={selectedLayerId}
              setSelectedLayerId={setSelectedLayerId as any}
              selectedFrameNumber={selectedFrameNumber}
              setSelectedFrameNumber={setSelectedFrameNumber as any}
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
          )}
        </div>

        <LayersPanel
          mode={mode}
          selectedLayerId={selectedLayerId}
          setSelectedLayerId={setSelectedLayerId}
          selectedRow={selectedRow}
          sidebarFolders={sidebarFolders as any}
          openFolders={openFolders}
          setOpenFolders={(fn) => setOpenFolders(fn as any)}
          layerOpacities={layerOpacities}
          setLayerOpacities={(fn) => setLayerOpacities(fn as any)}
          folderLayers={folderLayers}
          layerOrder={layerOrder}
          layerVisibility={layerVisibility}
          handleSidebarSelection={handleSidebarSelection}
          handleToggleVisibility={handleToggleVisibility}
          toggleFolder={toggleFolder}
          handleAddLayer={handleAddLayer}
          moveLayer={moveLayer}
          moveFrameFolderUp={moveFrameFolderUp}
          moveFrameFolderDown={moveFrameFolderDown}
          addFolder={addFolder}
          deleteSelectedFolder={deleteSelectedFolder}
          editingFolderId={editingFolderId}
          setEditingFolderId={setEditingFolderId}
          editingFolderValue={editingFolderValue}
          setEditingFolderValue={setEditingFolderValue}
          folderNames={folderNames}
          setFolderNames={setFolderNames}
          editingLayerName={editingLayerName}
          editingLayerValue={editingLayerValue}
          handleSaveRename={handleSaveRename}
          handleCancelRename={handleCancelRename}
        />
      </div>

      <EditorSettingsModal
        open={isSettingsOpen}
        mode={mode}
        draftName={draftName}
        canEditName={mode !== "composite"}
        draftWidth={draftWidth}
        draftHeight={draftHeight}
        draftFps={draftFps}
        onChangeName={setDraftName}
        onChangeWidth={(v) => setDraftWidth(v)}
        onChangeHeight={(v) => setDraftHeight(v)}
        onChangeFps={(v) => setDraftFps(v)}
        onApply={async () => {
          setAppliedWidth(draftWidth);
          setAppliedHeight(draftHeight);
          setAppliedFps(draftFps);
          setNameOverride(draftName);
          try {
            if (mode === "storyboard" && sceneSettings?.sequenceId) {
              await supabase
                .from("sequences")
                .update({ code: draftName })
                .eq("id", sceneSettings.sequenceId);
            } else if (mode !== "storyboard" && sceneSettings?.shotId) {
              await supabase
                .from("shots")
                .update({ code: draftName })
                .eq("id", sceneSettings.shotId);
            }
          } catch (e) {
            console.warn("Failed to update name in DB", e);
          }
          setIsSettingsOpen(false);
        }}
        onCancel={() => setIsSettingsOpen(false)}
        showDeleteShot={mode === "animate" && !!sceneSettings?.shotId}
        onDeleteShot={async () => {
          if (!sceneSettings?.shotId) return;
          try {
            await supabase
              .from("shots")
              .delete()
              .eq("id", sceneSettings.shotId);
            setIsSettingsOpen(false);
            setConfirmDeleteOpen(false);
            onViewChange("project-detail");
          } catch (e) {
            console.error("Failed to delete shot", e);
          }
        }}
        showDeleteComposition={mode === "composite"}
        onDeleteComposition={async () => {
          try {
            if (mode === "composite" && compositionId) {
              await supabase
                .from("compositions")
                .delete()
                .eq("id", compositionId);
            }
          } catch (e) {
            console.error("Failed to delete composition", e);
          } finally {
            setIsSettingsOpen(false);
            setConfirmDeleteOpen(false);
            onViewChange("project-detail");
          }
        }}
      />
    </div>
  );
}
