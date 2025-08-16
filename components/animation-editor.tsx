"use client";

//

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";

import { Pencil, Palette, Eraser, Move, RotateCcw } from "lucide-react";
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
import {
  makeRenderFrameToContext,
  exportAnimation as exportAnimationHelper,
} from "@/lib/editor/export-bindings";
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
import useAssetDrop from "@/hooks/useAssetDrop";
import useFolders, { getActiveFrameFolderId } from "@/hooks/useFolders";
import useUndoRedo from "@/hooks/useUndoRedo";
import usePlayback from "@/hooks/usePlayback";
import useLayersSidebar from "@/hooks/useLayersSidebar";
import useSelectionActions from "@/hooks/useSelectionActions";
import {
  processImageWithEffects,
  type AssetEffects,
} from "@/lib/utils/color-effects";
import useSceneLoader from "@/hooks/useSceneLoader";
import useCanvasSetup from "@/hooks/useCanvasSetup";
import useColorSets from "@/hooks/useColorSets";
import useLayerUiHandlers from "@/hooks/useLayerUiHandlers";
import useDrawHelpers from "@/hooks/useDrawHelpers";
import { detectImageSequence } from "@/lib/utils/tga-utils";

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

// getActiveFrameFolderId imported from hooks/useFolders

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

  // File import
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const layersPanelRef = React.useRef<any>(null);
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
  const [compositionByFolder, setCompositionByFolder] = useState<
    Record<string, { width: number; height: number; fps: number }>
  >({});
  const compCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [compSelectedAssetIndex, setCompSelectedAssetIndex] = useState<
    number | null
  >(null);
  const [compSelectedAssetFolderId, setCompSelectedAssetFolderId] = useState<
    string | null
  >(null);
  // Per-asset rotation: key `${folderId}|${index}` (index is 0-based row position)
  const [rotationByAsset, setRotationByAsset] = useState<
    Record<string, number>
  >({});
  const [compImageBounds, setCompImageBounds] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [boundsByAsset, setBoundsByAsset] = useState<
    Record<string, { x: number; y: number; width: number; height: number }>
  >({});

  const [fittedCompByFolder, setFittedCompByFolder] = useState<
    Record<string, boolean>
  >({});
  const outlineRef = useRef<HTMLDivElement | null>(null);
  const [isRotating, setIsRotating] = useState<boolean>(false); // rotate mode (show handle)
  const [isRotatingDrag, setIsRotatingDrag] = useState<boolean>(false); // currently dragging
  const rotationDragOffsetRef = useRef<number>(0);
  const [rotationPreviewDeg, setRotationPreviewDeg] = useState<number | null>(
    null
  );
  const rotationPreviewRef = useRef<number | null>(null);
  const resizeLiveBoundsRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const moveLiveBoundsRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [isMovingAsset, setIsMovingAsset] = useState(false);

  // moved below after drawingFrames declaration

  const normalizeAngle = (deg: number) => {
    let d = deg % 360;
    if (d < 0) d += 360;
    return d;
  };

  // (moved below drawingFrames declaration)
  const imageCache = useRef<Record<string, HTMLImageElement>>({});

  // Asset effects (color key, color keep, etc.) - keyed by asset identity
  const [assetEffects, setAssetEffects] = useState<
    Record<string, AssetEffects>
  >({});

  const [isLooping, setIsLooping] = useState(false);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
  });

  useEffect(() => {
    const onError = (ev: any) => {};
    const onRejection = (ev: any) => {};
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {};
  }, [mode, sceneSettings]);
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

  // Helper function to find composition folder ID from timeline cell ID
  const findCompositionFolder = (layerId: string): string | null => {
    if (!layerId) return null;
    // Extract row and frame from layerId (e.g., "row-2-1" -> row: "row-2", frame: 1)
    const parts = layerId.split("-");
    if (parts.length < 3) return null;
    const rowId = `${parts[0]}-${parts[1]}`;
    const frameNumber = parseInt(parts[2], 10); // 1-based frame number from timeline
    const frameIndex = frameNumber; // Convert to 0-based for timeline position

    // Find a drawing frame that covers this timeline position
    // The frame covers this position if frameIndex is within its range
    const matchingFrame = drawingFrames.find((df) => {
      if (df.rowId !== rowId) return false;

      // Get the effective start frame (use startFrame if available, otherwise frameIndex)
      const startFrame = df.startFrame ?? df.frameIndex;
      const endFrame = startFrame + df.length - 1;

      // Check if the timeline position falls within this frame's range
      return frameIndex >= startFrame && frameIndex <= endFrame;
    });

    return matchingFrame?.folderId || null;
  };

  const [rows, setRows] = useState([
    { id: "row-1", name: "Row1" },
    { id: "row-2", name: "Row2" },
  ]);
  const [frameCount, setFrameCount] = useState(20);
  const [drawingFrames, setDrawingFrames] = useState<DrawingFrame[]>(() => {
    if (mode === "composite") {
      // Compositing starts with no folders; user adds Assets folders explicitly
      return [];
    }
    // Default for animate/storyboard
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

  // Stable key for per-asset rotation that survives reordering: folderId + fileName
  const selectedAssetKey = useMemo(() => {
    if (compSelectedAssetFolderId == null || compSelectedAssetIndex == null)
      return null;
    const df = drawingFrames.find(
      (d) =>
        (d as any).folderId === compSelectedAssetFolderId &&
        d.frameIndex === 0 &&
        parseInt(d.rowId.split("-")[1], 10) === compSelectedAssetIndex + 1
    );
    if (!df) return null;

    // For sequence frames, use only the folderId as the key to ensure
    // transformations are shared across all frames in the sequence
    if (df.isSequenceFrame) {
      return compSelectedAssetFolderId;
    }

    // For single images, use the traditional folderId|fileName format
    const identity = df.fileName || df.imageUrl || null;
    return identity ? `${compSelectedAssetFolderId}|${identity}` : null;
  }, [compSelectedAssetFolderId, compSelectedAssetIndex, drawingFrames]);

  // Draw compositing canvas: render all assets for the active composition in row order (stacked)
  useEffect(() => {
    if (mode !== "composite") return;
    // Use selectedLayerId directly as the active folder ID
    const activeFolderId = selectedLayerId;
    if (!activeFolderId) return;
    const comp = compositionByFolder[activeFolderId];
    if (!comp || !compCanvasRef.current) return;
    const ctx = compCanvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, comp.width, comp.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, comp.width, comp.height);

    // Get the current frame index (0-based) from selectedFrameNumber (1-based)
    const currentFrameIndex = selectedFrameNumber ? selectedFrameNumber - 1 : 0;

    const assetsToDraw = drawingFrames
      .filter((df) => {
        if (df.folderId !== activeFolderId) return false;

        // Get the effective start frame
        const startFrame = df.startFrame ?? df.frameIndex;

        // For frames with length > 1 (extended frames), check if current frame is within the range
        if (df.length && df.length > 1) {
          return (
            currentFrameIndex >= startFrame &&
            currentFrameIndex < startFrame + df.length
          );
        }

        // For regular frames and sequence frames, only show when frame matches exactly
        return df.frameIndex === currentFrameIndex;
      })
      .sort((a, b) => {
        const ra = parseInt(a.rowId.split("-")[1], 10);
        const rb = parseInt(b.rowId.split("-")[1], 10);
        return ra - rb;
      });

    // Ensure the currently selected asset draws on top during interactions to avoid visual 'glitching'
    const arrangedToDraw = (() => {
      if (!selectedAssetKey || !isMovingAsset) return assetsToDraw;

      const isSelected = (cell: any) => {
        // Use the same key logic as in the drawing loop
        const identity =
          cell.isSequenceFrame && cell.folderId
            ? cell.folderId
            : `${activeFolderId}|${cell.fileName || cell.imageUrl || ""}`;
        return identity === selectedAssetKey;
      };
      const nonSelected = assetsToDraw.filter((c) => !isSelected(c));
      const selectedOnly = assetsToDraw.filter((c) => isSelected(c));
      return [...nonSelected, ...selectedOnly];
    })();

    const drawSynchronously = async () => {
      // First, preload all images to avoid flicker during drawing
      const imagePromises = arrangedToDraw
        .filter((cell) => cell.imageUrl)
        .map((cell) => {
          return new Promise<{ cell: any; img: HTMLImageElement }>(
            (resolve, reject) => {
              const imageUrl = cell.imageUrl as string;

              // Check cache first
              const cachedImg = imageCache.current[imageUrl];
              if (cachedImg && cachedImg.complete) {
                resolve({ cell, img: cachedImg });
                return;
              }

              // Load and cache image
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.onload = () => {
                imageCache.current[imageUrl] = img;
                resolve({ cell, img });
              };
              img.onerror = reject;
              img.src = imageUrl;
            }
          );
        });

      try {
        // Wait for all images to load before drawing any of them
        const loadedImages = await Promise.all(imagePromises);

        // Clear canvas once
        ctx.clearRect(0, 0, comp.width, comp.height);

        // Draw all images synchronously in the correct order (back to front)
        for (const { cell, img } of loadedImages) {
          // For sequence frames, use folderId as the transformation key to ensure
          // transformations persist across all frames in the sequence
          const identity =
            cell.isSequenceFrame && cell.folderId
              ? cell.folderId
              : `${activeFolderId}|${cell.fileName || cell.imageUrl || ""}`;

          const persisted = boundsByAsset[identity];
          const defaultX = Math.round((comp.width - img.naturalWidth) / 2);
          const defaultY = Math.round((comp.height - img.naturalHeight) / 2);
          const x = persisted ? persisted.x : defaultX;
          const y = persisted ? persisted.y : defaultY;
          const drawW = persisted ? persisted.width : img.naturalWidth;
          const drawH = persisted ? persisted.height : img.naturalHeight;
          const key = identity;
          const deg = rotationByAsset[key] ?? 0;

          // Apply color effects if any are set for this asset
          const effects = assetEffects[identity];
          console.log('Asset identity and effects:', { identity, effects, fileName: cell.fileName, imageUrl: cell.imageUrl });
          let imageToRender = img;

          if (
            effects &&
            (effects.colorKey?.enabled ||
              effects.colorKeep?.enabled ||
              effects.fill?.enabled)
          ) {
            // Process image with effects
            const processedCanvas = processImageWithEffects(ctx, img, effects);
            imageToRender = processedCanvas as any; // Canvas can be drawn like an image
          }

          if (deg !== 0) {
            ctx.save();
            // rotate around the image center
            const cx = x + drawW / 2;
            const cy = y + drawH / 2;
            ctx.translate(cx, cy);
            ctx.rotate((deg * Math.PI) / 180);
            ctx.translate(-cx, -cy);
            ctx.drawImage(imageToRender, x, y, drawW, drawH);
            ctx.restore();
          } else {
            ctx.drawImage(imageToRender, x, y, drawW, drawH);
          }
        }
      } catch (error) {
        console.error("Error loading images for frame:", error);
      }
    };

    drawSynchronously();
  }, [
    mode,
    selectedLayerId,
    selectedFrameNumber,
    compositionByFolder,
    drawingFrames,
    rotationByAsset,
    boundsByAsset,
    assetEffects,
  ]);

  // In compositing mode we allow creating folders without timeline cells.
  // We keep a list of placeholder folder ids (e.g., `row-1-0`) that are
  // visible in the Assets panel but don't render in the timeline until an
  // asset is added to the folder.
  const [compositeFolderIds, setCompositeFolderIds] = useState<string[]>([]);
  const [compRowCountByFolder, setCompRowCountByFolder] = useState<
    Record<string, number>
  >({});

  const maxFrame = useMemo(() => {
    if (drawingFrames.length === 0) {
      return 1;
    }
    // Find the last frame index that has content, considering extended frames
    return Math.max(
      1,
      ...drawingFrames.map((df) => {
        const startFrame = df.startFrame ?? df.frameIndex;
        return startFrame + df.length;
      })
    );
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

  useSceneLoader({
    mode,
    sceneSettings,
    compositionId,
    setCompositionId,
    setAppliedWidth,
    setAppliedHeight,
    setAppliedFps,
    setRows,
    setFrameCount,
    setDrawingFrames,
    setLayerOrder,
    setFolderLayers,
    setLayerStrokes,
    setCurrentFrame: (v: any) => {},
    setSelectedRow,
    setZoom,
    setOnionSkin,
    setShowGrid,
    setFolderNames,
    setFrameAssetKeys,
  });

  // Set initial current layer

  // drawFrame is defined below; pass a stable placeholder and update via ref if needed
  const drawFrameRef = useRef<() => void>(() => {});
  const { getCanvasCoords } = useCanvasSetup({
    canvasRef,
    contextRef,
    appliedWidth,
    appliedHeight,
    color,
    brushSize,
    zoom,
    drawFrame: () => drawFrameRef.current(),
  });

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

  // Use shared draw helpers implementation
  const { drawStrokes } = useDrawHelpers({ contextRef });
  const drawFrameLayers = useCallback(
    (layers: Layer[], isOnionSkin = false) => {
      layers.forEach((layer) => {
        const layerId = layer.id;
        const isVisible = layerVisibility[layerId] !== false;
        if (!isVisible) return;
        const context = contextRef.current;
        if (!context) return;
        const opacity = isOnionSkin
          ? (layerOpacities[layerId] ?? 1) * 0.3
          : layerOpacities[layerId] ?? 1;
        context.globalAlpha = opacity;
        drawStrokes(layer.strokes as any);
      });
      Object.entries(layerStrokes).forEach(([layerId, strokes]) => {
        const isVisible = layerVisibility[layerId] !== false;
        if (!isVisible) return;
        const context = contextRef.current;
        if (!context) return;
        const opacity = isOnionSkin
          ? (layerOpacities[layerId] ?? 1) * 0.3
          : layerOpacities[layerId] ?? 1;
        context.globalAlpha = opacity;
        drawStrokes(strokes as any);
      });
      if (contextRef.current && !isOnionSkin)
        contextRef.current.globalAlpha = 1;
    },
    [layerVisibility, layerOpacities, layerStrokes, drawStrokes]
  );

  // Helper to load an image for export rendering
  const loadImage = useCallback(
    (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      }),
    []
  );

  // Render a specific frame index directly into the provided 2D context (used by export)
  const renderFrameToContext = useMemo(
    () =>
      makeRenderFrameToContext({
        drawingFrames,
        layerOrder,
        layerVisibility,
        layerOpacities,
        layerStrokes,
      }),
    [drawingFrames, layerOrder, layerVisibility, layerOpacities, layerStrokes]
  );

  // Export handler: defined after drawFrame to avoid hoist ordering issues
  let handleExport = useCallback(() => {}, []);

  // Update drawFrame to render images from drawingFrames
  const drawFrame = useCallback(() => {
    const context = contextRef.current;
    if (!context) return;
    const frameNumber = selectedFrameNumber
      ? selectedFrameNumber - 1
      : mode === "storyboard"
      ? 0
      : null;
    //
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
  drawFrameRef.current = drawFrame;

  useEffect(() => {
    drawFrame();
  }, [selectedFrameNumber, layerVisibility, drawFrame]);

  // Preload frame images into cache whenever drawingFrames change
  useEffect(() => {
    const urls = new Set<string>();
    drawingFrames.forEach((df) => {
      if (df.imageUrl) urls.add(df.imageUrl);
    });
    const signedMarker = "/storage/v1/object/sign/";
    urls.forEach((url) => {
      if (imageCache.current[url]) return;
      // If it's a signed URL, try to fetch via Storage API first to avoid 400 noise
      if (url.includes(signedMarker)) {
        const df = drawingFrames.find((f) => f.imageUrl === url);
        if (!df) return;
        (async () => {
          try {
            const cellKey = `${df.rowId}|${df.frameIndex}`;
            const assetKey = frameAssetKeys[cellKey];
            const bucket =
              process.env.NEXT_PUBLIC_SCENE_BUCKET || "animation-assets";
            let downloadKey: string | null = null;
            if (assetKey) {
              downloadKey = assetKey;
            } else {
              const afterSign = url.split(signedMarker)[1] || "";
              const pathWithToken = afterSign.split("?")[0] || "";
              downloadKey = pathWithToken.startsWith(`${bucket}/`)
                ? pathWithToken.slice(bucket.length + 1)
                : pathWithToken;
            }
            if (downloadKey) {
              const { data, error } = await supabase.storage
                .from(bucket)
                .download(downloadKey);
              if (!error && data) {
                const blobUrl = URL.createObjectURL(data);
                setDrawingFrames((prev) =>
                  prev.map((f) =>
                    f.rowId === df.rowId && f.frameIndex === df.frameIndex
                      ? { ...f, imageUrl: blobUrl }
                      : f
                  )
                );
                const blobImg = new Image();
                blobImg.onload = () => {
                  imageCache.current[blobUrl] = blobImg;
                  drawFrame();
                };
                blobImg.crossOrigin = "anonymous";
                blobImg.src = blobUrl;
                return;
              }
            }
            // If we couldn't download, silently skip; the frame will render without BG
          } catch {}
        })();
      } else {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          imageCache.current[url] = img;
          drawFrame();
        };
        img.onerror = () => {};
        img.src = url;
      }
    });
  }, [drawingFrames, drawFrame]);

  const { handleSidebarSelection, handleToggleVisibility } = useLayerUiHandlers(
    {
      mode,
      setSelectedLayerId: (id: string) => {
        setSelectedLayerId(id);
        // In compositing, clicking a folder should also switch the timeline
        // to that folder's frame context. If no frame exists yet (placeholder),
        // clear selection so grid shows empty.
        //
        // IMPORTANT: Only apply this for direct folder selections, NOT timeline cell clicks.
        // Timeline cell clicks should preserve the clicked frame number.
        if (mode === "composite") {
          const parts = id.split("-");
          if (parts.length >= 3) {
            const frameNumber = parseInt(parts[2], 10);
            // Only reset to F1 for composition folder selections (id ends with -0)
            // Timeline cell clicks (id ends with -1, -2, etc.) should NOT trigger this reset
            if (frameNumber === 0) {
              const existsAtF1 = drawingFrames.some(
                (df) => (df as any).folderId === id && df.frameIndex === 0
              );
              setSelectedFrameNumber(existsAtF1 ? 1 : null);
            }
            // For timeline cell clicks (frameNumber > 0), don't override the frame
          } else {
            setSelectedFrameNumber(null);
          }
        }
      },
      setSelectedFrameNumber,
      setLayerVisibility,
    }
  );

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

  // Undo/Redo functions (base save)
  const saveToUndoStackBase = useCallback(() => {
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
    setLayerStrokes: setLayerStrokes as React.Dispatch<
      React.SetStateAction<Record<string, any[]>>
    > as any,
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
    saveToUndoStack: saveToUndoStackBase,
    getResizeHandles,
    isPointInPolygon,
    lastErasePointRef,
  });

  const { handleDrop } = useAssetDrop({
    sceneSettings,
    setFrameAssetKeys,
    setDrawingFrames,
    setSelectedLayerId,
    setSelectedFrameNumber,
    saveToUndoStack: saveToUndoStackBase,
  });

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
      saveToUndoStackBase();
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

    setTimeout(() => saveToUndoStackBase(), 0);
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
    saveToUndoStackBase,
  ]);

  const {
    handlePlayPause,
    handlePrevFrame,
    handleNextFrame,
    handleFirstFrame,
    handleLastFrame,
    handleToggleLoop,
  } = usePlayback({
    isPlaying,
    setIsPlaying,
    isLooping,
    maxFrame,
    appliedFps,
    setSelectedFrameNumber,
  });

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
  const exportAnimation = () => exportAnimationHelper(canvasRef.current);

  const {
    saveToUndoStack: saveToUndoStackFromHook,
    undo,
    redo,
  } = useUndoRedo({
    undoStack,
    setUndoStack,
    redoStack,
    setRedoStack,
    layerStrokes,
    setLayerStrokes,
    folderLayers,
    setFolderLayers,
    drawingFrames,
    setDrawingFrames,
    layerOrder,
    setLayerOrder,
  });

  const {
    addFolder,
    deleteSelectedFolder,
    moveFrameFolderUp: moveFrameFolderUpFromHook,
    moveFrameFolderDown: moveFrameFolderDownFromHook,
    deleteFrameByFolderId,
    deleteRowById,
  } = useFolders({
    drawingFrames,
    setDrawingFrames,
    setLayerStrokes,
    setFolderLayers,
    setLayerOrder,
    setOpenFolders,
    setSelectedLayerId,
    setSelectedFrameNumber,
    setRows,
    setSelectedRow,
    saveToUndoStack: saveToUndoStackFromHook,
    selectedRow,
    selectedLayerId,
    mode,
    compositeFolderIds,
    setCompositeFolderIds,
  });

  // deleteSelectedFolder provided by hook

  // Install shortcuts after handlers are defined below (using layout effect pattern)

  // Update current layer when selectedLayerId changes (from sidebar)

  // Auto-select the first layer on new scene creation
  useEffect(() => {
    // Skip auto-select in compositing mode
    if (mode === "composite") return;
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

  // Initialize layerOrder only for non-composite modes
  useEffect(() => {
    if (mode === "composite") return;
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
  }, [drawingFrames, mode]);

  // Derived sidebar folders from drawingFrames
  // In compositing mode, sidebar folders are the union of realized timeline
  // cells and placeholder folders (no cells yet). We sort by natural order.
  const effectiveCompositeIds = useMemo(() => {
    if (mode !== "composite") return [] as string[];
    // Realized composition ids are stored directly in drawingFrame.folderId
    const realized = new Set(
      drawingFrames
        .map((df: any) => df.folderId)
        .filter((id: any) => typeof id === "string") as string[]
    );
    const all = new Set<string>([
      ...compositeFolderIds,
      ...Array.from(realized),
    ]);
    const result = Array.from(all).sort((a, b) => {
      const ai = parseInt(a.split("-")[2] || "0", 10);
      const bi = parseInt(b.split("-")[2] || "0", 10);
      return ai - bi;
    });
    return result;
  }, [mode, compositeFolderIds, drawingFrames]);

  useEffect(() => {
    if (mode !== "composite") return;
    const realized = drawingFrames
      .map((df: any) => df.folderId)
      .filter((id: any) => typeof id === "string");
  }, [mode, compositeFolderIds, drawingFrames, effectiveCompositeIds]);

  const sidebarFolders = (
    mode === "composite"
      ? effectiveCompositeIds.map((id, idx) => ({
          id,
          rowId: "row-1",
          frameIndex: parseInt(id.split("-")[2] || "0", 10),
          length: 1,
          imageUrl: undefined as any,
          fileName: undefined as any,
        }))
      : drawingFrames
  ).map((df, index) => {
    const id = `${df.rowId}-${df.frameIndex}`;
    let label: string;
    if (mode === "composite") {
      // Assets folder naming: Untitled.$ by default
      label = folderNames[id] || `Untitled.${index + 1}`;
    } else if (mode === "storyboard") {
      label = folderNames[id] || `Page ${index + 1}`;
    } else {
      const isExtended = df.length > 1;
      label = isExtended
        ? `Row ${parseInt(df.rowId.split("-")[1])} Frame ${df.frameIndex + 1}:${
            df.frameIndex + df.length
          }`
        : `Row ${parseInt(df.rowId.split("-")[1])} Frame ${df.frameIndex + 1}`;
    }
    return {
      id,
      label,
      imageUrl: df.imageUrl,
      fileName: df.fileName,
      opacity: layerOpacities[id] ?? 1,
      visible: true,
      locked: false,
    };
  });

  const {
    toggleFolder,
    handleOpacityChange,
    handleStartRename,
    handleSaveRename,
    handleCancelRename,
    moveLayer,
  } = useLayersSidebar({
    setOpenFolders,
    setLayerOpacities,
    setEditingLayerName,
    setEditingLayerValue,
    setFolderLayers,
    setLayerOrder,
    folderLayers,
    saveToUndoStack: saveToUndoStackFromHook,
  });

  const handleAddLayer = (activeLayerId: string) => {
    const folderId = findCompositionFolder(activeLayerId);
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

    saveToUndoStackFromHook();
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
    const frameFolderId = findCompositionFolder(selectedLayerId);
    if (!frameFolderId) return;
    // useFolders hook provides delete by folder id
    (deleteFrameByFolderId as any)(frameFolderId);
  };

  const handleDeleteRow = () => {
    if (!selectedRow) return;
    (deleteRowById as any)(selectedRow);
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
    saveToUndoStackFromHook();
  };

  const moveFrameFolderUp = (folderId: string) =>
    reorderFrameFolder(folderId, "up");
  const moveFrameFolderDown = (folderId: string) =>
    reorderFrameFolder(folderId, "down");

  const handleCloseContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  const {
    handleDeleteSelectedStrokes,
    handleDuplicateSelectedStrokes,
    handleCopySelectedStrokes,
    handleCutSelectedStrokes,
    pasteFromClipboard,
  } = useSelectionActions({
    lassoSelection,
    selectedLayerId,
    layerStrokes,
    setLayerStrokes,
    setLassoSelection,
    setClipboard,
    setPastePreview,
    handleCloseContextMenu,
    saveToUndoStack: saveToUndoStackFromHook,
  });

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
    setLayerStrokes: setLayerStrokes as React.Dispatch<
      React.SetStateAction<Record<string, any[]>>
    > as any,
    setLassoSelection,
    handleCloseContextMenu,
    setIsResizing,
    setResizeBox,
    saveToUndoStack: saveToUndoStackFromHook,
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

  const { createColorSet, addColorToSet, removeColorFromSet } = useColorSets({
    customColorSets,
    setCustomColorSets,
    newSetName,
    setNewSetName,
  });
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

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileImport = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // In compositing mode, use the LayersPanel's processAndAddFiles
    if (mode === "composite" && layersPanelRef.current) {
      const activeFolderId = findCompositionFolder(selectedLayerId || "");

      const sequence = detectImageSequence(files);
      if (sequence && sequence.frames.length >= 2) {
        // LayersPanel will handle the sequence modal
        await layersPanelRef.current.onPanelDrop({
          preventDefault: () => {},
          stopPropagation: () => {},
          dataTransfer: {
            files: files,
            getData: () => null,
          },
        } as any);
      } else {
        // Import files directly
        await layersPanelRef.current.processAndAddFiles(files, activeFolderId);
      }
    }

    // Reset the input so the user can select the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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
        onZoomOut={() => setZoom((prev) => Math.max(0.05, prev - 0.1))}
        onZoomReset={() => setZoom(1)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenImport={mode === "composite" ? handleImportClick : undefined}
        onSave={saveScene}
        isSaving={isSaving}
      />

      <div className="flex flex-1 min-h-0 relative">
        {/* Global rotation HUD aligned from left edge up to assets panel (assumes ~280px panel) */}
        {mode === "composite" &&
          isRotatingDrag &&
          rotationPreviewDeg != null && (
            <div
              className="absolute top-2 left-0 z-30 pointer-events-none"
              style={{ width: "calc(100% - 280px)" }}
              aria-live="polite"
            >
              <div className="ml-4 inline-block bg-gray-900/90 text-white text-base md:text-lg px-3 py-1.5 rounded shadow-lg border border-white/10">
                {`${Math.round(normalizeAngle(rotationPreviewDeg))}°`}
          </div>
          </div>
          )}
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
            {/* Canvas viewport (hidden in compositing mode) */}
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
                const folderId = findCompositionFolder(selectedLayerId || "");
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
                  findCompositionFolder(selectedLayerId || "") ||
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

                const activeParts = activeFolderId.split("-");
                const selRowId = `${activeParts[0]}-${activeParts[1]}`;
                const selFrameIndex = parseInt(activeParts[2]);

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
                  const exists = prev.find(
                    (df) =>
                      df.rowId === selRowId && df.frameIndex === selFrameIndex
                  );
                  if (exists) {
                    return prev.map((df) =>
                      df.rowId === selRowId && df.frameIndex === selFrameIndex
                        ? { ...df, imageUrl }
                        : df
                    );
                  }
                  // Ensure layer order and folderLayers initialized for new folder
                  const folderId = `${selRowId}-${selFrameIndex}`;
                  setLayerOrder((po) =>
                    po[folderId]
                      ? po
                      : { ...po, [folderId]: [`${folderId}-main`] }
                  );
                  setFolderLayers((pl) =>
                    pl[folderId] ? pl : { ...pl, [folderId]: [] }
                  );
                  return [
                    ...prev,
                    {
                      rowId: selRowId,
                      frameIndex: selFrameIndex,
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

                setSelectedLayerId(`${selRowId}-${selFrameIndex}-main`);
                setSelectedFrameNumber(selFrameIndex + 1);
                // Preload image into cache for immediate draw
                if (imageUrl) {
                  if (!imageCache.current[imageUrl]) {
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.onload = () => {
                      imageCache.current[imageUrl] = img;
                      drawFrame();
                    };
                    img.src = imageUrl;
                  } else {
                    drawFrame();
                  }
                }
                saveToUndoStackFromHook();
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

            {/* Compositing: show blank composition canvas only after a folder is marked as a composition */}
            {mode === "composite" &&
              (() => {
                // Check if selectedLayerId is a composition folder directly
                const activeFolderId = selectedLayerId;
                const comp = activeFolderId
                  ? compositionByFolder[activeFolderId]
                  : undefined;
                if (!comp) return null;
                // Auto-fit to view on first select per folder
                if (
                  activeFolderId &&
                  !fittedCompByFolder[activeFolderId] &&
                  typeof window !== "undefined"
                ) {
                  const container = document.querySelector(
                    ".flex-1.bg-gray-900.flex.items-center.justify-center.p-4.min-h-0.overflow-auto"
                  ) as HTMLElement | null;
                  if (container) {
                    const bb = container.getBoundingClientRect();
                    const margin = 64;
                    const availW = Math.max(100, bb.width - margin);
                    const availH = Math.max(100, bb.height - 180);
                    const fit = Math.min(
                      availW / comp.width,
                      availH / comp.height
                    );
                    if (Number.isFinite(fit) && fit > 0) {
                      setZoom(fit);
                      setPanOffset({ x: 0, y: 0 });
                      setFittedCompByFolder((prev) => ({
                        ...prev,
                        [activeFolderId]: true,
                      }));
                    }
                  }
                }
                // Always draw the image from F1 for the active composition
                const f1 = drawingFrames.find(
                  (df) => df.folderId === activeFolderId && df.frameIndex === 0
                );
                const imgSrc = f1?.imageUrl;

                return (
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: comp.width,
                      height: comp.height,
                      transform: `translate(calc(50% - ${
                        (comp.width * zoom) / 2 - panOffset.x
                      }px), calc(50% - ${
                        (comp.height * zoom) / 2 - panOffset.y
                      }px)) scale(${zoom})`,
                      transformOrigin: "top left",
                    }}
                  >
                    <div
                      className="relative"
                      style={{ width: comp.width, height: comp.height }}
                    >
                      <canvas
                        ref={compCanvasRef as any}
                        width={comp.width}
                        height={comp.height}
                        className="bg-white shadow-md"
                      />
                      {/* (HUD moved to workspace-level container above) */}
                      {/* We only draw the selection outline above the canvas; the images themselves are rendered on the canvas to avoid duplication/upscaling. */}
                      {imgSrc && compImageBounds && (
                        <div
                          style={{
                            position: "absolute",
                            left: compImageBounds.x,
                            top: compImageBounds.y,
                            width: compImageBounds.width,
                            height: compImageBounds.height,
                            transform: `rotate(${normalizeAngle(
                              rotationPreviewDeg ??
                                rotationByAsset[selectedAssetKey || ""] ??
                                0
                            )}deg)`,
                            transformOrigin: "center",
                            border: "2px solid rgba(255,82,82,0.9)",
                            pointerEvents: "none",
                            zIndex: 2,
                          }}
                        />
                      )}
                      {imgSrc && compImageBounds && (
                        <div
                          ref={outlineRef}
                          className="absolute"
                          style={{
                            left: compImageBounds.x,
                            top: compImageBounds.y,
                            width: compImageBounds.width,
                            height: compImageBounds.height,
                            transform: `rotate(${normalizeAngle(
                              rotationPreviewDeg ??
                                rotationByAsset[selectedAssetKey || ""] ??
                                0
                            )}deg)`,
                            transformOrigin: "center",
                            zIndex: 3,
                            pointerEvents: "auto",
                          }}
                        >
                          {/* Rotation handle: small square at top-right corner */}
                          <div
                            onMouseDown={(e) => {
                              if (!selectedAssetKey) return;
                              e.preventDefault();
                              const rect = (
                                e.currentTarget.parentElement as HTMLElement
                              ).getBoundingClientRect();
                              const centerX = rect.left + rect.width / 2;
                              const centerY = rect.top + rect.height / 2;
                              const startAngle = Math.atan2(
                                e.clientY - centerY,
                                e.clientX - centerX
                              );
                              const currentDeg =
                                rotationByAsset[selectedAssetKey] ?? 0;
                              rotationDragOffsetRef.current =
                                currentDeg - (startAngle * 180) / Math.PI;
                              setIsRotatingDrag(true);
                              const onMove = (ev: MouseEvent) => {
                                const ang = Math.atan2(
                                  ev.clientY - centerY,
                                  ev.clientX - centerX
                                );
                                const deg =
                                  (ang * 180) / Math.PI +
                                  rotationDragOffsetRef.current;
                                const nd = normalizeAngle(deg);
                                rotationPreviewRef.current = nd;
                                setRotationPreviewDeg(nd);
                              };
                              const onUp = () => {
                                setIsRotatingDrag(false);
                                const finalDeg = rotationPreviewRef.current;
                                if (finalDeg != null && selectedAssetKey) {
                                  setRotationByAsset((prev) => ({
                                    ...prev,
                                    [selectedAssetKey]: finalDeg,
                                  }));
                                }
                                setRotationPreviewDeg(null);
                                rotationPreviewRef.current = null;
                                window.removeEventListener("mousemove", onMove);
                                window.removeEventListener("mouseup", onUp);
                              };
                              window.addEventListener("mousemove", onMove);
                              window.addEventListener("mouseup", onUp);
                            }}
                            style={{
                              position: "absolute",
                              right: -16,
                              top: -16,
                              width: 10,
                              height: 10,
                              background: "#60a5fa",
                              border: "2px solid #1e3a8a",
                              borderRadius: 50,
                              cursor: "grab",
                            }}
                            title="Rotate"
                          />
                          {/* Move handle (triangle at center) */}
                          <div
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              if (!compImageBounds || !selectedAssetKey) return;
                              const startX = e.clientX;
                              const startY = e.clientY;
                              const start = { ...compImageBounds };
                              setIsMovingAsset(true);
                              moveLiveBoundsRef.current = start;
                              const onMove = (ev: MouseEvent) => {
                                const dx = ev.clientX - startX;
                                const dy = ev.clientY - startY;
                                const next = {
                                  x: start.x + dx,
                                  y: start.y + dy,
                                  width: start.width,
                                  height: start.height,
                                };
                                moveLiveBoundsRef.current = next;
                                setCompImageBounds(next);
                              };
                              const onUp = () => {
                                window.removeEventListener("mousemove", onMove);
                                window.removeEventListener("mouseup", onUp);
                                const latest = moveLiveBoundsRef.current;
                                if (latest) {
                                  setBoundsByAsset((prev) => ({
                                    ...prev,
                                    [selectedAssetKey]: latest,
                                  }));
                                }
                                moveLiveBoundsRef.current = null;
                                setIsMovingAsset(false);
                              };
                              window.addEventListener("mousemove", onMove);
                              window.addEventListener("mouseup", onUp);
                            }}
                            style={{
                              position: "absolute",
                              left: "50%",
                              top: "50%",
                              transform: "translate(-50%, -50%)",
                              width: 0,
                              height: 0,
                              borderLeft: "8px solid transparent",
                              borderRight: "8px solid transparent",
                              borderBottom: "12px solid #60a5fa",
                              cursor: "move",
                              pointerEvents: "auto",
                            }}
                            title="Move"
                          />
                          {/* Corner handles: enable resize on TL, BL, BR (TR reserved for rotate) */}
                          {(
                            [
                              { key: "tl", x: 0, y: 0 },
                              { key: "bl", x: 0, y: 1 },
                              { key: "br", x: 1, y: 1 },
                            ] as const
                          ).map((p, i) => (
                            <div
                              key={p.key}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                if (!compImageBounds || !selectedAssetKey)
                                  return;
                                const startX = e.clientX;
                                const startY = e.clientY;
                                const start = { ...compImageBounds };
                                const aspect = start.width / start.height;
                                // Opposite corner (anchor stays fixed during resize)
                                const anchor =
                                  p.key === "tl"
                                    ? {
                                        x: start.x + start.width,
                                        y: start.y + start.height,
                                      }
                                    : p.key === "bl"
                                    ? { x: start.x + start.width, y: start.y }
                                    : { x: start.x, y: start.y }; // br -> anchor is top-left
                                const onMove = (ev: MouseEvent) => {
                                  const dx = ev.clientX - startX;
                                  const dy = ev.clientY - startY;

                                  // Compute proposed width/height deltas per handle
                                  let propW: number;
                                  let propH: number;
                                  if (p.key === "tl") {
                                    propW = start.width - dx;
                                    propH = start.height - dy;
                                  } else if (p.key === "bl") {
                                    propW = start.width - dx;
                                    propH = start.height + dy;
                                  } else {
                                    // br
                                    propW = start.width + dx;
                                    propH = start.height + dy;
                                  }

                                  // Determine uniform scale factor based on dominant axis change
                                  const sW = propW / start.width;
                                  const sH = propH / start.height;
                                  const s =
                                    Math.abs(sW - 1) > Math.abs(sH - 1)
                                      ? sW
                                      : sH;

                                  // Enforce minimum size
                                  const minSize = 10;
                                  let newW = Math.max(minSize, start.width * s);
                                  let newH = Math.max(minSize, newW / aspect);

                                  // If height min clipped more than width due to rounding, recompute width from height
                                  if (newH < minSize) {
                                    newH = minSize;
                                    newW = newH * aspect;
                                  }

                                  // Position so that the anchor (opposite corner) stays fixed
                                  let nx: number;
                                  let ny: number;
                                  if (p.key === "tl") {
                                    nx = anchor.x - newW;
                                    ny = anchor.y - newH;
                                  } else if (p.key === "bl") {
                                    nx = anchor.x - newW;
                                    ny = anchor.y;
                                  } else {
                                    // br
                                    nx = anchor.x;
                                    ny = anchor.y;
                                  }

                                  const nextBounds = {
                                    x: nx,
                                    y: ny,
                                    width: newW,
                                    height: newH,
                                  };
                                  resizeLiveBoundsRef.current = nextBounds;
                                  setCompImageBounds(nextBounds);
                                };
                                const onUp = () => {
                                  window.removeEventListener(
                                    "mousemove",
                                    onMove
                                  );
                                  window.removeEventListener("mouseup", onUp);
                                  const latest = resizeLiveBoundsRef.current;
                                  if (latest) {
                                    setBoundsByAsset((prev) => ({
                                      ...prev,
                                      [selectedAssetKey]: {
                                        ...latest,
                                      },
                                    }));
                                  }
                                  resizeLiveBoundsRef.current = null;
                                };
                                window.addEventListener("mousemove", onMove);
                                window.addEventListener("mouseup", onUp);
                              }}
                              style={{
                                position: "absolute",
                                left:
                                  p.x === 0 ? -4 : compImageBounds.width - 6,
                                top:
                                  p.y === 0 ? -4 : compImageBounds.height - 6,
                                width: 12,
                                height: 12,
                                background: "#93c5fd",
                                border: "2px solid #1e3a8a",
                                borderRadius: 2,
                                cursor:
                                  p.key === "tl"
                                    ? "nwse-resize"
                                    : p.key === "bl"
                                    ? "nesw-resize"
                                    : "nwse-resize",
                              }}
                            />
                          ))}
                    </div>
                      )}
                    </div>
            </div>
                );
              })()}
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

          {/* Timeline - visible in animate and composite; in composite filter to active folder */}
          {mode !== "storyboard" && (
            <TimelineDock
              rows={rows}
              setRows={setRows}
              frameCount={frameCount}
              setFrameCount={setFrameCount as any}
              drawingFrames={
                (mode === "composite"
                  ? (() => {
                      // Use selectedLayerId directly as the active folder ID
                      const activeFolderId = selectedLayerId;
                      if (!activeFolderId) return [] as any[];
                      // Render all frames for the active composition, scoped by folderId
                      return drawingFrames.filter(
                        (df) => df.folderId === activeFolderId
                      );
                    })()
                  : drawingFrames) as any
              }
              activeCompositionLabel={(() => {
                if (mode !== "composite") return "";
                // Use selectedLayerId directly as the active folder ID
                const activeFolderId = selectedLayerId;
                if (!activeFolderId) return "";
                // Only show indicator if this folder has composition settings
                if (!compositionByFolder[activeFolderId]) return "";
                return (
                  folderNames[activeFolderId] ||
                  ((): string => {
                    const idx = effectiveCompositeIds.indexOf(activeFolderId);
                    return idx >= 0 ? `Untitled.${idx + 1}` : activeFolderId;
                  })()
                );
              })()}
              setDrawingFrames={setDrawingFrames as any}
              selectedRow={selectedRow}
              setSelectedRow={setSelectedRow as any}
              selectedLayerId={selectedLayerId}
              setSelectedLayerId={(val: any) => {
                if (mode === "composite") {
                  const currentFolderId = selectedLayerId;
                  const newFolderId = findCompositionFolder(val || "");

                  // Only apply the override logic when switching between different compositions
                  // Don't override when clicking cells within the same composition
                  if (
                    currentFolderId &&
                    newFolderId &&
                    currentFolderId !== newFolderId
                  ) {
                    // Switch to the new composition folder - use the folder ID directly

                    setSelectedLayerId(newFolderId);
                    setSelectedFrameNumber(1);
                    return;
                  }

                  // For timeline cell clicks within the same composition,
                  // keep the composition folder selected, don't change to the cell ID
                  if (
                    currentFolderId &&
                    newFolderId &&
                    currentFolderId === newFolderId
                  ) {
                    // Don't change selectedLayerId - keep the composition folder selected
                    return;
                  }
                }
                // Allow normal layer ID setting for other cases

                setSelectedLayerId(val);
              }}
              selectedFrameNumber={selectedFrameNumber}
              setSelectedFrameNumber={(n: any) => {
                if (mode === "composite") {
                  setSelectedFrameNumber(n);
                } else {
                  setSelectedFrameNumber(n);
                }
              }}
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
              hideEditButtons={mode === "composite"}
              suppressFrames={false}
            />
          )}
        </div>

        <LayersPanel
          ref={layersPanelRef}
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
          handleSaveRename={(layerId: string) =>
            handleSaveRename(layerId, editingLayerValue)
          }
          handleCancelRename={handleCancelRename}
          compositionByFolder={compositionByFolder}
          // selection for asset highlight
          selectedAssetFolderId={compSelectedAssetFolderId || undefined}
          selectedAssetIndex={compSelectedAssetIndex ?? undefined}
          onReorderCompAssets={(folderId, from, to) => {
            // Reorder z-index for compositing by reordering the drawingFrames entries for this folder
            setDrawingFrames((prev) => {
              // Group frames by asset/row - for sequences, we need to move all frames together
              const assetFrameGroups = prev
                .filter((df) => df.folderId === folderId)
                .reduce((acc, df) => {
                  const rowKey = df.rowId;
                  if (!acc[rowKey]) acc[rowKey] = [];
                  acc[rowKey].push(df);
                  return acc;
                }, {} as Record<string, typeof prev>);

              const otherFrames = prev.filter((df) => df.folderId !== folderId);
              const groupKeys = Object.keys(assetFrameGroups).sort();

              if (groupKeys.length <= 1) return prev;

              // Reorder the asset groups
              const [movedGroup] = groupKeys.splice(from, 1);
              groupKeys.splice(to, 0, movedGroup);

              // Reassign rowIds and flatten back to individual frames
              const reorderedFrames = groupKeys.flatMap((groupKey, idx) => {
                const newRowId = `row-${idx + 1}`;
                return assetFrameGroups[groupKey].map((df) => ({
                  ...df,
                  rowId: newRowId,
                }));
              });

              return [...otherFrames, ...reorderedFrames];
            });
            // Update selected index if it was moved
            setCompSelectedAssetIndex((cur) => {
              if (cur == null) return cur;
              if (cur === from) return to;
              if (from < cur && to >= cur) return cur - 1;
              if (from > cur && to <= cur) return cur + 1;
              return cur;
            });
          }}
          onSetComposition={(folderId, s) => {
            setCompositionByFolder((prev) => ({ ...prev, [folderId]: s }));
            // do not materialize a timeline cell yet in composite; wait for first asset
            // ensure layer order entry exists but without main image
            const folderKey = folderId;
            setLayerOrder((po) =>
              po[folderKey] ? po : { ...po, [folderKey]: [] }
            );
            setFolderLayers((pl) =>
              pl[folderKey] ? pl : { ...pl, [folderKey]: [] }
            );
            // focus the folder
            setSelectedLayerId(`${folderId}`);
            // When turning a folder that already has assets into a composition
            // materialize its first asset into R1 F1 immediately
            setTimeout(() => {
              setDrawingFrames((prev) => {
                const parts = folderId.split("-");
                const rowId = `${parts[0]}-${parts[1]}`;
                const hasF1 = prev.some(
                  (df) => df.rowId === rowId && df.frameIndex === 0
                );
                if (hasF1) return prev;
                // Find a cached asset for this folder from the assets panel via folderLayers name if any
                // We cannot read assetsByFolder here, so this path is best-effort; actual push happens from LayersPanel.
                return prev;
              });
              // Ensure timeline highlights F1 for this comp
              setSelectedFrameNumber(1);
            }, 0);
          }}
          onFolderReceiveAssets={(folderId, assets) => {
            if (!assets || assets.length === 0) return;
            // For compositing, each new asset should occupy the next row at F1 (R1 F1, R2 F1, ...)
            const parts = folderId.split("-");
            const frameIndex = parseInt(parts[2], 10);
            setTimeout(
              () =>
                setDrawingFrames((prev) => {
                  // Get existing unique rows for this folder
                  const existingRowsForFolder = new Set(
                    prev
                      .filter((df) => df.folderId === folderId)
                      .map((df) => df.rowId)
                  );

                  const allNewFrames = [];
                  let currentRowNumber = existingRowsForFolder.size + 1; // Start from next available row

                  // Process each asset
                  for (const asset of assets) {
                    const rowId = `row-${currentRowNumber}`;

                    if (asset.isSequence && asset.sequenceFrames) {
                      // For sequence assets, create a frame for each sequence frame
                      for (let i = 0; i < asset.sequenceFrames.length; i++) {
                        const seqFrame = asset.sequenceFrames[i];
                        allNewFrames.push({
                          rowId,
                          frameIndex: i, // F1, F2, F3, etc.
                          length: 1,
                          imageUrl: seqFrame.blobUrl,
                          fileName: `${asset.name} [Frame ${i + 1}]`,
                          folderId,
                          sequenceIndex: i,
                          isSequenceFrame: true,
                        });
                      }
                    } else {
                      // For regular assets, create a single frame
                      allNewFrames.push({
                        rowId,
                        frameIndex: 0, // Regular images start at F1
                        length: 1,
                        imageUrl:
                          asset.url.endsWith(".tga") && asset.file
                            ? URL.createObjectURL(asset.file)
                            : asset.url,
                        fileName: asset.name,
                        folderId,
                      });
                    }

                    currentRowNumber++; // Move to next row for next asset
                  }

                  // Ensure timeline has enough rows to show all new entries
                  setRows((prevRows) => {
                    const numbers = prevRows
                      .map((r) => r.id.match(/row-(\d+)/)?.[1])
                      .map((n) => (n ? parseInt(n, 10) : 0));
                    const maxExisting = Math.max(0, ...numbers);
                    const maxNeeded = currentRowNumber - 1; // currentRowNumber is now one past the last used
                    if (maxExisting >= maxNeeded) return prevRows;
                    const additions = [] as any[];
                    for (let i = maxExisting + 1; i <= maxNeeded; i++) {
                      additions.push({ id: `row-${i}`, name: `Row${i}` });
                    }
                    return [...prevRows, ...additions];
                  });

                  const after = prev.concat(allNewFrames);

                  return after;
                }),
              0
            );
            // After frame is realized, remove placeholder id (defer to next tick)
            setTimeout(() => {
              setCompositeFolderIds((prev) =>
                prev.filter((id) => id !== folderId)
              );
            }, 1);
            // Initialize selection and bounds for this comp so clicking doesn't shift
            const comp = compositionByFolder[folderId];
            if (comp && assets.length > 0) {
              const firstAsset = assets[0];
              setCompSelectedAssetFolderId(folderId);
              setCompSelectedAssetIndex((prev) =>
                prev == null ? 0 : prev + 1
              );
              // Initialize selection bounds from the image's natural size centered on canvas
              const src =
                (firstAsset.url.endsWith(".tga") && firstAsset.file
                  ? URL.createObjectURL(firstAsset.file)
                  : firstAsset.url) || "";
              const img = new Image();
              img.onload = () => {
                const w = img.naturalWidth || comp.width;
                const h = img.naturalHeight || comp.height;
                const x = Math.round((comp.width - w) / 2);
                const y = Math.round((comp.height - h) / 2);
                setCompImageBounds({ x, y, width: w, height: h });
              };
              img.src = src;
            }
            // In compositing mode, do not create extra editor layers here
          }}
          onSelectCompAsset={(folderId, index) => {
            // Select asset within comp and compute its natural bounds
            const comp = compositionByFolder[folderId];
            if (!comp) return;
            const df = drawingFrames.find(
              (d) =>
                d.folderId === folderId &&
                d.frameIndex === 0 &&
                parseInt(d.rowId.split("-")[1], 10) === index + 1
            );
            if (!df?.imageUrl) return;
            const img = new Image();
            img.onload = () => {
              // Set bounds from the selected image's natural size centered
              setCompSelectedAssetFolderId(folderId);
              setCompSelectedAssetIndex(index);
              // do not reset rotation here; keep rotation keyed to asset identity
              const w = img.naturalWidth || comp.width;
              const h = img.naturalHeight || comp.height;
              const x = Math.round((comp.width - w) / 2);
              const y = Math.round((comp.height - h) / 2);
              // Prefer persisted bounds if available
              const identity = `${folderId}|${
                df.fileName || df.imageUrl || ""
              }`;
              const persisted = boundsByAsset[identity];
              if (persisted) {
                setCompImageBounds({ ...persisted });
              } else {
                setCompImageBounds({ x, y, width: w, height: h });
              }
            };
            img.src = df.imageUrl;
          }}
          drawingFrames={drawingFrames}
          assetEffects={assetEffects}
          onAssetEffectsChange={(identity, effects) => {
            setAssetEffects((prev) => ({ ...prev, [identity]: effects }));
          }}
          selectedAssetKey={selectedAssetKey}
        />
      </div>

      {/* Left toolbar removed: rotation is controlled via the corner handle only */}

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

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.tga"
        onChange={handleFileImport}
        style={{ display: "none" }}
      />
    </div>
  );
}

export default AnimationEditor;
