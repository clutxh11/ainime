"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useImperativeHandle,
} from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Edit3,
  Eye,
  EyeOff,
  Folder,
  MoreVertical,
  Copy,
} from "lucide-react";
import {
  detectImageSequence,
  processTGAFiles,
  cleanupBlobURLs,
  type ImageSequence,
} from "@/lib/utils/tga-utils";
import { SequenceImportModal } from "@/components/ui/SequenceImportModal";
import type { DrawingFrame } from "../timeline-grid";
import ColorEffectsPanel from "./ColorEffectsPanel";
import { TransformPanel, TransformSettings } from "./TransformPanel";
import type { AssetEffects } from "@/lib/utils/color-effects";
import {
  createProcessedImageBlob,
  hasEnabledEffects,
} from "@/lib/utils/color-effects";

export interface SidebarFolder {
  id: string;
  label: string;
  imageUrl?: string;
  fileName?: string;
  opacity?: number;
  visible?: boolean;
  locked?: boolean;
}

export interface LayersPanelProps {
  mode: "animate" | "storyboard" | "composite";
  selectedLayerId: string | null;
  setSelectedLayerId: (id: string | null) => void;
  selectedRow: string | null;
  sidebarFolders: SidebarFolder[];
  openFolders: Record<string, boolean>;
  setOpenFolders: (
    fn: (prev: Record<string, boolean>) => Record<string, boolean>
  ) => void;
  layerOpacities: Record<string, number>;
  setLayerOpacities: (
    fn: (prev: Record<string, number>) => Record<string, number>
  ) => void;
  folderLayers: Record<string, string[]>;
  layerOrder: Record<string, string[]>;
  layerVisibility: Record<string, boolean>;
  handleSidebarSelection: (layerId: string) => void;
  handleToggleVisibility: (layerId: string) => void;
  toggleFolder: (id: string) => void;
  handleAddLayer: (activeLayerId: string) => void;
  moveLayer: (
    folderId: string,
    layerId: string,
    direction: "up" | "down"
  ) => void;
  moveFrameFolderUp: (folderId: string) => void;
  moveFrameFolderDown: (folderId: string) => void;
  addFolder: () => void;
  deleteSelectedFolder: () => void;
  editingFolderId: string | null;
  setEditingFolderId: (id: string | null) => void;
  editingFolderValue: string;
  setEditingFolderValue: (v: string) => void;
  folderNames: Record<string, string>;
  setFolderNames: (
    fn: (prev: Record<string, string>) => Record<string, string>
  ) => void;
  editingLayerName: string | null;
  editingLayerValue: string;
  handleSaveRename: (layerId: string) => void;
  handleCancelRename: () => void;
  compositionByFolder?: Record<
    string,
    { width: number; height: number; fps: number }
  >;
  onSetComposition?: (
    folderId: string,
    s: { width: number; height: number; fps: number }
  ) => void;
  onFolderReceiveAssets?: (
    folderId: string,
    assets: {
      id: string;
      name: string;
      url: string;
      file?: File;
      isSequence?: boolean;
      sequenceFrames?: { file: File; blobUrl: string }[];
    }[]
  ) => void;
  // For frame stretching support
  drawingFrames?: DrawingFrame[];
  setDrawingFrames?: (fn: (prev: any[]) => any[]) => void;
  // Compositing only: notify when a specific asset in a folder is clicked
  onSelectCompAsset?: (folderId: string, index: number) => void;
  // Color effects system
  assetEffects?: Record<string, AssetEffects>;
  onAssetEffectsChange?: (identity: string, effects: AssetEffects) => void;
  // Transform system
  assetTransforms?: Record<
    string,
    import("@/components/editor/TransformPanel").TransformSettings
  >;
  onAssetTransformsChange?: (
    identity: string,
    transform: import("@/components/editor/TransformPanel").TransformSettings
  ) => void;
  selectedAssetKey?: string | null;
  // Compositing only: highlight selected asset
  selectedAssetFolderId?: string;
  selectedAssetIndex?: number;
  // Compositing only: reorder assets within a folder (affects z-order)
  onReorderCompAssets?: (
    folderId: string,
    fromIndex: number,
    toIndex: number
  ) => void;
  // Compositing only: folder management
  compositeFolderIds?: string[];
  setCompositeFolderIds?: (fn: (prev: string[]) => string[]) => void;
  // Timeline row management for cleanup
  setRows?: (fn: (prev: any[]) => any[]) => void;
  // Composition hierarchy props
  compositionHierarchy?: {
    children: Record<string, string[]>;
    parents: Record<string, string>;
    nestedCompositions: Record<string, any>;
  };
  addNestedComposition?: (
    parentId: string,
    childId: string,
    assetId: string,
    name: string,
    index: number
  ) => void;
  removeNestedComposition?: (
    parentId: string,
    childId: string,
    assetId: string
  ) => void;
  drawingFrames?: any[];
  assetEffects?: Record<string, any>;
  onAssetEffectsChange?: (assetIdentity: string, effects: any) => void;
  isCompositionNested?: (compositionId: string) => boolean;
  getNestedCompositionsInParent?: (parentId: string) => any[];
}

