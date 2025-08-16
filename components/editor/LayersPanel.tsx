"use client";

import React from "react";
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
import type { AssetEffects } from "@/lib/utils/color-effects";

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
  // Compositing only: notify when a specific asset in a folder is clicked
  onSelectCompAsset?: (folderId: string, index: number) => void;
  // Color effects system
  assetEffects?: Record<string, AssetEffects>;
  onAssetEffectsChange?: (identity: string, effects: AssetEffects) => void;
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
    assetEffects = {},
    onAssetEffectsChange,
    selectedAssetKey,
  } = props;

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
  const handleDuplicateSelected = () => {
    // Check if there's a folder asset selected (composition mode)
    if (props.selectedAssetFolderId && props.selectedAssetIndex !== undefined) {
      const folderAssets = assetsByFolder[props.selectedAssetFolderId] || [];
      if (folderAssets.length > props.selectedAssetIndex) {
        const originalAsset = folderAssets[props.selectedAssetIndex];
        const existingNames = folderAssets.map((a) => a.name);

        const duplicatedAsset: AssetItem = {
          ...originalAsset,
          id: `asset-${Date.now()}-${Math.random()}`,
          name: getDuplicateName(originalAsset.name, existingNames),
        };

        setAssetsByFolder((prev) => ({
          ...prev,
          [props.selectedAssetFolderId!]: [...folderAssets, duplicatedAsset],
        }));

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

    const duplicatedAsset: AssetItem = {
      ...originalAsset,
      id: `asset-${Date.now()}-${Math.random()}`,
      name: getDuplicateName(originalAsset.name, existingNames),
    };

    if (location.type === "root") {
      setRootAssets((prev) => [...prev, duplicatedAsset]);
    } else if (location.type === "folder") {
      setAssetsByFolder((prev) => ({
        ...prev,
        [location.folderId]: [
          ...(prev[location.folderId] || []),
          duplicatedAsset,
        ],
      }));

      // Notify parent about the new asset in the folder
      props.onFolderReceiveAssets?.(location.folderId, [duplicatedAsset]);
    }
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
      (props.compositeFolderIds && props.compositeFolderIds.includes(folderId)) ||
      (compositionByFolder && compositionByFolder[folderId]);

    console.log("Duplicating folder:", {
      folderId,
      originalName,
      duplicateName,
      isCompositionFolder,
      compositeFolderIds: props.compositeFolderIds,
      hasCompositionSettings: !!compositionByFolder[folderId]
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
      const placeholderMax = props.compositeFolderIds.reduce(
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
          name: getDuplicateName(
            asset.name,
            originalAssets.map((a) => a.name)
          ),
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
      // Handle regular folders (not composition folders) - use addFolder hook
      console.log("Duplicating regular folder using addFolder hook");

      // Store current state before creating new folder
      const currentFolderIds = new Set(sidebarFolders.map((f) => f.id));
      console.log("Current folder IDs before creation:", currentFolderIds);

      // Create new folder using the hook
      addFolder();

      // Use a timeout to find the new folder
      setTimeout(() => {
        const allFolderIds = sidebarFolders.map((f) => f.id);
        const newFolderIds = allFolderIds.filter(
          (id) => !currentFolderIds.has(id)
        );

        console.log("After addFolder call:", {
          allFolderIds,
          newFolderIds,
          sidebarFoldersLength: sidebarFolders.length,
        });

        if (newFolderIds.length > 0) {
          const newestFolderId = newFolderIds[0];
          console.log("Found new regular folder:", newestFolderId);

          // Update the folder name
          setFolderNames((prev) => ({
            ...prev,
            [newestFolderId]: duplicateName,
          }));

          // Copy all assets from the original folder
          const originalAssets = assetsByFolder[folderId] || [];
          console.log("Original assets to copy:", originalAssets);

          if (originalAssets.length > 0) {
            const duplicatedAssets = originalAssets.map((asset, index) => ({
              ...asset,
              id: `asset-${Date.now()}-${index}-${Math.random()}`,
              name: getDuplicateName(
                asset.name,
                originalAssets.map((a) => a.name)
              ),
            }));

            console.log("Duplicated assets:", duplicatedAssets);

            setAssetsByFolder((prev) => ({
              ...prev,
              [newestFolderId]: duplicatedAssets,
            }));

            // Notify parent if there's a handler for folder receiving assets
            props.onFolderReceiveAssets?.(newestFolderId, duplicatedAssets);
          }
        } else {
          console.log("Failed to find new regular folder");
        }
      }, 200); // Single timeout, no retry loop for regular folders
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
    let counter = 1;
    let newName = `${originalName} Copy`;

    while (existingNames.includes(newName)) {
      counter++;
      newName = `${originalName} Copy ${counter}`;
    }

    return newName;
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
            <div className="mt-2 flex items-center gap-1">
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

      {/* Color Effects Panel - only show in composite mode when an asset is selected */}
      {mode === "composite" && onAssetEffectsChange && (
        <>
          <div className="border-b border-gray-600 my-4 flex-shrink-0" />
          <ColorEffectsPanel
            assetIdentity={selectedAssetKey || null}
            effects={
              selectedAssetKey ? assetEffects[selectedAssetKey] || {} : {}
            }
            onEffectsChange={onAssetEffectsChange}
          />
        </>
      )}

      <div className="border-b border-gray-600 my-4 flex-shrink-0" />

      <ScrollArea className="flex-1 pr-2">
        <div className="space-y-2">
          {sidebarFolders.map((folder) => (
            <div key={folder.id} className="bg-gray-700 rounded shadow">
              <div
                className={`flex items-center p-2 border-b border-gray-600 rounded-t ${
                  selectedLayerId === folder.id ? "bg-blue-600 text-white" : ""
                }`}
                onDragOver={onFolderDragOver}
                onDrop={(e) => onFolderDrop(folder.id, e)}
              >
                <div
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => toggleFolder(folder.id)}
                >
                  {openFolders[folder.id] ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </div>
                <div
                  className="flex items-center gap-2 cursor-pointer ml-2"
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
                  <Folder className="w-4 h-4 text-gray-400" />
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
                    <span className="font-medium text-xs">
                      {folderNames[folder.id] || folder.label}
                    </span>
                  )}
                  {compositionByFolder[folder.id] && (
                    <span className="ml-2 text-[9px] px-1 py-0.5 rounded bg-gray-700/70 text-gray-300 uppercase tracking-wide">
                      Composition
                    </span>
                  )}
                </div>
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
                                compositionByFolder[folder.id]?.height || 1080,
                              fps: compositionByFolder[folder.id]?.fps || 24,
                            })
                          }
                        >
                          Create Composition
                        </DropdownMenuItem>
                      )}
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
                <div className="pl-2 py-2 flex flex-col gap-1 rounded-b">
                  {mode === "composite" &&
                    (assetsByFolder[folder.id] || []).length > 0 && (
                      <div className="px-2 pb-2">
                        {(assetsByFolder[folder.id] || []).map((a, idx) => (
                          <div
                            key={a.id}
                            className={`flex items-center gap-2 text-xs rounded px-2 py-1 cursor-pointer ${
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
                          >
                            {compositionByFolder[folder.id] && (
                              <span className="inline-flex items-center justify-center rounded bg-gray-800/80 px-1.5 py-0.5 text-[10px] text-gray-300">
                                {getAssetFrameRange(folder.id, idx)}
                              </span>
                            )}
                            <span className="truncate flex-1 flex items-center gap-1">
                              {a.isSequence && (
                                <span className="inline-flex items-center justify-center rounded bg-purple-600/80 px-1.5 py-0.5 text-[9px] text-white font-medium">
                                  SEQ
                                </span>
                              )}
                              {formatDisplayName(a.name)}
                            </span>
                            {/* Reorder controls (compositing only) */}
                            <div className="flex items-center gap-1">
                              <button
                                className="text-gray-300 hover:text-white disabled:opacity-40"
                                title="Move Up"
                                disabled={idx === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAssetsByFolder((prev) => {
                                    const items = [...(prev[folder.id] || [])];
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
                                    const items = [...(prev[folder.id] || [])];
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
                    (layerOrder[folder.id] || []).map((layerId, layerIndex) => {
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
                                // Parent handles renaming; we trigger with current label
                              }}
                            />
                            <div className="text-xs text-gray-300">
                              {Math.round((layerOpacities[layerId] ?? 1) * 100)}
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
                    })}
                </div>
              )}
            </div>
          ))}
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
