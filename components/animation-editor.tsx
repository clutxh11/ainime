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
import { TransformSettings } from "@/components/editor/TransformPanel";
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

// Track recent import operations to prevent duplicates
const recentImports = new Set<string>();

// Types for composition hierarchy
interface NestedComposition {
  compositionId: string; // The nested composition's folder ID
  parentCompositionId: string; // The parent composition's folder ID
  assetId: string; // The asset ID representing this composition in the parent
  name: string; // Display name for the nested composition
  settings: { width: number; height: number; fps: number };
  // Position within the parent composition's asset list
  index: number;
}

interface CompositionHierarchy {
  // Map of composition ID -> array of nested composition IDs it contains
  children: Record<string, string[]>;
  // Map of composition ID -> parent composition ID (if nested)
  parents: Record<string, string>;
  // Map of nested composition asset IDs -> composition metadata
  nestedCompositions: Record<string, NestedComposition>;
}

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

  // Composition hierarchy state
  const [compositionHierarchy, setCompositionHierarchy] =
    useState<CompositionHierarchy>({
      children: {},
      parents: {},
      nestedCompositions: {},
    });

  // Helper functions for composition hierarchy
  const addNestedComposition = useCallback(
    (
      parentId: string,
      childId: string,
      assetId: string,
      name: string,
      index: number
    ) => {
      const childSettings = compositionByFolder[childId];
      if (!childSettings) {
        console.warn(
          "[HIERARCHY] Child composition settings not found:",
          childId
        );
        return;
      }

      setCompositionHierarchy((prev) => {
        const newHierarchy = { ...prev };

        // Add child to parent's children array
        if (!newHierarchy.children[parentId]) {
          newHierarchy.children[parentId] = [];
        }
        if (!newHierarchy.children[parentId].includes(childId)) {
          newHierarchy.children[parentId].push(childId);
        }

        // Set parent relationship
        newHierarchy.parents[childId] = parentId;

        // Store nested composition metadata
        newHierarchy.nestedCompositions[assetId] = {
          compositionId: childId,
          parentCompositionId: parentId,
          assetId,
          name,
          settings: childSettings,
          index,
        };

        console.log("[HIERARCHY] Added nested composition:", {
          parentId,
          childId,
          assetId,
          name,
          hierarchy: newHierarchy,
        });

        return newHierarchy;
      });

      // CRITICAL: Create frames for the nested composition in the parent folder
      // This ensures the nested composition appears in parent timeline and canvas
      setDrawingFrames((prev: any[]) => {
        console.log(
          "[NESTED COMP CREATION] Creating frames for nested composition:",
          {
            parentId,
            childId,
            assetId,
            name,
            existingFrames: prev.length,
          }
        );

        // Get all frames from the child composition
        const childFrames = prev.filter((df: any) => df.folderId === childId);

        if (childFrames.length === 0) {
          console.log(
            "[NESTED COMP CREATION] No child frames found for composition:",
            childId
          );
          return prev;
        }

        console.log("[NESTED COMP CREATION] Found child frames:", {
          childId,
          frameCount: childFrames.length,
          sampleFrame: childFrames[0]
            ? {
                fileName: childFrames[0].fileName,
                rowId: childFrames[0].rowId,
                assetId: childFrames[0].assetId,
              }
            : null,
        });

        // Find next available row in parent folder
        const existingParentFrames = prev.filter(
          (df: any) => df.folderId === parentId
        );
        const maxRowNumber = existingParentFrames.reduce((max, frame) => {
          const rowNum = parseInt(frame.rowId.split("-")[1] || "0", 10);
          return Math.max(max, rowNum);
        }, 0);
        const newRowId = `row-${maxRowNumber + 1}`;

        console.log("[NESTED COMP CREATION] Assigning row:", {
          parentId,
          existingParentFrames: existingParentFrames.length,
          maxRowNumber,
          newRowId,
        });

        // Create frames that represent the nested composition content in the parent
        const newFrames = childFrames.map((childFrame: any) => ({
          rowId: newRowId,
          frameIndex: childFrame.frameIndex,
          length: childFrame.length,
          imageUrl: childFrame.imageUrl,
          fileName: `${name} > ${childFrame.fileName}`,
          folderId: parentId, // Belongs to parent folder
          assetId, // Use the nested composition asset ID
          parentAssetId: assetId, // CRITICAL: This enables unique grouping
          isNestedCompositionFrame: true,
          sourceCompositionId: childId,
          sourceFrameId: `${childFrame.folderId}|${childFrame.assetId}|${childFrame.frameIndex}`,
        }));

        console.log("[NESTED COMP CREATION] Created nested frames:", {
          parentId,
          childId,
          newFrameCount: newFrames.length,
          sampleNewFrame: newFrames[0]
            ? {
                fileName: newFrames[0].fileName,
                parentAssetId: newFrames[0].parentAssetId,
                folderId: newFrames[0].folderId,
                isNestedCompositionFrame: newFrames[0].isNestedCompositionFrame,
              }
            : null,
        });

        return [...prev, ...newFrames];
      });
    },
    [compositionByFolder]
  );

  const removeNestedComposition = useCallback(
    (parentId: string, childId: string, assetId: string) => {
      setCompositionHierarchy((prev) => {
        const newHierarchy = { ...prev };

        // Remove child from parent's children array
        if (newHierarchy.children[parentId]) {
          newHierarchy.children[parentId] = newHierarchy.children[
            parentId
          ].filter((id) => id !== childId);
          if (newHierarchy.children[parentId].length === 0) {
            delete newHierarchy.children[parentId];
          }
        }

        // Remove parent relationship
        delete newHierarchy.parents[childId];

        // Remove nested composition metadata
        delete newHierarchy.nestedCompositions[assetId];

        console.log("[HIERARCHY] Removed nested composition:", {
          parentId,
          childId,
          assetId,
          hierarchy: newHierarchy,
        });

        return newHierarchy;
      });
    },
    []
  );

  const isCompositionNested = useCallback(
    (compositionId: string): boolean => {
      return compositionHierarchy.parents[compositionId] !== undefined;
    },
    [compositionHierarchy.parents]
  );

  const getNestedCompositionsInParent = useCallback(
    (parentId: string): NestedComposition[] => {
      const childIds = compositionHierarchy.children[parentId] || [];
      return childIds
        .map((childId) => {
          // Find the asset ID for this nested composition
          const assetId = Object.keys(
            compositionHierarchy.nestedCompositions
          ).find(
            (key) =>
              compositionHierarchy.nestedCompositions[key].compositionId ===
                childId &&
              compositionHierarchy.nestedCompositions[key]
                .parentCompositionId === parentId
          );
          return assetId
            ? compositionHierarchy.nestedCompositions[assetId]
            : null;
        })
        .filter(Boolean) as NestedComposition[];
    },
    [compositionHierarchy]
  );
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

  // Asset transforms (opacity, position, rotation, scale) - keyed by asset identity
  const [assetTransforms, setAssetTransforms] = useState<
    Record<string, TransformSettings>
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

  // Auto-update parent compositions when child compositions change
  useEffect(() => {
    // Find all nested composition frames that need updating
    const needsUpdate = new Set<string>();

    drawingFrames.forEach((frame: any) => {
      if (frame.isNestedCompositionFrame && frame.sourceCompositionId) {
        // Check if the child composition has changed
        const childFrames = drawingFrames.filter(
          (df: any) => df.folderId === frame.sourceCompositionId
        );
        const childFrameCount = childFrames.length;
        const parentFrameCount = drawingFrames.filter(
          (df: any) =>
            df.folderId === frame.folderId &&
            df.assetId === frame.assetId &&
            df.isNestedCompositionFrame
        ).length;

        if (childFrameCount !== parentFrameCount) {
          needsUpdate.add(`${frame.folderId}|${frame.assetId}`);
        }
      }
    });

    if (needsUpdate.size > 0) {
      console.log(
        "[NESTED COMP UPDATE] Detected changes requiring updates:",
        Array.from(needsUpdate)
      );

      // Trigger regeneration of nested composition frames
      setTimeout(() => {
        setDrawingFrames((prev) => {
          const updated = [...prev];
          let hasChanges = false;

          for (const updateKey of needsUpdate) {
            const [parentFolderId, nestedAssetId] = updateKey.split("|");

            // Remove old nested composition frames for this asset
            const withoutOld = updated.filter(
              (frame: any) =>
                !(
                  frame.folderId === parentFolderId &&
                  frame.assetId === nestedAssetId &&
                  frame.isNestedCompositionFrame
                )
            );

            // Find the nested composition asset to get its composition ID
            const nestedAsset = prev.find(
              (frame: any) =>
                frame.folderId === parentFolderId &&
                frame.assetId === nestedAssetId &&
                frame.isNestedCompositionFrame
            ) as any;

            if (nestedAsset && nestedAsset.sourceCompositionId) {
              const childFrames = prev.filter(
                (df: any) => df.folderId === nestedAsset.sourceCompositionId
              );

              // Get row info from old frame
              const rowId = nestedAsset.rowId;
              const assetName =
                nestedAsset.fileName.split(" > ")[0] || "Nested Composition";

              // Create updated nested composition frames
              for (const childFrame of childFrames) {
                withoutOld.push({
                  rowId,
                  frameIndex: childFrame.frameIndex,
                  length: childFrame.length,
                  imageUrl: childFrame.imageUrl,
                  fileName: `${assetName} > ${childFrame.fileName}`,
                  folderId: parentFolderId,
                  assetId: nestedAssetId,
                  isNestedCompositionFrame: true,
                  sourceCompositionId: nestedAsset.sourceCompositionId,
                  sourceFrameId: `${childFrame.folderId}|${childFrame.assetId}|${childFrame.frameIndex}`,
                });
              }

              updated.length = 0;
              updated.push(...withoutOld);
              hasChanges = true;
            }
          }

          return hasChanges ? updated : prev;
        });
      }, 100);
    }
  }, [drawingFrames]);

  // Stable key for per-asset rotation that survives reordering: folderId + fileName
  const selectedAssetKey = useMemo(() => {
    console.log("[SELECTED ASSET KEY DEBUG] Calculating selectedAssetKey:", {
      compSelectedAssetFolderId,
      compSelectedAssetIndex,
      totalDrawingFrames: drawingFrames.length,
      framesForSelectedFolder: drawingFrames.filter(
        (d) => (d as any).folderId === compSelectedAssetFolderId
      ).length,
    });

    if (compSelectedAssetFolderId == null || compSelectedAssetIndex == null) {
      console.log(
        "[SELECTED ASSET KEY DEBUG] Missing selection state, returning null"
      );
      return null;
    }

    const df = drawingFrames.find(
      (d) =>
        (d as any).folderId === compSelectedAssetFolderId &&
        d.frameIndex === 0 &&
        parseInt(d.rowId.split("-")[1], 10) === compSelectedAssetIndex + 1
    );

    console.log("[SELECTED ASSET KEY DEBUG] Frame lookup result:", {
      found: !!df,
      searchCriteria: {
        folderId: compSelectedAssetFolderId,
        frameIndex: 0,
        expectedRowNumber: compSelectedAssetIndex + 1,
      },
      foundFrame: df
        ? {
            folderId: (df as any).folderId,
            frameIndex: df.frameIndex,
            rowId: df.rowId,
            assetId: df.assetId,
            fileName: df.fileName,
          }
        : null,
    });

    if (!df) {
      console.log(
        "[SELECTED ASSET KEY DEBUG] No matching frame found for standard logic"
      );

      // FALLBACK: For child compositions, try to find frame by logical position instead of rowId
      if (compositionHierarchy.parents[compSelectedAssetFolderId || ""]) {
        console.log(
          "[SELECTED ASSET KEY DEBUG] Trying fallback logic for nested composition"
        );
        const sortedFrames = drawingFrames
          .filter((d: any) => (d as any).folderId === compSelectedAssetFolderId)
          .sort((a: any, b: any) => {
            const aRowNum = parseInt(a.rowId.split("-")[1] || "0", 10);
            const bRowNum = parseInt(b.rowId.split("-")[1] || "0", 10);
            return aRowNum - bRowNum;
          });

        // Group by asset identity, then take the asset at the requested index
        const assetGroups = sortedFrames.reduce((groups, frame) => {
          const key = frame.assetId || `${frame.folderId}-${frame.rowId}`;
          if (!groups[key]) groups[key] = [];
          groups[key].push(frame);
          return groups;
        }, {} as Record<string, any[]>);

        const assetKeys = Object.keys(assetGroups);
        if (
          compSelectedAssetIndex != null &&
          compSelectedAssetIndex < assetKeys.length
        ) {
          const targetAssetKey = assetKeys[compSelectedAssetIndex];
          const fallbackFrame = assetGroups[targetAssetKey][0]; // First frame of the asset
          console.log("[SELECTED ASSET KEY DEBUG] Fallback frame found:", {
            targetAssetKey,
            fallbackFrame: {
              assetId: fallbackFrame.assetId,
              rowId: fallbackFrame.rowId,
              fileName: fallbackFrame.fileName,
            },
          });

          const identity =
            fallbackFrame.isSequenceFrame && fallbackFrame.folderId
              ? fallbackFrame.assetId
                ? `${fallbackFrame.folderId}|${fallbackFrame.assetId}`
                : fallbackFrame.folderId
              : fallbackFrame.assetId
              ? `${compSelectedAssetFolderId}|${fallbackFrame.assetId}`
              : `${compSelectedAssetFolderId}|${
                  fallbackFrame.fileName || fallbackFrame.imageUrl || ""
                }`;

          console.log("[SELECTED ASSET KEY DEBUG] Fallback identity:", {
            identity,
          });
          return identity;
        }
      }

      // SPECIAL CASE: Check if this is a nested composition asset selection
      if (compSelectedAssetFolderId && compSelectedAssetIndex != null) {
        // Get regular frames for this folder
        const folderFrames = drawingFrames.filter(
          (d: any) => (d as any).folderId === compSelectedAssetFolderId
        );

        // Check if the selected index is beyond regular frames (indicating nested composition)
        const nestedCompositions =
          compositionHierarchy.children[compSelectedAssetFolderId] || [];
        if (
          compSelectedAssetIndex >= folderFrames.length &&
          nestedCompositions.length > 0
        ) {
          const nestedIndex = compSelectedAssetIndex - folderFrames.length;
          if (nestedIndex < nestedCompositions.length) {
            const childId = nestedCompositions[nestedIndex];
            const nestedComp =
              compositionHierarchy.nestedCompositions[
                Object.keys(compositionHierarchy.nestedCompositions).find(
                  (assetId) =>
                    compositionHierarchy.nestedCompositions[assetId]
                      .compositionId === childId
                ) || ""
              ];

            if (nestedComp) {
              const nestedCompIdentity = `${compSelectedAssetFolderId}|${nestedComp.assetId}`;
              console.log(
                "[SELECTED ASSET KEY DEBUG] Found nested composition asset:",
                {
                  identity: nestedCompIdentity,
                  assetId: nestedComp.assetId,
                  name: nestedComp.name,
                  compositionId: childId,
                }
              );
              return nestedCompIdentity;
            }
          }
        }
      }

      console.log(
        "[SELECTED ASSET KEY DEBUG] No fallback frame found either, returning null"
      );
      return null;
    }

    // Use consistent identity calculation for all asset types
    const identity =
      df.isSequenceFrame && df.folderId
        ? df.assetId
          ? `${df.folderId}|${df.assetId}`
          : df.folderId
        : df.assetId
        ? `${compSelectedAssetFolderId}|${df.assetId}`
        : `${compSelectedAssetFolderId}|${df.fileName || df.imageUrl || ""}`;

    console.log("[SELECTED ASSET KEY DEBUG] Final identity:", {
      identity,
      isSequenceFrame: df.isSequenceFrame,
      assetId: df.assetId,
      fileName: df.fileName,
      imageUrl: df.imageUrl,
    });

    return identity;
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

    // Get frames for this composition, handling nested compositions properly
    const getFramesForComposition = (folderId: string): any[] => {
      const directFrames = drawingFrames.filter(
        (df: any) => df.folderId === folderId
      );

      // Check if this composition is nested (child composition)
      // If it is, show only its own frames, not parent frames
      const isNestedComposition = isCompositionNested(folderId);

      console.log("[CANVAS RENDER DEBUG] Canvas composition check:", {
        folderId,
        isNestedComposition,
        directFrames: directFrames.length,
        hasNestedChildren:
          (compositionHierarchy.children[folderId] || []).length > 0,
      });

      if (isNestedComposition) {
        // For child compositions, show only their direct frames
        console.log(
          "[CANVAS RENDER] Child composition - showing only direct frames:",
          {
            childId: folderId,
            directFrames: directFrames.length,
          }
        );

        // For child compositions, restore original rowIds for proper isolation
        // This ensures child compositions render with R1 F1:6 instead of parent display rowIds
        const framesWithOriginalRowIds = directFrames.map((frame) => ({
          ...frame,
          // Use original rowId if it exists, otherwise keep current rowId
          rowId: (frame as any).originalRowId || frame.rowId,
        }));

        console.log(
          "[CANVAS RENDER] Restored original rowIds for child composition:",
          {
            frameCount: framesWithOriginalRowIds.length,
            rowIds: framesWithOriginalRowIds.map((f) => f.rowId),
          }
        );

        return framesWithOriginalRowIds;
      }

      // If this composition has nested compositions, include their frames too
      const nestedCompositions = compositionHierarchy.children[folderId] || [];
      if (nestedCompositions.length > 0) {
        console.log(
          "[CANVAS RENDER] Parent composition - including nested composition frames:",
          {
            parentId: folderId,
            nestedCompositions,
            directFrames: directFrames.length,
          }
        );

        // Collect all nested frames - use the newly created nested composition frames, not original child frames
        const allNestedFrames: any[] = [];
        for (const childCompositionId of nestedCompositions) {
          // Find nested composition frames that were created for this child composition
          const nestedCompFrames = drawingFrames.filter(
            (df: any) =>
              df.folderId === folderId &&
              df.isNestedCompositionFrame === true &&
              df.sourceCompositionId === childCompositionId
          );

          console.log("[CANVAS RENDER] Collecting nested comp frames:", {
            childCompositionId,
            foundFrames: nestedCompFrames.length,
            sampleFrame: nestedCompFrames[0]
              ? {
                  parentAssetId: (nestedCompFrames[0] as any).parentAssetId,
                  folderId: nestedCompFrames[0].folderId,
                  isNestedCompositionFrame: (nestedCompFrames[0] as any)
                    .isNestedCompositionFrame,
                  sourceCompositionId: (nestedCompFrames[0] as any)
                    .sourceCompositionId,
                }
              : null,
          });

          allNestedFrames.push(...nestedCompFrames);
        }

        // Combine all frames and sort by rowId to respect user's reordering
        // This ensures reordering works properly with nested compositions
        const allFrames = [...allNestedFrames, ...directFrames];

        console.log(
          "[CANVAS RENDER] Combining frames for parent composition:",
          {
            directFrames: directFrames.length,
            nestedFrames: allNestedFrames.length,
            directRowIds: directFrames.map((f) => f.rowId),
            nestedRowIds: allNestedFrames.map((f) => f.rowId),
            totalFrames: allFrames.length,
          }
        );

        // First, sort frames to get the correct visual order
        const sortedFrames = allFrames.sort((a, b) => {
          // Extract row number from rowId (e.g., "row-1", "row-2")
          const aRowNum = parseInt(a.rowId.split("-")[1] || "0", 10);
          const bRowNum = parseInt(b.rowId.split("-")[1] || "0", 10);

          // If rowIds are the same, prioritize direct frames over nested frames
          // This ensures direct frames appear in front when reordered
          if (aRowNum === bRowNum) {
            const aIsDirect = a.folderId === folderId;
            const bIsDirect = b.folderId === folderId;

            if (aIsDirect && !bIsDirect) return -1; // a (direct) comes before b (nested)
            if (!aIsDirect && bIsDirect) return 1; // b (direct) comes before a (nested)
            return 0; // Same type, maintain relative order
          }

          return aRowNum - bRowNum;
        });

        // Group frames by asset/composition and assign virtual display rowIds
        // This ensures consistent rendering order with timeline display
        const frameGroups: { [key: string]: any[] } = {};
        sortedFrames.forEach((frame) => {
          let groupKey: string;
          if (frame.folderId === folderId) {
            // Direct frames: group by assetId
            groupKey = `direct-${frame.assetId}`;
          } else {
            // Nested frames: group by parent asset ID to distinguish duplicated compositions
            const parentAssetId = frame.parentAssetId || frame.folderId;
            groupKey = `nested-${frame.folderId}-${parentAssetId}`;

            console.log("[CANVAS GROUPING DEBUG] Nested frame grouping:", {
              frameId: `${frame.folderId}|${frame.assetId}`,
              parentAssetId: frame.parentAssetId,
              folderId: frame.folderId,
              assetId: frame.assetId,
              groupKey,
              fileName: frame.fileName,
            });
          }

          if (!frameGroups[groupKey]) {
            frameGroups[groupKey] = [];
          }
          frameGroups[groupKey].push(frame);
        });

        // Assign virtual display rowIds for parent composition view
        let displayRowCounter = 1;
        const framesWithDisplayRowIds = Object.values(frameGroups).flatMap(
          (group) => {
            const displayRowId = `row-${displayRowCounter}`;
            displayRowCounter++;

            return group.map((frame) => ({
              ...frame,
              // Store both original rowId (for child composition isolation)
              // and display rowId (for parent composition display)
              originalRowId: frame.rowId,
              displayRowId: displayRowId,
              // Use displayRowId for parent composition canvas
              rowId: displayRowId,
            }));
          }
        );

        console.log("[CANVAS RENDER] Assigned display rowIds:", {
          totalGroups: Object.keys(frameGroups).length,
          frameGroupKeys: Object.keys(frameGroups),
          framesWithDisplayRowIds: framesWithDisplayRowIds.length,
        });

        console.log("[CANVAS GROUPING DEBUG] Final frame groups:", {
          groupKeys: Object.keys(frameGroups),
          groupSizes: Object.keys(frameGroups).map((key) => ({
            key,
            count: frameGroups[key].length,
            firstFrame: frameGroups[key][0]?.fileName || "unknown",
          })),
        });

        return framesWithDisplayRowIds;
      }

      return directFrames;
    };

    const assetsToDraw = getFramesForComposition(activeFolderId)
      .filter((df) => {
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
            ? cell.assetId
              ? `${cell.folderId}|${cell.assetId}`
              : cell.folderId
            : cell.assetId
            ? `${activeFolderId}|${cell.assetId}`
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
          // For sequence frames, use folderId + assetId to ensure duplicated sequences have unique identities
          // while still allowing transformations to persist across frames within the same sequence
          // For regular assets, use assetId if available to ensure duplicated assets have unique identities
          const identity =
            cell.isSequenceFrame && cell.folderId
              ? cell.assetId
                ? `${cell.folderId}|${cell.assetId}`
                : cell.folderId
              : cell.assetId
              ? `${activeFolderId}|${cell.assetId}`
              : `${activeFolderId}|${cell.fileName || cell.imageUrl || ""}`;

          console.log(`[COLOR EFFECTS DEBUG] Asset identity calculation:`, {
            fileName: cell.fileName,
            assetId: cell.assetId,
            isSequenceFrame: cell.isSequenceFrame,
            folderId: cell.folderId,
            activeFolderId,
            finalIdentity: identity,
            imageUrl: cell.imageUrl,
            cellData: cell,
          });

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
          let imageToRender = img;
          const instanceEffects = assetEffects[identity];

          // Check if this is a nested composition and get inherited effects
          const isNestedCompositionFrame = cell.isNestedCompositionFrame;
          let inheritedEffects = null;
          
          if (isNestedCompositionFrame && cell.sourceCompositionId) {
            // Look up the original child composition's effects
            const childFrames = drawingFrames.filter((df: any) => df.folderId === cell.sourceCompositionId);
            if (childFrames.length > 0) {
              const originalChildAssetId = childFrames[0].assetId;
              const childAssetIdentity = `${cell.sourceCompositionId}|${originalChildAssetId}`;
              inheritedEffects = assetEffects[childAssetIdentity];
            }
          }

          console.log(`[COLOR EFFECTS DEBUG] Effects lookup:`, {
            identity,
            isNestedCompositionFrame,
            sourceCompositionId: cell.sourceCompositionId,
            hasInheritedEffects: !!inheritedEffects,
            hasInstanceEffects: !!instanceEffects,
            inheritedEffects: inheritedEffects
              ? {
                  colorKey: inheritedEffects.colorKey?.enabled,
                  colorKeep: inheritedEffects.colorKeep?.enabled,
                  fill: inheritedEffects.fill?.enabled,
                }
              : null,
            instanceEffects: instanceEffects
              ? {
                  colorKey: instanceEffects.colorKey?.enabled,
                  colorKeep: instanceEffects.colorKeep?.enabled,
                  fill: instanceEffects.fill?.enabled,
                }
              : null,
            allAssetEffects: Object.keys(assetEffects),
          });

          // Apply inherited effects first (for nested compositions)
          if (
            inheritedEffects &&
            (inheritedEffects.colorKey?.enabled ||
              inheritedEffects.colorKeep?.enabled ||
              inheritedEffects.fill?.enabled)
          ) {
            console.log(
              `[COLOR EFFECTS DEBUG] Applying inherited effects for nested composition: ${identity}`,
              inheritedEffects
            );
            const processedCanvas = processImageWithEffects(ctx, img, inheritedEffects);
            imageToRender = processedCanvas as any;
          }

          // Apply instance effects on top (if any)
          if (
            instanceEffects &&
            (instanceEffects.colorKey?.enabled ||
              instanceEffects.colorKeep?.enabled ||
              instanceEffects.fill?.enabled)
          ) {
            console.log(
              `[COLOR EFFECTS DEBUG] Applying instance effects for identity: ${identity}`,
              instanceEffects
            );
            // Apply instance effects to the current image (which may already have inherited effects)
            const processedCanvas = processImageWithEffects(ctx, imageToRender as any, instanceEffects);
            imageToRender = processedCanvas as any;
          }

          // Get transform settings for this asset
          const transform = assetTransforms[identity];
          const opacity =
            transform?.opacity !== undefined ? transform.opacity / 100 : 1;

          // Sync transform values with current bounds and rotation
          if (transform) {
            const currentBounds = boundsByAsset[identity];
            const currentRotation = rotationByAsset[key] ?? 0;

            // Update transform if values have changed
            if (
              currentBounds &&
              (Math.abs(transform.position.x - currentBounds.x) > 1 ||
                Math.abs(transform.position.y - currentBounds.y) > 1 ||
                Math.abs(transform.rotation - currentRotation) > 1)
            ) {
              setAssetTransforms((prev) => ({
                ...prev,
                [identity]: {
                  ...transform,
                  position: { x: currentBounds.x, y: currentBounds.y },
                  rotation: currentRotation,
                  scale: transform.scale || 1,
                },
              }));
            }
          } else {
            // Initialize transform if it doesn't exist
            setAssetTransforms((prev) => ({
              ...prev,
              [identity]: {
                opacity: 100,
                position: { x, y },
                rotation: deg,
                scale: 1,
              },
            }));
          }

          // Apply opacity
          if (opacity < 1) {
            ctx.save();
            ctx.globalAlpha = opacity;
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

          // Restore opacity
          if (opacity < 1) {
            ctx.restore();
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
    assetTransforms,
    compositionHierarchy,
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
    // Also include folders that have composition settings, even if empty
    const withSettings = new Set(Object.keys(compositionByFolder || {}));
    const all = new Set<string>([
      ...compositeFolderIds,
      ...Array.from(realized),
      ...Array.from(withSettings),
    ]);
    const result = Array.from(all).sort((a, b) => {
      const ai = parseInt(a.split("-")[2] || "0", 10);
      const bi = parseInt(b.split("-")[2] || "0", 10);
      return ai - bi;
    });
    return result;
  }, [mode, compositeFolderIds, drawingFrames, compositionByFolder]);

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

  // Delete handler for selected assets and nested compositions
  const handleDeleteSelected = () => {
    if (mode !== "composite") return;

    if (compSelectedAssetFolderId && compSelectedAssetIndex != null) {
      // Get regular frames for this folder
      const folderFrames = drawingFrames.filter(
        (d: any) => (d as any).folderId === compSelectedAssetFolderId
      );

      // Check if the selected index is a nested composition
      const nestedCompositions =
        compositionHierarchy.children[compSelectedAssetFolderId] || [];
      if (
        compSelectedAssetIndex >= folderFrames.length &&
        nestedCompositions.length > 0
      ) {
        // Deleting a nested composition
        const nestedIndex = compSelectedAssetIndex - folderFrames.length;
        if (nestedIndex < nestedCompositions.length) {
          const childId = nestedCompositions[nestedIndex];
          const nestedComp =
            compositionHierarchy.nestedCompositions[
              Object.keys(compositionHierarchy.nestedCompositions).find(
                (assetId) =>
                  compositionHierarchy.nestedCompositions[assetId]
                    .compositionId === childId
              ) || ""
            ];

          if (nestedComp && removeNestedComposition) {
            console.log("[DELETE] Removing nested composition:", {
              parentId: compSelectedAssetFolderId,
              childId: childId,
              assetId: nestedComp.assetId,
            });
            removeNestedComposition(
              compSelectedAssetFolderId,
              childId,
              nestedComp.assetId
            );

            // Clear selection
            setCompSelectedAssetFolderId(null);
            setCompSelectedAssetIndex(null);
          }
        }
      } else if (compSelectedAssetIndex < folderFrames.length) {
        // Deleting a regular asset - delegate to LayersPanel
        if (layersPanelRef.current?.handleDeleteSelectedAsset) {
          console.log(
            "[DELETE] Delegating regular asset deletion to LayersPanel"
          );
          layersPanelRef.current.handleDeleteSelectedAsset();
        }
      }
    }
  };

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
    onDelete: handleDeleteSelected,
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
                        className="bg-white shadow-md cursor-pointer"
                        onClick={(e) => {
                          // Handle canvas click for asset selection
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const y = e.clientY - rect.top;

                          // Get all frames for this composition and sort by rowId (back to front)
                          const activeFolderId = selectedLayerId;
                          if (!activeFolderId) return;

                          const allFrames = (() => {
                            const directFrames = drawingFrames.filter(
                              (df: any) => df.folderId === activeFolderId
                            );
                            const nestedCompositions =
                              compositionHierarchy.children[activeFolderId] ||
                              [];

                            if (nestedCompositions.length > 0) {
                              const allNestedFrames: any[] = [];
                              for (const childId of nestedCompositions) {
                                const childFrames = drawingFrames.filter(
                                  (df: any) => df.folderId === childId
                                );
                                allNestedFrames.push(...childFrames);
                              }
                              const combined = [
                                ...allNestedFrames,
                                ...directFrames,
                              ];
                              return combined.sort((a, b) => {
                                const aRowNum = parseInt(
                                  a.rowId.split("-")[1] || "0",
                                  10
                                );
                                const bRowNum = parseInt(
                                  b.rowId.split("-")[1] || "0",
                                  10
                                );
                                return aRowNum - bRowNum;
                              });
                            }

                            return directFrames;
                          })();

                          // Group frames by asset (each sequence or single image is one "asset")
                          const frameGroups = allFrames.reduce(
                            (groups, frame) => {
                              const key = `${frame.folderId}-${frame.rowId}`;
                              if (!groups[key]) groups[key] = frame; // Store first frame of each group
                              return groups;
                            },
                            {} as Record<string, any>
                          );

                          const groupKeys = Object.keys(frameGroups)
                            .sort()
                            .reverse(); // Front to back for hit testing

                          // Test click against each frame (from front to back)
                          for (let i = 0; i < groupKeys.length; i++) {
                            const frame = frameGroups[groupKeys[i]];
                            if (frame?.imageUrl) {
                              // Check if click is within this image's bounds
                              // For now, use a simple image bounds check
                              // In a more sophisticated implementation, you might use pixel-perfect collision detection
                              const img = new Image();
                              img.onload = () => {
                                const imgWidth = img.naturalWidth;
                                const imgHeight = img.naturalHeight;

                                // Simple bounds check (assumes image is centered)
                                const centerX = comp.width / 2;
                                const centerY = comp.height / 2;
                                const halfWidth = imgWidth / 2;
                                const halfHeight = imgHeight / 2;

                                if (
                                  x >= centerX - halfWidth &&
                                  x <= centerX + halfWidth &&
                                  y >= centerY - halfHeight &&
                                  y <= centerY + halfHeight
                                ) {
                                  // Found the clicked asset - calculate its index in UI order (sorted, not reversed)
                                  const sortedGroupKeys =
                                    Object.keys(frameGroups).sort();
                                  const assetIndex = sortedGroupKeys.indexOf(
                                    groupKeys[i]
                                  );

                                  console.log(
                                    "[CANVAS CLICK] Asset selected:",
                                    {
                                      frame: {
                                        folderId: frame.folderId,
                                        rowId: frame.rowId,
                                      },
                                      clickPos: { x, y },
                                      imageBounds: {
                                        centerX,
                                        centerY,
                                        width: imgWidth,
                                        height: imgHeight,
                                      },
                                      assetIndex,
                                      clickedGroupKey: groupKeys[i],
                                      sortedGroupKeys,
                                    }
                                  );

                                  // Trigger the same selection logic as clicking in the LayersPanel
                                  setTimeout(() => {
                                    console.log(
                                      "[CANVAS CLICK] Triggering asset selection:",
                                      {
                                        folderId: activeFolderId,
                                        index: assetIndex,
                                      }
                                    );
                                    setCompSelectedAssetFolderId(
                                      activeFolderId
                                    );
                                    setCompSelectedAssetIndex(assetIndex);
                                  }, 10);
                                  return;
                                }
                              };
                              img.src = frame.imageUrl;
                            }
                          }

                          console.log(
                            "[CANVAS CLICK] No asset found at click position:",
                            { x, y }
                          );
                        }}
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

                      // Get frames for this composition, including nested compositions
                      const directFrames = drawingFrames.filter(
                        (df) => df.folderId === activeFolderId
                      );

                      // Check if this composition is nested (child composition)
                      // If it is, show only its own frames, not parent frames
                      const isNestedComposition =
                        isCompositionNested(activeFolderId);

                      console.log(
                        "[TIMELINE RENDER DEBUG] Timeline composition check:",
                        {
                          activeFolderId,
                          isNestedComposition,
                          directFrames: directFrames.length,
                          hasNestedChildren:
                            (
                              compositionHierarchy.children[activeFolderId] ||
                              []
                            ).length > 0,
                        }
                      );

                      if (isNestedComposition) {
                        // For child compositions, show only their direct frames
                        console.log(
                          "[TIMELINE RENDER] Child composition - showing only direct frames:",
                          {
                            childId: activeFolderId,
                            directFrames: directFrames.length,
                          }
                        );

                        // For child compositions, restore original rowIds for proper isolation
                        // This ensures child compositions show R1 F1:6 instead of parent display rowIds
                        const framesWithOriginalRowIds = directFrames.map(
                          (frame) => ({
                            ...frame,
                            // Use original rowId if it exists, otherwise keep current rowId
                            rowId: (frame as any).originalRowId || frame.rowId,
                          })
                        );

                        console.log(
                          "[TIMELINE RENDER] Restored original rowIds for child composition:",
                          {
                            frameCount: framesWithOriginalRowIds.length,
                            rowIds: framesWithOriginalRowIds.map(
                              (f) => f.rowId
                            ),
                          }
                        );

                        return framesWithOriginalRowIds;
                      }

                      // If this composition has nested compositions, include their frames too
                      const nestedCompositions =
                        compositionHierarchy.children[activeFolderId] || [];
                      if (nestedCompositions.length > 0) {
                        console.log(
                          "[TIMELINE RENDER] Parent composition - including nested composition frames:",
                          {
                            parentId: activeFolderId,
                            nestedCompositions,
                            directFrames: directFrames.length,
                          }
                        );

                        // Collect all nested frames - use the newly created nested composition frames, not original child frames
                        const allNestedFrames: any[] = [];
                        for (const childCompositionId of nestedCompositions) {
                          // Find nested composition frames that were created for this child composition
                          const nestedCompFrames = drawingFrames.filter(
                            (df: any) =>
                              df.folderId === activeFolderId &&
                              df.isNestedCompositionFrame === true &&
                              df.sourceCompositionId === childCompositionId
                          );

                          console.log(
                            "[TIMELINE RENDER] Collecting nested comp frames:",
                            {
                              childCompositionId,
                              foundFrames: nestedCompFrames.length,
                              sampleFrame: nestedCompFrames[0]
                                ? {
                                    parentAssetId: (nestedCompFrames[0] as any)
                                      .parentAssetId,
                                    folderId: nestedCompFrames[0].folderId,
                                    isNestedCompositionFrame: (
                                      nestedCompFrames[0] as any
                                    ).isNestedCompositionFrame,
                                    sourceCompositionId: (
                                      nestedCompFrames[0] as any
                                    ).sourceCompositionId,
                                  }
                                : null,
                            }
                          );

                          allNestedFrames.push(...nestedCompFrames);
                        }

                        // Combine all frames and sort by rowId to respect user's reordering
                        // This maintains consistent ordering with canvas rendering
                        const allFrames = [...allNestedFrames, ...directFrames];

                        console.log(
                          "[TIMELINE RENDER] Combining frames for parent composition:",
                          {
                            directFrames: directFrames.length,
                            nestedFrames: allNestedFrames.length,
                            directRowIds: directFrames.map((f) => f.rowId),
                            nestedRowIds: allNestedFrames.map((f) => f.rowId),
                            totalFrames: allFrames.length,
                          }
                        );

                        // First, sort frames to get the correct visual order
                        const sortedFrames = allFrames.sort((a, b) => {
                          // Extract row number from rowId (e.g., "row-1", "row-2")
                          const aRowNum = parseInt(
                            a.rowId.split("-")[1] || "0",
                            10
                          );
                          const bRowNum = parseInt(
                            b.rowId.split("-")[1] || "0",
                            10
                          );

                          // If rowIds are the same, prioritize direct frames over nested frames
                          // This ensures direct frames appear in front when reordered
                          if (aRowNum === bRowNum) {
                            const aIsDirect = a.folderId === activeFolderId;
                            const bIsDirect = b.folderId === activeFolderId;

                            if (aIsDirect && !bIsDirect) return -1; // a (direct) comes before b (nested)
                            if (!aIsDirect && bIsDirect) return 1; // b (direct) comes before a (nested)
                            return 0; // Same type, maintain relative order
                          }

                          return aRowNum - bRowNum;
                        });

                        // Group frames by asset/composition and assign virtual display rowIds
                        // This ensures proper timeline display while preserving original rowIds
                        const frameGroups: { [key: string]: any[] } = {};
                        sortedFrames.forEach((frame) => {
                          let groupKey: string;
                          if (frame.folderId === activeFolderId) {
                            // Direct frames: group by assetId
                            groupKey = `direct-${frame.assetId}`;
                          } else {
                            // Nested frames: group by parent asset ID to distinguish duplicated compositions
                            const parentAssetId =
                              frame.parentAssetId || frame.folderId;
                            groupKey = `nested-${frame.folderId}-${parentAssetId}`;

                            console.log(
                              "[TIMELINE GROUPING DEBUG] Nested frame grouping:",
                              {
                                frameId: `${frame.folderId}|${frame.assetId}`,
                                parentAssetId: frame.parentAssetId,
                                folderId: frame.folderId,
                                assetId: frame.assetId,
                                groupKey,
                                fileName: frame.fileName,
                              }
                            );
                          }

                          if (!frameGroups[groupKey]) {
                            frameGroups[groupKey] = [];
                          }
                          frameGroups[groupKey].push(frame);
                        });

                        // Assign virtual display rowIds for parent composition view
                        let displayRowCounter = 1;
                        const framesWithDisplayRowIds = Object.values(
                          frameGroups
                        ).flatMap((group) => {
                          const displayRowId = `row-${displayRowCounter}`;
                          displayRowCounter++;

                          return group.map((frame) => ({
                            ...frame,
                            // Store both original rowId (for child composition isolation)
                            // and display rowId (for parent composition display)
                            originalRowId: frame.rowId,
                            displayRowId: displayRowId,
                            // Use displayRowId for parent composition timeline
                            rowId: displayRowId,
                          }));
                        });

                        console.log(
                          "[TIMELINE RENDER] Assigned display rowIds:",
                          {
                            totalGroups: Object.keys(frameGroups).length,
                            frameGroupKeys: Object.keys(frameGroups),
                            framesWithDisplayRowIds:
                              framesWithDisplayRowIds.length,
                          }
                        );

                        console.log(
                          "[TIMELINE GROUPING DEBUG] Final frame groups:",
                          {
                            groupKeys: Object.keys(frameGroups),
                            groupSizes: Object.keys(frameGroups).map((key) => ({
                              key,
                              count: frameGroups[key].length,
                              firstFrame:
                                frameGroups[key][0]?.fileName || "unknown",
                            })),
                          }
                        );

                        return framesWithDisplayRowIds;
                      }

                      return directFrames;
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
              // Composition hierarchy props for timeline isolation
              isChildComposition={
                mode === "composite" && selectedLayerId
                  ? isCompositionNested(selectedLayerId)
                  : false
              }
              compositionHierarchy={compositionHierarchy}
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
            console.log("[REORDER] Starting asset reorder:", {
              folderId,
              from,
              to,
            });

            // Reorder z-index for compositing by reordering the drawingFrames entries for this folder
            setDrawingFrames((prev) => {
              // For parent compositions with nested content, we need to handle both direct frames and nested frames
              const allFolderFrames = prev.filter(
                (df) => df.folderId === folderId
              );
              const nestedFrames: any[] = [];

              // Also include frames from nested compositions
              const nestedCompositions =
                compositionHierarchy.children[folderId] || [];
              for (const childId of nestedCompositions) {
                const childFrames = prev.filter(
                  (df) => df.folderId === childId
                );
                nestedFrames.push(...childFrames);
              }

              const allRelevantFrames = [...nestedFrames, ...allFolderFrames];

              console.log("[REORDER] Frame analysis:", {
                folderId,
                totalFrames: allRelevantFrames.length,
                directFrames: allFolderFrames.length,
                nestedFrames: nestedFrames.length,
                nestedCompositions,
              });

              // Group frames by asset/row - for sequences, we need to move all frames together
              const assetFrameGroups = allRelevantFrames.reduce((acc, df) => {
                const rowKey = df.rowId;
                if (!acc[rowKey]) acc[rowKey] = [];
                acc[rowKey].push(df);
                return acc;
              }, {} as Record<string, typeof prev>);

              const otherFrames = prev.filter(
                (df) =>
                  df.folderId !== folderId &&
                  !nestedCompositions.includes(df.folderId || "")
              );

              const groupKeys = Object.keys(assetFrameGroups).sort();

              console.log("[REORDER] Asset groups:", {
                groupKeys,
                groupCount: groupKeys.length,
                groups: Object.entries(assetFrameGroups).map(
                  ([key, frames]) => {
                    const typedFrames = frames as any[];
                    return {
                      key,
                      frameCount: typedFrames.length,
                      firstFrame: {
                        folderId: typedFrames[0]?.folderId,
                        rowId: typedFrames[0]?.rowId,
                      },
                    };
                  }
                ),
              });

              if (groupKeys.length <= 1) {
                console.log("[REORDER] Not enough groups to reorder");
                return prev;
              }

              // Reorder the asset groups
              const [movedGroup] = groupKeys.splice(from, 1);
              groupKeys.splice(to, 0, movedGroup);

              console.log("[REORDER] After reordering:", {
                movedGroup,
                newOrder: groupKeys,
                from,
                to,
              });

              // Reassign rowIds and flatten back to individual frames
              // CRITICAL: Only reassign rowIds for frames belonging to the active folder
              // This preserves nested composition isolation
              const reorderedFrames = groupKeys.flatMap((groupKey, idx) => {
                const newRowId = `row-${idx + 1}`;
                const frames = assetFrameGroups[groupKey];
                console.log("[REORDER] Reassigning rowId:", {
                  oldRowId: groupKey,
                  newRowId,
                  frameCount: frames.length,
                  folderId: frames[0]?.folderId,
                  isActiveFolder: frames[0]?.folderId === folderId,
                });
                return frames.map((df: any) => {
                  const shouldChangeRowId = df.folderId === folderId;
                  const resultRowId = shouldChangeRowId ? newRowId : df.rowId;

                  console.log("[REORDER] Frame rowId decision:", {
                    frameId: `${df.folderId}-${df.assetId}`,
                    originalRowId: df.rowId,
                    frameFolderId: df.folderId,
                    activeFolderId: folderId,
                    shouldChange: shouldChangeRowId,
                    resultRowId,
                  });

                  return {
                    ...df,
                    rowId: resultRowId,
                  };
                });
              });

              console.log("[REORDER] Final result:", {
                totalFrames: [...otherFrames, ...reorderedFrames].length,
                reorderedFrameCount: reorderedFrames.length,
                otherFrameCount: otherFrames.length,
              });

              return [...otherFrames, ...reorderedFrames];
            });

            // Force canvas redraw after reordering
            setTimeout(() => {
              console.log("[REORDER] Forcing canvas redraw after reorder");
              drawFrame();
            }, 10);

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

            // Create a unique key for this import operation to prevent duplicates
            const importKey = `${folderId}-${assets
              .map((a) => a.id || a.name)
              .join("-")}-${Date.now()}`;

            // Use a module-level Set to track recent imports and prevent duplicates
            const dedupKey = importKey.substring(0, importKey.lastIndexOf("-"));
            if (recentImports.has(dedupKey)) {
              console.log("[IMPORT DEBUG] Skipping duplicate import:", {
                importKey,
                folderId,
              });
              return;
            }
            recentImports.add(dedupKey);

            // Clean up old import keys after a short delay
            setTimeout(() => {
              recentImports.delete(dedupKey);
            }, 1000);

            setTimeout(
              () =>
                setDrawingFrames((prev) => {
                  // Get existing unique rows for this folder
                  const existingRowsForFolder = new Set(
                    prev
                      .filter((df) => df.folderId === folderId)
                      .map((df) => df.rowId)
                  );

                  // For parent compositions with nested compositions, we need to account for
                  // rows used by nested compositions to avoid row conflicts
                  let allVisibleRows = existingRowsForFolder;
                  const nestedCompositions =
                    compositionHierarchy.children[folderId] || [];
                  if (nestedCompositions.length > 0) {
                    // Include rows from nested compositions to avoid conflicts
                    const nestedRows = new Set(
                      prev
                        .filter(
                          (df) =>
                            df.folderId &&
                            nestedCompositions.includes(df.folderId)
                        )
                        .map((df) => df.rowId)
                    );
                    allVisibleRows = new Set([
                      ...existingRowsForFolder,
                      ...nestedRows,
                    ]);
                  }

                  console.log("[IMPORT DEBUG] Import starting:", {
                    folderId,
                    totalFramesBefore: prev.length,
                    existingRowsForFolder: Array.from(existingRowsForFolder),
                    existingRowsSize: existingRowsForFolder.size,
                    allVisibleRows: Array.from(allVisibleRows),
                    allVisibleRowsSize: allVisibleRows.size,
                    hasNestedCompositions: nestedCompositions.length > 0,
                    nestedCompositions,
                    assetsToImport: assets.length,
                    dedupKey,
                  });

                  const allNewFrames = [];
                  let currentRowNumber = allVisibleRows.size + 1; // Start from next available row considering all visible rows

                  // Process each asset
                  for (const asset of assets) {
                    const rowId = `row-${currentRowNumber}`;

                    console.log("[IMPORT DEBUG] Processing asset:", {
                      assetName: asset.name,
                      assetId: asset.id,
                      isSequence: asset.isSequence,
                      sequenceFrameCount: asset.sequenceFrames?.length,
                      isNestedComposition:
                        (asset as any).type === "nested-composition",
                      assignedRowId: rowId,
                      currentRowNumber,
                    });

                    // Handle nested composition assets
                    if ((asset as any).type === "nested-composition") {
                      const compositionId = (asset as any).compositionId;
                      console.log(
                        "[NESTED COMP RENDER] Processing nested composition:",
                        {
                          assetName: asset.name,
                          compositionId,
                          parentFolder: folderId,
                        }
                      );

                      // Get all frames from the child composition
                      const childFrames = prev.filter(
                        (df: any) => df.folderId === compositionId
                      );

                      if (childFrames.length > 0) {
                        // Create frames that represent the nested composition content
                        for (const childFrame of childFrames) {
                          console.log(
                            "[NESTED COMP FRAME CREATION] Creating frame with parentAssetId:",
                            {
                              assetName: asset.name,
                              assetId: asset.id,
                              parentAssetId: asset.id,
                              childFrameId: `${childFrame.folderId}|${childFrame.assetId}`,
                              fileName: `${asset.name} > ${childFrame.fileName}`,
                            }
                          );

                          allNewFrames.push({
                            rowId,
                            frameIndex: childFrame.frameIndex,
                            length: childFrame.length,
                            imageUrl: childFrame.imageUrl,
                            fileName: `${asset.name} > ${childFrame.fileName}`,
                            folderId,
                            assetId: asset.id, // Use the nested composition asset ID
                            parentAssetId: asset.id, // Add parent asset ID for unique grouping
                            isNestedCompositionFrame: true,
                            sourceCompositionId: compositionId,
                            sourceFrameId: `${childFrame.folderId}|${childFrame.assetId}|${childFrame.frameIndex}`,
                          });
                        }
                        console.log(
                          "[NESTED COMP RENDER] Created frames for nested composition:",
                          {
                            compositionId,
                            childFrameCount: childFrames.length,
                            newFrameCount: childFrames.length,
                          }
                        );
                      } else {
                        console.log(
                          "[NESTED COMP RENDER] No frames found in child composition:",
                          compositionId
                        );

                        console.log(
                          "[NESTED COMP FRAME CREATION] Creating placeholder frame with parentAssetId:",
                          {
                            assetName: asset.name,
                            assetId: asset.id,
                            parentAssetId: asset.id,
                            fileName: `${asset.name} (Empty)`,
                          }
                        );

                        // Create a placeholder frame
                        allNewFrames.push({
                          rowId,
                          frameIndex: 0,
                          length: 1,
                          imageUrl: "", // No image for empty composition
                          fileName: `${asset.name} (Empty)`,
                          folderId,
                          assetId: asset.id,
                          parentAssetId: asset.id, // Add parent asset ID for unique grouping
                          isNestedCompositionFrame: true,
                          sourceCompositionId: compositionId,
                        });
                      }
                    } else if (asset.isSequence && asset.sequenceFrames) {
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
                          assetId: asset.id, // Include asset ID for unique identification
                          sequenceIndex: i,
                          isSequenceFrame: true,
                        });
                      }
                    } else {
                      // For regular assets, create a single frame
                      const newFrame = {
                        rowId,
                        frameIndex: 0, // Regular images start at F1
                        length: 1,
                        imageUrl:
                          asset.url.endsWith(".tga") && asset.file
                            ? URL.createObjectURL(asset.file)
                            : asset.url,
                        fileName: asset.name,
                        folderId,
                        assetId: asset.id, // Include asset ID for unique identification
                      };

                      console.log(
                        `[COLOR EFFECTS DEBUG] Creating DrawingFrame for regular asset:`,
                        {
                          assetName: asset.name,
                          assetId: asset.id,
                          folderId,
                          newFrame,
                        }
                      );

                      allNewFrames.push(newFrame);
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

                  console.log("[IMPORT DEBUG] Import completed:", {
                    newFramesCreated: allNewFrames.length,
                    newFrameRowIds: [
                      ...new Set(allNewFrames.map((f) => f.rowId)),
                    ],
                    totalFramesAfter: after.length,
                  });

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

            // Get all frames for this composition (including nested ones) and sort by rowId
            const allFrames = (() => {
              const directFrames = drawingFrames.filter(
                (df: any) => df.folderId === folderId
              );
              const nestedCompositions =
                compositionHierarchy.children[folderId] || [];

              if (nestedCompositions.length > 0) {
                const allNestedFrames: any[] = [];
                for (const childId of nestedCompositions) {
                  const childFrames = drawingFrames.filter(
                    (df: any) => df.folderId === childId
                  );
                  allNestedFrames.push(...childFrames);
                }
                const combined = [...allNestedFrames, ...directFrames];
                return combined.sort((a, b) => {
                  const aRowNum = parseInt(a.rowId.split("-")[1] || "0", 10);
                  const bRowNum = parseInt(b.rowId.split("-")[1] || "0", 10);
                  return aRowNum - bRowNum;
                });
              }

              return directFrames;
            })();

            // Group frames by asset (each sequence or single image is one "asset")
            const frameGroups = allFrames.reduce((groups, frame) => {
              const key = `${frame.folderId}-${frame.rowId}`;
              if (!groups[key]) {
                groups[key] = frame; // Store the first frame of each group (represents the asset)
              }
              return groups;
            }, {} as Record<string, any>);

            // Also include nested composition assets as virtual assets
            const nestedCompositions =
              compositionHierarchy.children[folderId] || [];
            const virtualAssets: any[] = [];
            for (const childId of nestedCompositions) {
              const nestedComp =
                compositionHierarchy.nestedCompositions[
                  Object.keys(compositionHierarchy.nestedCompositions).find(
                    (assetId) =>
                      compositionHierarchy.nestedCompositions[assetId]
                        .compositionId === childId
                  ) || ""
                ];
              if (nestedComp) {
                // Create a virtual frame for the nested composition
                virtualAssets.push({
                  assetId: nestedComp.assetId,
                  folderId: folderId,
                  rowId: `row-${
                    Object.keys(frameGroups).length + virtualAssets.length + 1
                  }`,
                  isNestedComposition: true,
                  compositionId: childId,
                  name: nestedComp.name,
                  imageUrl: "virtual-nested-composition", // Mark as virtual
                });
              }
            }

            // Combine real frames and virtual nested composition assets
            const allAssets = [...Object.values(frameGroups), ...virtualAssets];

            // Get sorted asset keys to maintain consistent order
            const groupKeys = Object.keys(frameGroups).sort();
            const totalAssets = groupKeys.length + virtualAssets.length;

            console.log("[ASSET SELECTION] Frame groups:", {
              folderId,
              index,
              totalGroups: totalAssets,
              groupKeys,
              frameGroups: Object.values(frameGroups).map((f: any) => ({
                folderId: f.folderId,
                rowId: f.rowId,
                imageUrl: !!f.imageUrl,
              })),
              virtualAssets: virtualAssets.map((va: any) => ({
                assetId: va.assetId,
                name: va.name,
                compositionId: va.compositionId,
              })),
            });

            // Find the asset at the clicked index
            let targetAsset: any = null;
            if (index < groupKeys.length) {
              // Regular frame asset
              const targetGroupKey = groupKeys[index];
              targetAsset = frameGroups[targetGroupKey];
            } else {
              // Virtual nested composition asset
              const virtualIndex = index - groupKeys.length;
              if (virtualIndex < virtualAssets.length) {
                targetAsset = virtualAssets[virtualIndex];
              }
            }

            if (!targetAsset) {
              console.warn("[ASSET SELECTION] No asset found for selection:", {
                folderId,
                index,
                totalFrames: allFrames.length,
                totalAssets,
                availableFrames: allFrames.map((f) => ({
                  folderId: f.folderId,
                  rowId: f.rowId,
                  frameIndex: f.frameIndex,
                })),
                availableVirtualAssets: virtualAssets.map((va) => va.name),
              });
              return;
            }

            console.log("[ASSET SELECTION] Selected asset:", {
              folderId,
              index,
              selectedFrame: targetAsset.isNestedComposition
                ? {
                    assetId: targetAsset.assetId,
                    name: targetAsset.name,
                    compositionId: targetAsset.compositionId,
                    isNestedComposition: true,
                  }
                : {
                    folderId: targetAsset.folderId,
                    rowId: targetAsset.rowId,
                    frameIndex: targetAsset.frameIndex,
                  },
              totalFrames: allFrames.length,
            });

            // Set selection state
            setCompSelectedAssetFolderId(folderId);
            setCompSelectedAssetIndex(index);

            if (targetAsset.isNestedComposition) {
              // For nested compositions, set default bounds (no image to load)
              const w = comp.width * 0.8; // Default size as 80% of composition
              const h = comp.height * 0.8;
              const x = Math.round((comp.width - w) / 2);
              const y = Math.round((comp.height - h) / 2);

              // Use nested composition asset ID for identity
              const identity = `${folderId}|${targetAsset.assetId}`;
              const persisted = boundsByAsset[identity];
              if (persisted) {
                setCompImageBounds({ ...persisted });
              } else {
                setCompImageBounds({ x, y, width: w, height: h });
              }
            } else {
              // For regular assets, load image and set bounds
              const img = new Image();
              img.onload = () => {
                // do not reset rotation here; keep rotation keyed to asset identity
                const w = img.naturalWidth || comp.width;
                const h = img.naturalHeight || comp.height;
                const x = Math.round((comp.width - w) / 2);
                const y = Math.round((comp.height - h) / 2);
                // Prefer persisted bounds if available
                const identity =
                  targetAsset.isSequenceFrame && targetAsset.folderId
                    ? targetAsset.assetId
                      ? `${targetAsset.folderId}|${targetAsset.assetId}`
                      : targetAsset.folderId
                    : targetAsset.assetId
                    ? `${folderId}|${targetAsset.assetId}`
                    : `${folderId}|${
                        targetAsset.fileName || targetAsset.imageUrl || ""
                      }`;
                const persisted = boundsByAsset[identity];
                if (persisted) {
                  setCompImageBounds({ ...persisted });
                } else {
                  setCompImageBounds({ x, y, width: w, height: h });
                }
              };
              img.src = targetAsset.imageUrl;
            }
          }}
          drawingFrames={drawingFrames}
          setDrawingFrames={setDrawingFrames}
          assetEffects={assetEffects}
          onAssetEffectsChange={(identity, effects) => {
            console.log("[ASSET EFFECTS] Updating effects for identity:", {
              identity,
              effects,
              isUndefined: effects === undefined,
              isEmpty: effects && Object.keys(effects).length === 0,
            });

            if (effects === undefined || effects === null) {
              // Remove the asset from effects tracking completely
              setAssetEffects((prev) => {
                const newEffects = { ...prev };
                delete newEffects[identity];
                console.log("[ASSET EFFECTS] Removed identity from effects:", {
                  identity,
                  remainingEffects: Object.keys(newEffects),
                });
                return newEffects;
              });
            } else {
              // Update or add effects
              setAssetEffects((prev) => ({ ...prev, [identity]: effects }));
            }
          }}
          assetTransforms={assetTransforms}
          onAssetTransformsChange={(identity, transform) => {
            setAssetTransforms((prev) => ({ ...prev, [identity]: transform }));
          }}
          selectedAssetKey={selectedAssetKey}
          compositeFolderIds={compositeFolderIds}
          setCompositeFolderIds={setCompositeFolderIds}
          setRows={setRows}
          // Composition hierarchy props
          compositionHierarchy={compositionHierarchy}
          addNestedComposition={addNestedComposition}
          removeNestedComposition={removeNestedComposition}
          isCompositionNested={isCompositionNested}
          getNestedCompositionsInParent={getNestedCompositionsInParent}
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