const LayersPanel = React.forwardRef<any, LayersPanelProps>((props, ref) => {
  const {
    mode,
    selectedLayerId,
    setSelectedLayerId,
    sidebarFolders,
    openFolders,
    toggleFolder,
    handleSidebarSelection,
    handleToggleVisibility,
    layerOpacities,
    setLayerOpacities,
    folderLayers,
    layerOrder,
    layerVisibility,
    moveLayer,
    moveFrameFolderUp,
    moveFrameFolderDown,
    addFolder,
    deleteSelectedFolder,
    editingFolderId,
    setEditingFolderId,
    editingFolderValue,
    setEditingFolderValue,
    folderNames,
    setFolderNames,
    editingLayerName,
    editingLayerValue,
    handleSaveRename,
    handleCancelRename,
    handleAddLayer,
    drawingFrames = [],
    setDrawingFrames,
    assetEffects = {},
    onAssetEffectsChange,
    assetTransforms = {},
    onAssetTransformsChange,
    selectedAssetKey,
  } = props;

  // Collapse states for panels - collapsed by default
  const [isTransformCollapsed, setIsTransformCollapsed] = useState(true);
  const [isColorEffectsCollapsed, setIsColorEffectsCollapsed] = useState(true);
  const [hiddenAssets, setHiddenAssets] = useState<Set<string>>(new Set());

  // Composition drag and drop state
  const [draggingComposition, setDraggingComposition] = useState<string | null>(
    null
  );
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  // Effect to monitor opacity changes and unhide assets if opacity is manually changed
  useEffect(() => {
    if (!props.assetTransforms) return;

    Object.entries(props.assetTransforms).forEach(([assetKey, transforms]) => {
      if (
        hiddenAssets.has(assetKey) &&
        transforms.opacity !== undefined &&
        transforms.opacity > 0
      ) {
        // Asset was hidden but opacity was manually changed to > 0, so unhide it
        setHiddenAssets((prev) => {
          const newSet = new Set(prev);
          newSet.delete(assetKey);
          return newSet;
        });
      }
    });
  }, [props.assetTransforms, hiddenAssets]);

  // Root assets (not in a folder) and per-folder assets for compositing mode
  type AssetItem = {
    id: string;
    name: string;
    url: string;
    file?: File;
    isSequence?: boolean;
    sequenceFrames?: { file: File; blobUrl: string }[];
  };
  const [rootAssets, setRootAssets] = React.useState<AssetItem[]>([]);

  // Helper function to get frame range for an asset
  const getAssetFrameRange = (folderId: string, assetIndex: number): string => {
    if (!compositionByFolder || !compositionByFolder[folderId]) {
      return `R${assetIndex + 1} F1`;
    }

    const asset = (assetsByFolder[folderId] || [])[assetIndex];
    if (!asset) return `R${assetIndex + 1} F1`;

    // Handle sequences
    if (asset.isSequence && asset.sequenceFrames) {
      return `R${assetIndex + 1} F1:${asset.sequenceFrames.length}`;
    }

    // Handle extended frames by looking at drawingFrames
    const targetRowId = `row-${assetIndex + 1}`;
    const matchingFrame = drawingFrames.find(
      (df) =>
        df.folderId === folderId &&
        df.rowId === targetRowId &&
        df.frameIndex === 0
    );

    if (matchingFrame && matchingFrame.length > 1) {
      const startFrame = matchingFrame.startFrame ?? matchingFrame.frameIndex;
      const endFrame = startFrame + matchingFrame.length - 1;
      return `R${assetIndex + 1} F${startFrame + 1}:${endFrame + 1}`;
    }

    return `R${assetIndex + 1} F1`;
  };
  const [assetsByFolder, setAssetsByFolder] = React.useState<
    Record<string, AssetItem[]>
  >({});

  // Sequence detection state
  const [sequenceModal, setSequenceModal] = React.useState<{
    open: boolean;
    sequence: ImageSequence | null;
    targetFolderId?: string;
    files: File[];
  }>({ open: false, sequence: null, targetFolderId: undefined, files: [] });

  // Track blob URLs for cleanup
  const blobUrlsRef = React.useRef<Set<string>>(new Set());

  // Helper: shorten long filenames for display while preserving the extension
  const formatDisplayName = React.useCallback(
    (name: string, max: number = 28) => {
      if (!name || name.length <= max) return name;
      const dotIndex = name.lastIndexOf(".");
      const hasExt = dotIndex > 0 && dotIndex < name.length - 1;
      const ext = hasExt ? name.slice(dotIndex) : "";
      const base = hasExt ? name.slice(0, dotIndex) : name;
      if (base.length + ext.length <= max) return name;
      const available = max - ext.length - 3; // reserve for ...
      const keepStart = Math.max(6, Math.floor(available * 0.6));
      const keepEnd = Math.max(4, available - keepStart);
      return `${base.slice(0, keepStart)}...${base.slice(-keepEnd)}${ext}`;
    },
    []
  );

  // Process files (including TGA decoding) and add them to the specified location
  const processAndAddFiles = async (files: File[], folderId?: string) => {
    try {
      // Process TGA files and convert to blob URLs
      const processedFiles = await processTGAFiles(files);

      const additions: AssetItem[] = processedFiles.map(({ file, blobUrl }) => {
        // Track blob URLs for cleanup
        blobUrlsRef.current.add(blobUrl);
        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: file.name,
          url: blobUrl,
          file,
        };
      });

      if (folderId) {
        // Add to specific folder
        setAssetsByFolder((prev) => {
          const items = prev[folderId] ? [...prev[folderId]] : [];
          // De-dupe by id
          const nextItems = [...items];
          additions.forEach((a) => {
            if (!nextItems.find((it) => it.id === a.id)) nextItems.push(a);
          });
          return { ...prev, [folderId]: nextItems };
        });

        // Notify parent ONLY if this folder has a Composition defined
        if (compositionByFolder[folderId]) {
          setTimeout(
            () => props.onFolderReceiveAssets?.(folderId, additions),
            0
          );
        }
      } else {
        // Add to root assets
        setRootAssets((prev) => [...prev, ...additions]);
      }
    } catch (error) {
      console.error("Failed to process files:", error);
      // Fallback: try to add files directly
      const additions: AssetItem[] = files.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        url: URL.createObjectURL(file),
        file,
      }));

      if (folderId) {
        setAssetsByFolder((prev) => {
          const items = prev[folderId] ? [...prev[folderId]] : [];
          const nextItems = [...items];
          additions.forEach((a) => {
            if (!nextItems.find((it) => it.id === a.id)) nextItems.push(a);
          });
          return { ...prev, [folderId]: nextItems };
        });

        if (compositionByFolder[folderId]) {
          setTimeout(
            () => props.onFolderReceiveAssets?.(folderId, additions),
            0
          );
        }
      } else {
        setRootAssets((prev) => [...prev, ...additions]);
      }
    }
  };

  // Handle sequence import confirmation
  const handleSequenceImport = async (importAsSequence: boolean) => {
    const { sequence, targetFolderId, files } = sequenceModal;
    if (!sequence) return;

    if (importAsSequence) {
      // Import as sequence: create a single sequence asset
      try {
        // Process all frames and get blob URLs
        const processedFrames = await processTGAFiles(sequence.frames);

        // Extract frame numbers from the first and last files
        const firstFrameNum =
          sequence.frames[0].name.match(/(\d+)/)?.[0] || "0001";
        const lastFrameNum =
          sequence.frames[sequence.frames.length - 1].name.match(
            /(\d+)/
          )?.[0] || "0001";

        // Create a single sequence asset with formatted name
        const sequenceAsset: AssetItem = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: `${sequence.baseName}[${firstFrameNum.padStart(
            4,
            "0"
          )}-${lastFrameNum.padStart(4, "0")}].${sequence.extension}`,
          url: processedFrames[0].blobUrl, // Use first frame as preview
          file: sequence.frames[0], // Store first frame as main file
          isSequence: true,
          sequenceFrames: processedFrames.map((pf) => ({
            file: pf.file,
            blobUrl: pf.blobUrl,
          })),
        };

        // Track all blob URLs for cleanup
        processedFrames.forEach((pf) => blobUrlsRef.current.add(pf.blobUrl));

        if (targetFolderId) {
          // Add to specific folder
          setAssetsByFolder((prev) => {
            const items = prev[targetFolderId] ? [...prev[targetFolderId]] : [];
            items.push(sequenceAsset);
            const newState = { ...prev, [targetFolderId]: items };

            // Notify parent if this folder is a composition
            if (
              props.onFolderReceiveAssets &&
              compositionByFolder[targetFolderId]
            ) {
              const newAssets = [sequenceAsset];
              props.onFolderReceiveAssets(targetFolderId, newAssets);
            }

            return newState;
          });
        } else {
          // Add to root assets
          setRootAssets((prev) => [...prev, sequenceAsset]);
        }
      } catch (error) {
        console.error("Failed to import sequence:", error);
      }
    } else {
      // Import as individual images
      await processAndAddFiles(files, targetFolderId);
    }

    // Close modal
    setSequenceModal((s) => ({ ...s, open: false }));
  };

  // Composition settings per folder (from parent if provided)
  const compositionByFolder = props.compositionByFolder || {};
  const [compositionModal, setCompositionModal] = React.useState<{
    open: boolean;
    folderId: string | null;
    width: number;
    height: number;
    fps: number;
  }>({ open: false, folderId: null, width: 1920, height: 1080, fps: 24 });

  // Duplicate selected asset (only assets, not folders)
  const handleDuplicateSelected = async () => {
    // Helper function to handle asset duplication with color effects
    const duplicateAssetWithEffects = async (
      originalAsset: AssetItem,
      existingNames: string[],
      assetIdentity: string
    ): Promise<AssetItem> => {
      const newAssetId = `asset-${Date.now()}-${Math.random()}`;
      const newAssetName = getDuplicateName(originalAsset.name, existingNames);

      // Check if the original asset has color effects
      const originalEffects = assetEffects?.[assetIdentity];
      if (originalEffects && hasEnabledEffects(originalEffects)) {
        try {
          console.log("[DUPLICATION] Processing asset with color effects:", {
            assetIdentity,
            effects: originalEffects,
            originalUrl: originalAsset.url,
            isSequence: originalAsset.isSequence,
            frameCount: originalAsset.sequenceFrames?.length || 1,
          });

          // Handle sequences vs single images differently
          if (originalAsset.isSequence && originalAsset.sequenceFrames) {
            console.log(
              "[DUPLICATION] Processing sequence with",
              originalAsset.sequenceFrames.length,
              "frames"
            );

            // Process all frames in the sequence
            const processedSequenceFrames = await Promise.all(
              originalAsset.sequenceFrames.map(async (frame, index) => {
                console.log(
                  `[DUPLICATION] Processing frame ${index + 1}:`,
                  frame.blobUrl
                );
                const processedBlobUrl = await createProcessedImageBlob(
                  frame.blobUrl,
                  originalEffects
                );
                return {
                  ...frame,
                  blobUrl: processedBlobUrl,
                };
              })
            );

            // Also process the main URL (typically the first frame)
            const processedMainUrl = await createProcessedImageBlob(
              originalAsset.url,
              originalEffects
            );

            console.log("[DUPLICATION] Sequence processing complete:", {
              originalFrameCount: originalAsset.sequenceFrames.length,
              processedFrameCount: processedSequenceFrames.length,
              originalMainUrl: originalAsset.url,
              processedMainUrl,
            });

            return {
              ...originalAsset,
              id: newAssetId,
              name: newAssetName,
              url: processedMainUrl,
              sequenceFrames: processedSequenceFrames,
            };
          } else {
            // Single image processing
            console.log("[DUPLICATION] Processing single image");

            // Create a new blob URL with effects baked in
            const processedBlobUrl = await createProcessedImageBlob(
              originalAsset.url,
              originalEffects
            );

            // Add cache-busting timestamp to force browser refresh
            console.log("[DUPLICATION] Single image URLs comparison:", {
              originalUrl: originalAsset.url,
              processedUrl: processedBlobUrl,
              sameUrl: originalAsset.url === processedBlobUrl,
            });

            // Return duplicated asset with processed blob URL
            return {
              ...originalAsset,
              id: newAssetId,
              name: newAssetName,
              url: processedBlobUrl,
            };
          }
        } catch (error) {
          console.error(
            "[DUPLICATION] Failed to process effects, using original:",
            error
          );
          // Fallback to regular duplication if processing fails
          return {
            ...originalAsset,
            id: newAssetId,
            name: newAssetName,
          };
        }
      }

      // No effects or processing failed - regular duplication
      return {
        ...originalAsset,
        id: newAssetId,
        name: newAssetName,
      };
    };

    // Check if there's a folder asset selected (composition mode)
    if (props.selectedAssetFolderId && props.selectedAssetIndex !== undefined) {
      const folderAssets = assetsByFolder[props.selectedAssetFolderId] || [];
      if (folderAssets.length > props.selectedAssetIndex) {
        const originalAsset = folderAssets[props.selectedAssetIndex];
        const existingNames = folderAssets.map((a) => a.name);

        // Create asset identity for effects lookup
        const assetIdentity = `${props.selectedAssetFolderId}|${originalAsset.id}`;

        const duplicatedAsset = await duplicateAssetWithEffects(
          originalAsset,
          existingNames,
          assetIdentity
        );

        setAssetsByFolder((prev) => ({
          ...prev,
          [props.selectedAssetFolderId!]: [...folderAssets, duplicatedAsset],
        }));

        // Debug: Log the actual asset URLs being stored
        console.log("[DUPLICATION] Final asset URLs:", {
          originalAsset: {
            name: originalAsset.name,
            url: originalAsset.url,
            id: originalAsset.id,
          },
          duplicatedAsset: {
            name: duplicatedAsset.name,
            url: duplicatedAsset.url,
            id: duplicatedAsset.id,
          },
          urlsMatch: originalAsset.url === duplicatedAsset.url,
        });

        // Handle effects for the duplicated asset
        const newAssetIdentity = `${props.selectedAssetFolderId}|${duplicatedAsset.id}`;
        const isNestedComposition =
          (originalAsset as any).type === "nested-composition";

        if (isNestedComposition) {
          // For nested compositions, preserve the original color effects
          console.log(
            "[DUPLICATION] Preserving effects for duplicated nested composition:",
            {
              newAssetIdentity,
              duplicatedAssetId: duplicatedAsset.id,
              originalAssetId: originalAsset.id,
            }
          );

          // Copy effects from original asset to duplicated asset
          if (props.onAssetEffectsChange && props.assetEffects) {
            const originalAssetIdentity = `${props.selectedAssetFolderId}|${originalAsset.id}`;
            const originalEffects = props.assetEffects[originalAssetIdentity];

            if (originalEffects) {
              console.log(
                "[DUPLICATION] Copying effects from original to duplicate:",
                {
                  originalAssetIdentity,
                  newAssetIdentity,
                  originalEffects,
                }
              );

              setTimeout(() => {
                props.onAssetEffectsChange!(newAssetIdentity, originalEffects);
              }, 100);
            }
          }
        } else {
          // For regular assets, clear effects (original behavior)
          console.log("[DUPLICATION] Clearing effects for duplicated asset:", {
            newAssetIdentity,
            duplicatedAssetId: duplicatedAsset.id,
          });
          if (props.onAssetEffectsChange) {
            // Use setTimeout to ensure this happens after the state update
            setTimeout(() => {
              // Pass undefined to completely remove the asset from effects tracking
              props.onAssetEffectsChange!(newAssetIdentity, undefined as any);
            }, 100); // Increased timeout to ensure state update completes
          }
        }

        // Notify parent about the new asset in the folder
        props.onFolderReceiveAssets?.(props.selectedAssetFolderId!, [
          duplicatedAsset,
        ]);
      }
      return;
    }

    // Handle regular selectedLayerId selection
    if (!selectedLayerId) return;

    // Check if it's a folder - if so, do nothing (folder duplication moved to three-dots menu)
    const selectedFolder = sidebarFolders.find((f) => f.id === selectedLayerId);
    if (selectedFolder) {
      return; // Folders are now duplicated via three-dots menu
    }

    // Check if it's an asset in root or folder
    const findAssetLocation = () => {
      // Check root assets
      const rootIndex = rootAssets.findIndex(
        (asset) => asset.id === selectedLayerId
      );
      if (rootIndex >= 0) {
        return {
          type: "root" as const,
          asset: rootAssets[rootIndex],
          index: rootIndex,
        };
      }

      // Check folder assets
      for (const [folderId, assets] of Object.entries(assetsByFolder)) {
        const assetIndex = assets.findIndex(
          (asset) => asset.id === selectedLayerId
        );
        if (assetIndex >= 0) {
          return {
            type: "folder" as const,
            folderId,
            asset: assets[assetIndex],
            index: assetIndex,
          };
        }
      }
      return null;
    };

    const location = findAssetLocation();
    if (!location) return;

    // Duplicate the asset
    const originalAsset = location.asset;
    const existingNames =
      location.type === "root"
        ? rootAssets.map((a) => a.name)
        : (assetsByFolder[location.folderId] || []).map((a) => a.name);

    // Create asset identity for effects lookup
    const assetIdentity =
      location.type === "root"
        ? `root|${originalAsset.id}`
        : `${location.folderId}|${originalAsset.id}`;

    const duplicatedAsset = await duplicateAssetWithEffects(
      originalAsset,
      existingNames,
      assetIdentity
    );

    if (location.type === "root") {
      setRootAssets((prev) => [...prev, duplicatedAsset]);

      // Clear effects for the duplicated asset after it's been added
      const newAssetIdentity = `root|${duplicatedAsset.id}`;
      console.log("[DUPLICATION] Clearing effects for duplicated root asset:", {
        newAssetIdentity,
        duplicatedAssetId: duplicatedAsset.id,
      });
      if (props.onAssetEffectsChange) {
        // Use setTimeout to ensure this happens after the state update
        setTimeout(() => {
          // Pass undefined to completely remove the asset from effects tracking
          props.onAssetEffectsChange!(newAssetIdentity, undefined as any);
        }, 100); // Increased timeout to ensure state update completes
      }
    } else if (location.type === "folder") {
      setAssetsByFolder((prev) => ({
        ...prev,
        [location.folderId]: [
          ...(prev[location.folderId] || []),
          duplicatedAsset,
        ],
      }));

      // Clear effects for the duplicated asset after it's been added
      const newAssetIdentity = `${location.folderId}|${duplicatedAsset.id}`;
      console.log(
        "[DUPLICATION] Clearing effects for duplicated folder asset:",
        {
          newAssetIdentity,
          duplicatedAssetId: duplicatedAsset.id,
          folderId: location.folderId,
        }
      );
      if (props.onAssetEffectsChange) {
        // Use setTimeout to ensure this happens after the state update
        setTimeout(() => {
          // Pass undefined to completely remove the asset from effects tracking
          props.onAssetEffectsChange!(newAssetIdentity, undefined as any);
        }, 100); // Increased timeout to ensure state update completes
      }

      // Notify parent about the new asset in the folder
      props.onFolderReceiveAssets?.(location.folderId, [duplicatedAsset]);
    }
  };

  // Composition drag and drop handlers
  const handleCompositionDragStart = (e: React.DragEvent, folderId: string) => {
    // Only allow dragging if this is a composition folder and not nested already
    if (
      !props.compositionByFolder?.[folderId] ||
      props.isCompositionNested?.(folderId)
    ) {
      e.preventDefault();
      return;
    }

    setDraggingComposition(folderId);
    e.dataTransfer.setData("text/composition-folder-id", folderId);
    e.dataTransfer.effectAllowed = "move";

    console.log("[COMPOSITION DRAG] Started dragging composition:", folderId);
  };

  const handleCompositionDragOver = (
    e: React.DragEvent,
    targetFolderId: string
  ) => {
    e.preventDefault();

    const draggingCompId = e.dataTransfer.getData("text/composition-folder-id");
    if (draggingCompId) {
      // Can't drop on self or into a nested composition
      if (
        draggingCompId === targetFolderId ||
        props.isCompositionNested?.(targetFolderId)
      ) {
        e.dataTransfer.dropEffect = "none";
        setDragOverTarget(null);
        return;
      }

      // Can only drop on composition folders
      if (!props.compositionByFolder?.[targetFolderId]) {
        e.dataTransfer.dropEffect = "none";
        setDragOverTarget(null);
        return;
      }

      e.dataTransfer.dropEffect = "move";
      setDragOverTarget(targetFolderId);
      return;
    }

    // If not dragging a composition, delegate to regular folder drag over (for file drops)
    onFolderDragOver(e);
  };

  const handleCompositionDrop = (
    e: React.DragEvent,
    targetFolderId: string
  ) => {
    e.preventDefault();

    // Check if this is a composition being dragged (for hierarchy)
    const draggingCompId = e.dataTransfer.getData("text/composition-folder-id");
    if (draggingCompId) {
      if (draggingCompId === targetFolderId) {
        setDragOverTarget(null);
        setDraggingComposition(null);
        return;
      }

      // Can't drop into nested compositions
      if (props.isCompositionNested?.(targetFolderId)) {
        console.warn("[COMPOSITION DRAG] Cannot drop into nested composition");
        setDragOverTarget(null);
        setDraggingComposition(null);
        return;
      }

      // Both must be compositions
      if (
        !props.compositionByFolder?.[draggingCompId] ||
        !props.compositionByFolder?.[targetFolderId]
      ) {
        console.warn("[COMPOSITION DRAG] Both folders must be compositions");
        setDragOverTarget(null);
        setDraggingComposition(null);
        return;
      }

      // Create nested composition asset - use actual folder name
      const nestedCompName =
        folderNames[draggingCompId] ||
        sidebarFolders.find((f) => f.id === draggingCompId)?.label ||
        `Composition ${draggingCompId.replace("row-", "").replace("-", ".")}`;
      const assetId = `nested-comp-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

      // Get current assets in target folder to determine index
      const currentAssets = assetsByFolder[targetFolderId] || [];
      const index = currentAssets.length;

      // Create a special asset representing the nested composition
      const nestedCompAsset = {
        id: assetId,
        name: nestedCompName,
        url: "", // Will be generated from the composition
        type: "nested-composition" as const,
        compositionId: draggingCompId,
        isComposition: true,
      };

      // Add the nested composition asset to the target folder
      setAssetsByFolder((prev) => ({
        ...prev,
        [targetFolderId]: [...(prev[targetFolderId] || []), nestedCompAsset],
      }));

      // Update hierarchy
      props.addNestedComposition?.(
        targetFolderId,
        draggingCompId,
        assetId,
        nestedCompName,
        index
      );

      // CRITICAL: Copy color effects from original child frames to nested composition
      // This ensures nested compositions retain their visual effects in the parent
      setTimeout(() => {
        console.log(
          "[NESTED COMP EFFECTS] Copying color effects from child to parent nested frames:",
          {
            parent: targetFolderId,
            child: draggingCompId,
            assetId,
          }
        );

        // Find the child composition frames to check for effects
        const childFrames = (props.drawingFrames || []).filter(
          (df: any) => df.folderId === draggingCompId
        );

        if (childFrames.length > 0) {
          // Check if any child frame has effects - use the first frame's assetId
          const firstChildFrame = childFrames[0];
          const childAssetIdentity = `${draggingCompId}|${firstChildFrame.assetId}`;
          const childEffects = props.assetEffects?.[childAssetIdentity];

          console.log("[NESTED COMP EFFECTS] Checking child effects:", {
            childAssetIdentity,
            hasEffects: !!childEffects,
            effects: childEffects,
            totalChildFrames: childFrames.length,
          });

          if (childEffects && Object.keys(childEffects).length > 0) {
            // Copy effects to the nested composition identity
            const nestedAssetIdentity = `${targetFolderId}|${assetId}`;

            console.log(
              "[NESTED COMP EFFECTS] Copying effects to nested composition:",
              {
                from: childAssetIdentity,
                to: nestedAssetIdentity,
                effects: childEffects,
              }
            );

            if (props.onAssetEffectsChange) {
              props.onAssetEffectsChange(nestedAssetIdentity, childEffects);
            }
          } else {
            console.log("[NESTED COMP EFFECTS] No child effects to copy");
          }
        } else {
          console.log(
            "[NESTED COMP EFFECTS] No child frames found for:",
            draggingCompId
          );
        }
      }, 200); // Delay to ensure frames are created

      console.log("[COMPOSITION DRAG] Created nested composition:", {
        parent: targetFolderId,
        child: draggingCompId,
        assetId,
        name: nestedCompName,
      });

      // Clean up drag state
      setDragOverTarget(null);
      setDraggingComposition(null);
      return;
    }

    // If not a composition drag, delegate to regular folder drop logic (for file drops)
    onFolderDrop(targetFolderId, e);
  };

  const handleCompositionDragEnd = () => {
    setDraggingComposition(null);
    setDragOverTarget(null);
  };

  // Duplicate folder functionality
  const handleDuplicateFolder = (folderId: string) => {
    const originalName =
      folderNames[folderId] ||
      sidebarFolders.find((f) => f.id === folderId)?.label ||
      "Folder";
    const duplicateName = getDuplicateName(
      originalName,
      Object.values(folderNames)
    );

    // Check if this is a composition folder (exists in compositeFolderIds or compositionByFolder)
    const isCompositionFolder =
      (props.compositeFolderIds &&
        props.compositeFolderIds.includes(folderId)) ||
      (compositionByFolder && compositionByFolder[folderId]);

    console.log("Duplicating folder:", {
      folderId,
      originalName,
      duplicateName,
      isCompositionFolder,
      compositeFolderIds: props.compositeFolderIds,
      hasCompositionSettings: !!compositionByFolder[folderId],
    });

    if (
      isCompositionFolder &&
      props.compositeFolderIds &&
      props.setCompositeFolderIds
    ) {
      console.log("Duplicating composition folder directly");

      // Generate new folder ID using the same logic as addFolder
      const targetRowId = "row-1";
      const realizedMax = drawingFrames
        ? Math.max(
            ...drawingFrames
              .filter((df: any) => df.rowId === targetRowId)
              .map((f: any) => f.frameIndex),
            -1
          )
        : -1;

      // Include all existing composition folder IDs to avoid conflicts
      const allExistingIds = [
        ...props.compositeFolderIds,
        // Also check sidebarFolders for any realized composition folders
        ...sidebarFolders.map((f) => f.id),
      ];

      const placeholderMax = allExistingIds.reduce(
        (acc: number, id: string) => {
          const parts = id.split("-");
          const idx = parseInt(parts[2] || "0", 10);
          return Number.isFinite(idx) ? Math.max(acc, idx) : acc;
        },
        -1
      );
      const nextIndex = Math.max(realizedMax, placeholderMax) + 1;
      const newFolderId = `${targetRowId}-${nextIndex}`;

      console.log("Creating new composition folder:", {
        newFolderId,
        realizedMax,
        placeholderMax,
        nextIndex,
        allExistingIds,
        compositeFolderIds: props.compositeFolderIds,
        sidebarFolderIds: sidebarFolders.map((f) => f.id),
      });

      // Add to compositeFolderIds
      props.setCompositeFolderIds((prev) => [...prev, newFolderId]);

      // Update the folder name
      setFolderNames((prev) => ({
        ...prev,
        [newFolderId]: duplicateName,
      }));

      // Copy composition settings if it's a composition folder
      if (compositionByFolder[folderId]) {
        const compSettings = compositionByFolder[folderId];
        console.log("Copying composition settings:", compSettings);
        props.onSetComposition?.(newFolderId, compSettings);
      }

      // Copy all assets from the original folder
      const originalAssets = assetsByFolder[folderId] || [];
      console.log("Original assets to copy:", originalAssets);

      if (originalAssets.length > 0) {
        const duplicatedAssets = originalAssets.map((asset, index) => ({
          ...asset,
          id: `asset-${Date.now()}-${index}-${Math.random()}`,
          // Don't add "Copy" to asset names since the folder already has "Copy" in its name
          name: asset.name,
        }));

        console.log("Duplicated assets:", duplicatedAssets);

        setAssetsByFolder((prev) => ({
          ...prev,
          [newFolderId]: duplicatedAssets,
        }));

        // Notify parent if there's a handler for folder receiving assets
        props.onFolderReceiveAssets?.(newFolderId, duplicatedAssets);
      }
    } else {
      // Handle regular folders (not composition folders) - create directly
      console.log("Duplicating regular folder directly");

      // Generate new folder ID using the same logic as composition folders
      const targetRowId = "row-1";
      const realizedMax = drawingFrames
        ? Math.max(
            ...drawingFrames
              .filter((df: any) => df.rowId === targetRowId)
              .map((f: any) => f.frameIndex),
            -1
          )
        : -1;

      // Include all existing folder IDs to avoid conflicts
      const allExistingIds = [
        ...sidebarFolders.map((f) => f.id),
        ...(props.compositeFolderIds || []),
      ];

      const placeholderMax = allExistingIds.reduce(
        (acc: number, id: string) => {
          const parts = id.split("-");
          const idx = parseInt(parts[2] || "0", 10);
          return Number.isFinite(idx) ? Math.max(acc, idx) : acc;
        },
        -1
      );
      const nextIndex = Math.max(realizedMax, placeholderMax) + 1;
      const newFolderId = `${targetRowId}-${nextIndex}`;

      console.log("Creating new regular folder:", {
        newFolderId,
        realizedMax,
        placeholderMax,
        nextIndex,
        allExistingIds,
        drawingFramesLength: drawingFrames?.length || 0,
        sidebarFolderIds: sidebarFolders.map((f) => f.id),
      });

      // Create a drawingFrame entry for the regular folder
      const newDrawingFrame = {
        rowId: targetRowId,
        frameIndex: nextIndex,
        length: 1,
        imageUrl: "",
        fileName: "",
        folderId: newFolderId, // This makes it a "realized" folder
      };

      // Add to drawingFrames (this makes it appear in sidebarFolders)
      props.setDrawingFrames?.((prev: any[]) => [...prev, newDrawingFrame]);

      // Update the folder name
      setFolderNames((prev) => ({
        ...prev,
        [newFolderId]: duplicateName,
      }));

      // Copy all assets from the original folder
      const originalAssets = assetsByFolder[folderId] || [];
      console.log("Original assets to copy:", originalAssets);

      if (originalAssets.length > 0) {
        const duplicatedAssets = originalAssets.map((asset, index) => ({
          ...asset,
          id: `asset-${Date.now()}-${index}-${Math.random()}`,
          // Don't add "Copy" to asset names since the folder already has "Copy" in its name
          name: asset.name,
        }));

        console.log("Duplicated assets:", duplicatedAssets);

        setAssetsByFolder((prev) => ({
          ...prev,
          [newFolderId]: duplicatedAssets,
        }));

        // Notify parent if there's a handler for folder receiving assets
        props.onFolderReceiveAssets?.(newFolderId, duplicatedAssets);
      }
    }
  };

  // Helper function to check if selected item is an asset (not a folder)
  const isSelectedAsset = (): boolean => {
    // Check if there's a folder asset selected (composition mode)
    if (props.selectedAssetFolderId && props.selectedAssetIndex !== undefined) {
      const folderAssets = assetsByFolder[props.selectedAssetFolderId] || [];
      return folderAssets.length > props.selectedAssetIndex;
    }

    // Check if there's a regular selectedLayerId
    if (!selectedLayerId) return false;

    // Check if it's a folder
    const selectedFolder = sidebarFolders.find((f) => f.id === selectedLayerId);
    if (selectedFolder) return false;

    // Check if it's an asset
    const rootIndex = rootAssets.findIndex(
      (asset) => asset.id === selectedLayerId
    );
    if (rootIndex >= 0) return true;

    // Check folder assets by ID
    for (const assets of Object.values(assetsByFolder)) {
      const assetIndex = assets.findIndex(
        (asset) => asset.id === selectedLayerId
      );
      if (assetIndex >= 0) return true;
    }

    return false;
  };

  // Helper function to generate unique duplicate names
  const getDuplicateName = (
    originalName: string,
    existingNames: string[]
  ): string => {
    // Check if the original name already has a "Copy" suffix
    const copyMatch = originalName.match(/^(.+) Copy( \d+)?$/);
    const baseName = copyMatch ? copyMatch[1] : originalName;

    let counter = 1;
    let newName = `${baseName} Copy`;

    while (existingNames.includes(newName)) {
      counter++;
      newName = `${baseName} Copy ${counter}`;
    }

    return newName;
  };

  // Hide/show asset functionality
  const handleToggleHideAsset = () => {
    if (
      !props.selectedAssetKey ||
      !props.selectedAssetFolderId ||
      props.selectedAssetIndex === undefined
    )
      return;

    const assetKey = props.selectedAssetKey;
    const isCurrentlyHidden = hiddenAssets.has(assetKey);

    if (isCurrentlyHidden) {
      // Show the asset - remove from hidden set and restore opacity
      setHiddenAssets((prev) => {
        const newSet = new Set(prev);
        newSet.delete(assetKey);
        return newSet;
      });

      // Restore opacity to 100 when showing the asset
      if (props.onAssetTransformsChange) {
        const currentTransforms = props.assetTransforms?.[assetKey] || {};
        props.onAssetTransformsChange(assetKey, {
          ...currentTransforms,
          opacity: 100,
        });
      }
    } else {
      // Hide the asset - add to hidden set and set opacity to 0
      setHiddenAssets((prev) => new Set(prev).add(assetKey));

      // Set opacity to 0 in transform settings
      if (props.onAssetTransformsChange) {
        const currentTransforms = props.assetTransforms?.[assetKey] || {};
        props.onAssetTransformsChange(assetKey, {
          ...currentTransforms,
          opacity: 0,
        });
      }
    }
  };

  // Delete asset functionality
  const handleDeleteSelectedAsset = () => {
    if (
      !props.selectedAssetKey ||
      !props.selectedAssetFolderId ||
      props.selectedAssetIndex === undefined
    )
      return;

    const folderId = props.selectedAssetFolderId;
    const assetIndex = props.selectedAssetIndex;
    const assetKey = props.selectedAssetKey;

    console.log("[DELETE DEBUG] Deleting asset:", {
      folderId,
      assetIndex,
      assetKey,
      drawingFramesBefore: props.drawingFrames?.length,
    });

    // Check if this is a nested composition
    const folderAssets = assetsByFolder[folderId] || [];
    const assetToDelete = folderAssets[assetIndex];
    const isNestedComposition = (assetToDelete as any)?.isComposition;

    console.log("[DELETE DEBUG] Asset type:", {
      isNestedComposition,
      assetName: assetToDelete?.name,
      compositionId: (assetToDelete as any)?.compositionId,
    });

    // Remove from assets by folder
    setAssetsByFolder((prev) => {
      const folderAssets = [...(prev[folderId] || [])];
      folderAssets.splice(assetIndex, 1);
      return { ...prev, [folderId]: folderAssets };
    });

    // If this is a nested composition, remove the hierarchy relationship
    if (isNestedComposition && (assetToDelete as any)?.compositionId) {
      const childCompositionId = (assetToDelete as any).compositionId;
      console.log("[DELETE DEBUG] Removing nested composition hierarchy:", {
        parentId: folderId,
        childId: childCompositionId,
        assetId: assetToDelete.id,
      });

      // Remove from composition hierarchy
      props.removeNestedComposition?.(
        folderId,
        childCompositionId,
        assetToDelete.id
      );
    }

    // Remove from drawing frames
    if (props.drawingFrames && props.setDrawingFrames) {
      if (isNestedComposition) {
        console.log(
          "[DELETE DEBUG] Skipping frame deletion for nested composition - preserving original composition frames"
        );

        // For nested compositions, we don't delete the actual drawing frames from the child composition
        // We just remove the hierarchy relationship (already done above)
        // The original composition folder and its frames remain intact
      } else {
        // For regular assets, proceed with normal deletion
        const framesForFolder = props.drawingFrames.filter(
          (f) => f.folderId === folderId
        );
        console.log(
          "[DELETE DEBUG] Frames for folder before deletion:",
          framesForFolder
        );

        const updatedFrames = props.drawingFrames.filter((frame) => {
          // Remove frames that match this asset
          if (frame.folderId === folderId) {
            // Check if this frame corresponds to the deleted asset by row position
            const rowIndex = parseInt(frame.rowId.split("-")[1], 10) - 1;
            console.log("[DELETE DEBUG] Checking frame:", {
              frameRowId: frame.rowId,
              parsedRowIndex: rowIndex,
              assetIndex,
              shouldKeep: rowIndex !== assetIndex,
            });
            return rowIndex !== assetIndex;
          }
          return true;
        });

        console.log("[DELETE DEBUG] Drawing frames after deletion:", {
          before: props.drawingFrames.length,
          after: updatedFrames.length,
          removed: props.drawingFrames.length - updatedFrames.length,
        });

        props.setDrawingFrames(() => updatedFrames);

        // Clean up unused timeline rows if this folder now has no frames
        const remainingFramesForFolder = updatedFrames.filter(
          (f) => f.folderId === folderId
        );
        if (remainingFramesForFolder.length === 0 && props.setRows) {
          // Remove any rows that were exclusively used by this folder
          props.setRows?.((prevRows: any[]) => {
            // In composite mode, each folder typically uses its own rows
            // We should clean up rows that have no frames across ALL folders
            const allRowsInUse = new Set(
              updatedFrames.map((frame) => frame.rowId)
            );

            console.log("[DELETE DEBUG] Cleaning up unused rows:", {
              allRowsInUse: Array.from(allRowsInUse),
              previousRowCount: prevRows.length,
            });

            const filteredRows = prevRows.filter((row) =>
              allRowsInUse.has(row.id)
            );

            // Keep at least one row for the timeline to function
            if (filteredRows.length === 0) {
              return [{ id: "row-1", name: "Row1" }];
            }

            return filteredRows;
          });
        }
      } // End of else block for regular assets
    } else {
      console.log(
        "[DELETE DEBUG] No drawingFrames or setDrawingFrames available"
      );
    }

    // Clear any transform/effects data for this asset
    setHiddenAssets((prev) => {
      const newSet = new Set(prev);
      newSet.delete(assetKey);
      return newSet;
    });

    // Clear transforms and effects
    if (props.onAssetTransformsChange && props.assetTransforms?.[assetKey]) {
      props.onAssetTransformsChange(assetKey, {});
    }
    if (props.onAssetEffectsChange && props.assetEffects?.[assetKey]) {
      props.onAssetEffectsChange(assetKey, undefined as any);
    }

    // Clear selection
    props.onAssetSelection?.(null, null);
  };

  // Delete folder functionality
  const handleDeleteFolder = (folderId: string) => {
    console.log("[DELETE FOLDER DEBUG] Deleting folder:", {
      folderId,
      drawingFramesBefore: props.drawingFrames?.length,
      folderFrames:
        props.drawingFrames?.filter((f) => f.folderId === folderId).length || 0,
    });

    // Remove from sidebar folders
    const updatedFolders = sidebarFolders.filter((f) => f.id !== folderId);

    // Remove from assets by folder
    setAssetsByFolder((prev) => {
      const newState = { ...prev };
      delete newState[folderId];
      return newState;
    });

    // Remove from composition folders if applicable
    if (
      props.compositeFolderIds?.includes(folderId) &&
      props.setCompositeFolderIds
    ) {
      props.setCompositeFolderIds((prev) =>
        prev.filter((id) => id !== folderId)
      );
    }

    // Clear any hidden assets in this folder
    setHiddenAssets((prev) => {
      const newSet = new Set(prev);
      prev.forEach((key) => {
        if (key.startsWith(`${folderId}|`)) {
          newSet.delete(key);
        }
      });
      return newSet;
    });

    // Clear folder name
    setFolderNames((prev) => {
      const newNames = { ...prev };
      delete newNames[folderId];
      return newNames;
    });

    // Clear selection if it was in this folder
    if (props.selectedAssetFolderId === folderId) {
      props.onAssetSelection?.(null, null);
    }

    // Update drawing frames to remove this folder
    if (props.drawingFrames && props.setDrawingFrames) {
      const updatedFrames = props.drawingFrames.filter(
        (frame) => frame.folderId !== folderId
      );

      console.log("[DELETE FOLDER DEBUG] Drawing frames update:", {
        before: props.drawingFrames.length,
        after: updatedFrames.length,
        removed: props.drawingFrames.length - updatedFrames.length,
      });

      props.setDrawingFrames(() => updatedFrames);
    } else {
      console.log(
        "[DELETE FOLDER DEBUG] No drawingFrames or setDrawingFrames available"
      );
    }
  };

  // Check if currently selected asset is hidden
  const isSelectedAssetHidden = (): boolean => {
    if (!props.selectedAssetKey) return false;
    return hiddenAssets.has(props.selectedAssetKey);
  };

  const onPanelDragOver = (e: React.DragEvent) => {
    if (mode !== "composite") return;
    e.preventDefault();
  };

  const onPanelDrop = async (e: React.DragEvent) => {
    if (mode !== "composite") return;
    e.preventDefault();
    e.stopPropagation();
    // If dragging an existing asset out of a folder, move to root
    const payload = e.dataTransfer.getData("application/x-asset-id");
    if (payload) {
      try {
        const data = JSON.parse(payload) as {
          source: "root" | "folder";
          folderId?: string;
          index: number;
        };
        if (data.source === "folder" && data.folderId) {
          setAssetsByFolder((prev) => {
            const list = [...(prev[data.folderId!] || [])];
            const [moved] = list.splice(data.index, 1);
            const next = { ...prev, [data.folderId!]: list } as Record<
              string,
              AssetItem[]
            >;
            if (moved) setRootAssets((ra) => [...ra, moved]);
            return next;
          });
          return;
        }
      } catch {}
    }
    // Files dropped onto panel → add to root assets
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length === 0) return;

    // Check for image sequence
    const sequence = detectImageSequence(files);
    if (sequence && sequence.frames.length >= 2) {
      setSequenceModal({
        open: true,
        sequence,
        targetFolderId: undefined,
        files,
      });
      return;
    }

    // Process files normally (including TGA decoding)
    await processAndAddFiles(files, undefined);
  };

  const onFolderDragOver = (e: React.DragEvent) => {
    if (mode !== "composite") return;
    e.preventDefault();
  };

  const onFolderDrop = (folderId: string, e: React.DragEvent) => {
    if (mode !== "composite") return;
    e.preventDefault();
    e.stopPropagation();
    const payload = e.dataTransfer.getData("application/x-asset-id");
    if (payload) {
      try {
        const data = JSON.parse(payload) as {
          source: "root" | "folder";
          folderId?: string;
          index: number;
        };
        if (data.source === "root") {
          setRootAssets((prev) => {
            const list = [...prev];
            const [moved] = list.splice(data.index, 1);
            if (moved) {
              setAssetsByFolder((pf) => {
                const items = pf[folderId] ? [...pf[folderId]] : [];
                if (!items.find((it) => it.id === moved.id)) {
                  items.push(moved);
                }
                return { ...pf, [folderId]: items };
              });
              // Only notify parent if this folder is a Composition
              if (compositionByFolder[folderId]) {
                setTimeout(
                  () => props.onFolderReceiveAssets?.(folderId, [moved]),
                  0
                );
              }
            }
            return list;
          });
          return;
        }
        if (data.source === "folder" && data.folderId) {
          setAssetsByFolder((prev) => {
            const from = [...(prev[data.folderId!] || [])];
            const [moved] = from.splice(data.index, 1);
            const to = prev[folderId] ? [...prev[folderId]] : [];
            if (moved && !to.find((it) => it.id === moved.id)) to.push(moved);
            return { ...prev, [data.folderId!]: from, [folderId]: to };
          });
          return;
        }
      } catch {}
    }
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length === 0) return;

    // Check for image sequence
    const sequence = detectImageSequence(files);
    if (sequence && sequence.frames.length >= 2) {
      setSequenceModal({
        open: true,
        sequence,
        targetFolderId: folderId,
        files,
      });
      return;
    }

    // Process files normally (including TGA decoding)
    processAndAddFiles(files, folderId);
  };

  // Sync nested composition names when folder names change
  React.useEffect(() => {
    // Update nested composition names when folder names change
    setAssetsByFolder((prevAssets) => {
      const updatedAssets = { ...prevAssets };
      let hasChanges = false;

      Object.keys(updatedAssets).forEach((folderId) => {
        const assets = updatedAssets[folderId];
        if (assets) {
          const updatedFolderAssets = assets.map((asset) => {
            if ((asset as any).isComposition && (asset as any).compositionId) {
              const compositionId = (asset as any).compositionId;
              const expectedName =
                folderNames[compositionId] ||
                `Composition ${compositionId
                  .replace("row-", "")
                  .replace("-", ".")}`;

              if (asset.name !== expectedName) {
                hasChanges = true;
                return { ...asset, name: expectedName };
              }
            }
            return asset;
          });

          if (hasChanges) {
            updatedAssets[folderId] = updatedFolderAssets;
          }
        }
      });

      return hasChanges ? updatedAssets : prevAssets;
    });
  }, [folderNames]);

  // Cleanup blob URLs when component unmounts
  React.useEffect(() => {
    return () => {
      // Clean up all tracked blob URLs
      const urlsToCleanup = Array.from(blobUrlsRef.current);
      cleanupBlobURLs(urlsToCleanup);
      blobUrlsRef.current.clear();
    };
  }, []); // No dependencies - only cleanup on unmount

  // Expose methods to parent via ref
  React.useImperativeHandle(ref, () => ({
    processAndAddFiles,
    onPanelDrop,
  }));

  return (
    <div
      className="w-80 bg-gray-800 border-l border-gray-700 p-4 flex flex-col"
      onDragOver={onPanelDragOver}
      onDrop={onPanelDrop}
    >
      <div className="flex-shrink-0">
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

        <div className="mb-2">
          <h2 className="text-base font-semibold text-gray-200">
            {mode === "composite" ? "Assets" : "Layers"}
          </h2>
          {mode === "composite" && (
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={addFolder}
                  className="w-8 h-8"
                  title="New Folder"
                >
                  <Folder className="w-5 h-5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleDuplicateSelected}
                  className="w-8 h-8"
                  title="Duplicate Selected Asset"
                  disabled={!isSelectedAsset()}
                >
                  <Copy className="w-5 h-5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleToggleHideAsset}
                  className={`w-8 h-8 ${
                    isSelectedAssetHidden()
                      ? "bg-blue-600/20 text-blue-400"
                      : ""
                  }`}
                  title={
                    isSelectedAssetHidden()
                      ? "Show Selected Asset"
                      : "Hide Selected Asset"
                  }
                  disabled={!isSelectedAsset()}
                >
                  {isSelectedAssetHidden() ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </Button>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleDeleteSelectedAsset}
                className="w-8 h-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                title="Delete Selected Asset"
                disabled={!isSelectedAsset()}
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            {mode !== "composite" && (
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
            )}
            {mode !== "composite" && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (!selectedLayerId) return;
                }}
                className="w-8 h-8 text-red-500 hover:text-red-400"
                disabled={!selectedLayerId}
                title="Delete Layer"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        <div className="mb-2" />

        {mode === "composite" && rootAssets.length > 0 && (
          <div className="mb-3 space-y-1">
            {rootAssets.map((a, idx) => (
              <div
                key={a.id}
                className="flex items-center gap-2 bg-gray-700/80 hover:bg-gray-600 rounded px-2 py-1 text-xs text-gray-100"
                draggable
                onDragStart={(e) =>
                  e.dataTransfer.setData(
                    "application/x-asset-id",
                    JSON.stringify({ source: "root", index: idx })
                  )
                }
              >
                <span className="truncate flex-1">
                  {formatDisplayName(a.name)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Opacity controls are not applicable to the Assets panel (composite mode) */}
        {mode !== "composite" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-medium">
              <Label htmlFor="opacity-slider">Opacity</Label>
              <span className="text-gray-300">
                {Math.round(
                  (selectedLayerId ? layerOpacities[selectedLayerId] ?? 1 : 1) *
                    100
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
                setLayerOpacities((prev) => ({
                  ...prev,
                  [selectedLayerId]: v / 100,
                }))
              }
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        )}
      </div>

      {/* Transform and Color Effects Panels - always visible */}
      {(onAssetTransformsChange || onAssetEffectsChange) && (
        <>
          <div className="border-b border-gray-600 my-3 flex-shrink-0" />

          {/* Transform Panel */}
          {onAssetTransformsChange && (
            <div className="mb-3">
              <TransformPanel
                assetIdentity={selectedAssetKey || "no-selection"}
                transform={
                  selectedAssetKey && assetTransforms[selectedAssetKey]
                    ? assetTransforms[selectedAssetKey]
                    : {
                        opacity: 100,
                        position: { x: 0, y: 0 },
                        rotation: 0,
                        scale: 1,
                      }
                }
                onTransformChange={(identity, transform) => {
                  if (selectedAssetKey) {
                    onAssetTransformsChange?.(selectedAssetKey, transform);
                    // TODO: Sync position, rotation, and scale changes back to the canvas state
                    // This would require additional props to update boundsByAsset and rotationByAsset
                  }
                }}
                isCollapsed={isTransformCollapsed}
                onToggleCollapse={() =>
                  setIsTransformCollapsed(!isTransformCollapsed)
                }
                disabled={!selectedAssetKey}
              />
            </div>
          )}

          {/* Color Effects Panel */}
          {onAssetEffectsChange && (
            <div className="mb-3">
              <ColorEffectsPanel
                assetIdentity={selectedAssetKey || "no-selection"}
                effects={
                  selectedAssetKey && assetEffects[selectedAssetKey]
                    ? assetEffects[selectedAssetKey]
                    : {}
                }
                onEffectsChange={(identity, effects) => {
                  if (selectedAssetKey) {
                    onAssetEffectsChange(selectedAssetKey, effects);
                  }
                }}
                isCollapsed={isColorEffectsCollapsed}
                onToggleCollapse={() =>
                  setIsColorEffectsCollapsed(!isColorEffectsCollapsed)
                }
              />
            </div>
          )}
        </>
      )}

      <div className="border-b border-gray-600 my-4 flex-shrink-0" />

      <ScrollArea className="flex-1 pr-2">
        <div className="space-y-2">
          {sidebarFolders.map((folder) => {
            const isComposition = !!props.compositionByFolder?.[folder.id];
            const isNested = props.isCompositionNested?.(folder.id);
            const isDragging = draggingComposition === folder.id;
            const isDropTarget = dragOverTarget === folder.id;

            return (
              <div
                key={folder.id}
                className={`bg-gray-700 rounded shadow overflow-hidden ${
                  isDragging
                    ? "opacity-50 scale-95 transform transition-all"
                    : ""
                } ${
                  isDropTarget ? "ring-2 ring-blue-400 shadow-blue-400/50" : ""
                }`}
              >
                <div
                  className={`flex items-center p-2 border-b border-gray-600 ${
                    selectedLayerId === folder.id
                      ? "bg-blue-600 text-white"
                      : ""
                  }`}
                  draggable={isComposition && !isNested}
                  onDragStart={(e) =>
                    isComposition
                      ? handleCompositionDragStart(e, folder.id)
                      : undefined
                  }
                  onDragOver={(e) =>
                    isComposition
                      ? handleCompositionDragOver(e, folder.id)
                      : onFolderDragOver(e)
                  }
                  onDrop={(e) =>
                    isComposition
                      ? handleCompositionDrop(e, folder.id)
                      : onFolderDrop(folder.id, e)
                  }
                  onDragEnd={handleCompositionDragEnd}
                >
                  <div
                    className="flex items-center gap-2 cursor-pointer flex-shrink-0"
                    onClick={() => toggleFolder(folder.id)}
                  >
                    {openFolders[folder.id] ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                  <div
                    className="flex items-center gap-2 cursor-pointer ml-2 flex-1 min-w-0"
                    onClick={(e) => {
                      console.log("[LayersPanel] Folder clicked", {
                        folderId: folder.id,
                        event: e,
                        target: e.target,
                        currentTarget: e.currentTarget,
                        timeStamp: e.timeStamp,
                      });
                      handleSidebarSelection(folder.id);
                    }}
                  >
                    <Folder className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {editingFolderId === folder.id ? (
                      <input
                        className="text-xs bg-gray-800 text-white px-2 py-1 rounded border border-gray-600"
                        value={editingFolderValue}
                        onChange={(e) => setEditingFolderValue(e.target.value)}
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
                      <span className="font-medium text-xs truncate">
                        {folderNames[folder.id] || folder.label}
                      </span>
                    )}
                    {compositionByFolder[folder.id] && (
                      <span className="ml-2 text-[9px] px-1 py-0.5 rounded bg-gray-700/70 text-gray-300 uppercase tracking-wide flex-shrink-0">
                        Composition
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-auto flex-shrink-0">
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="text-gray-300 hover:text-white px-1"
                          title="Folder Settings"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onClick={() => handleDuplicateFolder(folder.id)}
                        >
                          Duplicate Folder
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingFolderId(folder.id);
                            setEditingFolderValue(
                              folderNames[folder.id] || folder.label
                            );
                          }}
                        >
                          Rename
                        </DropdownMenuItem>
                        {mode === "composite" && (
                          <DropdownMenuItem
                            onClick={() =>
                              setCompositionModal({
                                open: true,
                                folderId: folder.id,
                                width:
                                  compositionByFolder[folder.id]?.width || 1920,
                                height:
                                  compositionByFolder[folder.id]?.height ||
                                  1080,
                                fps: compositionByFolder[folder.id]?.fps || 24,
                              })
                            }
                          >
                            Create Composition
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDeleteFolder(folder.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        >
                          Delete Folder
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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
                {openFolders[folder.id] && (
                  <div className="py-2 flex flex-col gap-1">
                    {mode === "composite" &&
                      (assetsByFolder[folder.id] || []).length > 0 && (
                        <div className="px-1 pb-2">
                          {(assetsByFolder[folder.id] || []).map((a, idx) => (
                            <div
                              key={a.id}
                              className={`flex items-center gap-1.5 text-xs rounded px-1.5 py-1 cursor-pointer min-w-0 ${
                                props.selectedAssetFolderId === folder.id &&
                                props.selectedAssetIndex === idx
                                  ? "bg-blue-600 text-white"
                                  : "bg-gray-700/60 hover:bg-gray-600 text-gray-200"
                              }`}
                              draggable
                              onDragStart={(e) =>
                                e.dataTransfer.setData(
                                  "application/x-asset-id",
                                  JSON.stringify({
                                    source: "folder",
                                    folderId: folder.id,
                                    index: idx,
                                  })
                                )
                              }
                              onClick={() =>
                                props.onSelectCompAsset?.(folder.id, idx)
                              }
                              onDoubleClick={() => {
                                if ((a as any).isComposition) {
                                  // TODO: Navigate to the nested composition for editing
                                  console.log(
                                    "[NESTED COMP] Double-click to edit:",
                                    {
                                      nestedCompId: (a as any).compositionId,
                                      assetName: a.name,
                                      parentCompId: folder.id,
                                    }
                                  );
                                  alert(
                                    `Navigation to nested composition "${a.name}" will be implemented in the next phase!`
                                  );
                                }
                              }}
                              title={
                                (a as any).isComposition
                                  ? `Nested Composition: ${a.name}\nSource: ${
                                      (a as any).compositionId
                                    }\nDouble-click to edit nested composition`
                                  : undefined
                              }
                            >
                              {compositionByFolder[folder.id] && (
                                <span className="inline-flex items-center justify-center rounded bg-gray-800/80 px-1.5 py-0.5 text-[10px] text-gray-300 flex-shrink-0">
                                  {getAssetFrameRange(folder.id, idx)}
                                </span>
                              )}
                              <div className="flex-1 flex items-center gap-1 min-w-0">
                                {a.isSequence && (
                                  <span className="inline-flex items-center justify-center rounded bg-purple-600/80 px-1.5 py-0.5 text-[9px] text-white font-medium flex-shrink-0">
                                    SEQ
                                  </span>
                                )}
                                {(a as any).isComposition && (
                                  <span className="inline-flex items-center justify-center rounded bg-orange-600/80 px-1.5 py-0.5 text-[9px] text-white font-medium flex-shrink-0 ring-1 ring-orange-400/50">
                                    COMP
                                  </span>
                                )}
                                <span className="truncate text-xs">
                                  {formatDisplayName(a.name, 18)}
                                </span>
                              </div>
                              {/* Reorder controls (compositing only) */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  className="text-gray-300 hover:text-white disabled:opacity-40"
                                  title="Move Up"
                                  disabled={idx === 0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAssetsByFolder((prev) => {
                                      const items = [
                                        ...(prev[folder.id] || []),
                                      ];
                                      const target = Math.max(0, idx - 1);
                                      const [m] = items.splice(idx, 1);
                                      items.splice(target, 0, m);
                                      const next = {
                                        ...prev,
                                        [folder.id]: items,
                                      };
                                      return next;
                                    });
                                    props.onReorderCompAssets?.(
                                      folder.id,
                                      idx,
                                      idx - 1
                                    );
                                  }}
                                >
                                  <ChevronUp className="w-3 h-3" />
                                </button>
                                <button
                                  className="text-gray-300 hover:text-white disabled:opacity-40"
                                  title="Move Down"
                                  disabled={
                                    idx ===
                                    (assetsByFolder[folder.id] || []).length - 1
                                  }
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAssetsByFolder((prev) => {
                                      const items = [
                                        ...(prev[folder.id] || []),
                                      ];
                                      const target = Math.min(
                                        items.length - 1,
                                        idx + 1
                                      );
                                      const [m] = items.splice(idx, 1);
                                      items.splice(target, 0, m);
                                      const next = {
                                        ...prev,
                                        [folder.id]: items,
                                      };
                                      return next;
                                    });
                                    props.onReorderCompAssets?.(
                                      folder.id,
                                      idx,
                                      idx + 1
                                    );
                                  }}
                                >
                                  <ChevronDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    {mode !== "composite" &&
                      (layerOrder[folder.id] || []).map(
                        (layerId, layerIndex) => {
                          const isMain = layerId.endsWith("-main");
                          const extraIndex = isMain
                            ? -1
                            : parseInt(layerId.split("-extra-")[1], 10);
                          const layerName = isMain
                            ? folder.fileName
                              ? folder.fileName.split(".")[0]
                              : "Untitled.1"
                            : folderLayers[folder.id]?.[extraIndex] ||
                              `Untitled.${extraIndex + 2}`;
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
                                      setEditingFolderValue(e.target.value)
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
                                    // Parent handles renaming; we trigger with current label
                                  }}
                                />
                                <div className="text-xs text-gray-300">
                                  {Math.round(
                                    (layerOpacities[layerId] ?? 1) * 100
                                  )}
                                  %
                                </div>
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
            );
          })}
        </div>
      </ScrollArea>

      {/* Composition Settings Modal */}
      <Dialog
        open={compositionModal.open}
        onOpenChange={(open) => setCompositionModal((s) => ({ ...s, open }))}
      >
        <DialogContent
          className="sm:max-w-md"
          aria-describedby="composition-desc"
        >
          <DialogHeader>
            <DialogTitle>Composition Settings</DialogTitle>
          </DialogHeader>
          <p className="sr-only" id="composition-desc">
            Define the width, height and frame rate for this composition folder.
          </p>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-1">
              <Label htmlFor="comp-width">Width</Label>
              <Input
                id="comp-width"
                type="number"
                value={compositionModal.width}
                onChange={(e) =>
                  setCompositionModal((s) => ({
                    ...s,
                    width: parseInt(e.target.value || "0", 10) || 0,
                  }))
                }
              />
            </div>
            <div className="col-span-1">
              <Label htmlFor="comp-height">Height</Label>
              <Input
                id="comp-height"
                type="number"
                value={compositionModal.height}
                onChange={(e) =>
                  setCompositionModal((s) => ({
                    ...s,
                    height: parseInt(e.target.value || "0", 10) || 0,
                  }))
                }
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="comp-fps">Frame Rate</Label>
              <Input
                id="comp-fps"
                type="number"
                value={compositionModal.fps}
                onChange={(e) =>
                  setCompositionModal((s) => ({
                    ...s,
                    fps: parseInt(e.target.value || "0", 10) || 0,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter aria-describedby="composition-desc">
            <Button
              onClick={() => {
                if (!compositionModal.folderId) return;
                const folderId = compositionModal.folderId!;
                props.onSetComposition?.(folderId, {
                  width: compositionModal.width,
                  height: compositionModal.height,
                  fps: compositionModal.fps,
                });
                // If this folder already has assets, materialize ALL of them to R1 F1, R2 F1, ... (in order)
                if (mode === "composite") {
                  const items = assetsByFolder[folderId] || [];
                  if (items.length > 0) {
                    console.log(
                      "[Composite] Create Composition OK, materialize all assets",
                      { folderId, count: items.length }
                    );
                    // Send all assets in one call to prevent duplicate timeline entries
                    if (items.length > 0) {
                      setTimeout(() => {
                        props.onFolderReceiveAssets?.(folderId, items);
                      }, 5);
                    }
                  }
                }
                setCompositionModal((s) => ({ ...s, open: false }));
              }}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sequence Import Modal */}
      <SequenceImportModal
        sequence={sequenceModal.sequence}
        isOpen={sequenceModal.open}
        onClose={() => setSequenceModal((s) => ({ ...s, open: false }))}
        onConfirm={handleSequenceImport}
      />
    </div>
  );
});

LayersPanel.displayName = "LayersPanel";

export default LayersPanel;
