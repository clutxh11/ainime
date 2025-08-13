"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, ChevronDown, ChevronRight, ChevronUp, Edit3, Eye, Folder } from "lucide-react";

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
  setOpenFolders: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  layerOpacities: Record<string, number>;
  setLayerOpacities: (fn: (prev: Record<string, number>) => Record<string, number>) => void;
  folderLayers: Record<string, string[]>;
  layerOrder: Record<string, string[]>;
  layerVisibility: Record<string, boolean>;
  handleSidebarSelection: (layerId: string) => void;
  handleToggleVisibility: (layerId: string) => void;
  toggleFolder: (id: string) => void;
  handleAddLayer: (activeLayerId: string) => void;
  moveLayer: (folderId: string, layerId: string, direction: "up" | "down") => void;
  moveFrameFolderUp: (folderId: string) => void;
  moveFrameFolderDown: (folderId: string) => void;
  addFolder: () => void;
  deleteSelectedFolder: () => void;
  editingFolderId: string | null;
  setEditingFolderId: (id: string | null) => void;
  editingFolderValue: string;
  setEditingFolderValue: (v: string) => void;
  folderNames: Record<string, string>;
  setFolderNames: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
  editingLayerName: string | null;
  editingLayerValue: string;
  handleSaveRename: (layerId: string) => void;
  handleCancelRename: () => void;
}

export default function LayersPanel(props: LayersPanelProps) {
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
  } = props;

  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700 p-4 flex flex-col">
      <div className="flex-shrink-0">
        {mode === "storyboard" && (
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Folders</h3>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" onClick={addFolder} className="w-8 h-8" title="Add Frame">
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

        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-gray-200">Layers</h2>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => selectedLayerId && handleAddLayer(selectedLayerId)}
              className="w-8 h-8"
              title="Add Layer"
            >
              <Plus className="w-5 h-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                if (!selectedLayerId) return;
                // Deletion of extra layers is handled by the parent via state updates
                // Parent already listens to selectedLayerId for deletions
              }}
              className="w-8 h-8 text-red-500 hover:text-red-400"
              disabled={!selectedLayerId}
              title="Delete Layer"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="mb-2" />

        {/* Opacity slider for selected layer */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm font-medium">
            <Label htmlFor="opacity-slider">Opacity</Label>
            <span className="text-gray-300">
              {Math.round((selectedLayerId ? layerOpacities[selectedLayerId] ?? 1 : 1) * 100)}%
            </span>
          </div>
          <Slider
            id="opacity-slider"
            value={[(selectedLayerId ? layerOpacities[selectedLayerId] ?? 1 : 1) * 100]}
            onValueChange={([v]) => selectedLayerId && setLayerOpacities((prev) => ({ ...prev, [selectedLayerId]: v / 100 }))}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
        </div>
      </div>

      <div className="border-b border-gray-600 my-4 flex-shrink-0" />

      <ScrollArea className="flex-1 pr-2">
        <div className="space-y-2">
          {sidebarFolders.map((folder) => (
            <div key={folder.id} className="bg-gray-700 rounded shadow">
              <div
                className={`flex items-center p-2 border-b border-gray-600 rounded-t ${
                  selectedLayerId === folder.id ? "bg-blue-600 text-white" : ""
                }`}
              >
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleFolder(folder.id)}>
                  {openFolders[folder.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
                <div className="flex items-center gap-2 cursor-pointer ml-2" onClick={() => handleSidebarSelection(folder.id)}>
                  <Folder className="w-4 h-4 text-gray-400" />
                  {editingFolderId === folder.id ? (
                    <input
                      className="text-xs bg-gray-800 text-white px-2 py-1 rounded border border-gray-600"
                      value={editingFolderValue}
                      onChange={(e) => setEditingFolderValue(e.target.value)}
                      onBlur={() => {
                        setFolderNames((prev) => ({ ...prev, [folder.id]: editingFolderValue || folder.label }));
                        setEditingFolderId(null);
                        setEditingFolderValue("")
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setFolderNames((prev) => ({ ...prev, [folder.id]: editingFolderValue || folder.label }));
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
                    <span className="font-medium text-xs">{folderNames[folder.id] || folder.label}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-auto">
                  {sidebarFolders.length > 1 && (
                    <>
                      {sidebarFolders.findIndex((f) => f.id === folder.id) > 0 && (
                        <button className="text-gray-400 hover:text-white px-1" title="Move Up" onClick={() => moveFrameFolderUp(folder.id)}>
                          <ChevronUp className="w-4 h-4" />
                        </button>
                      )}
                      {sidebarFolders.findIndex((f) => f.id === folder.id) < sidebarFolders.length - 1 && (
                        <button className="text-gray-400 hover:text-white px-1" title="Move Down" onClick={() => moveFrameFolderDown(folder.id)}>
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
                {mode === "storyboard" && (
                  <button
                    className="ml-2 text-gray-400 hover:text-white"
                    title="Rename Page"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFolderId(folder.id);
                      setEditingFolderValue(folderNames[folder.id] || folder.label);
                    }}
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                )}
              </div>
              {openFolders[folder.id] && (
                <div className="pl-2 py-2 flex flex-col gap-1 rounded-b">
                  {(layerOrder[folder.id] || []).map((layerId, layerIndex) => {
                    const isMain = layerId.endsWith("-main");
                    const extraIndex = isMain ? -1 : parseInt(layerId.split("-extra-")[1], 10);
                    const layerName = isMain
                      ? folder.fileName
                        ? (folder.fileName.split(".")[0])
                        : "Untitled.1"
                      : folderLayers[folder.id]?.[extraIndex] || `Untitled.${extraIndex + 2}`;
                    return (
                      <div
                        key={layerId}
                        className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer ${
                          selectedLayerId === layerId ? "bg-blue-600" : "bg-gray-600 hover:bg-gray-500"
                        }`}
                        onClick={() => handleSidebarSelection(layerId)}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <Eye
                            className={`w-4 h-4 ${layerVisibility[layerId] !== false ? "text-white" : "text-gray-500"}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleVisibility(layerId);
                            }}
                          />
                          {editingLayerName === layerId ? (
                            <input
                              value={editingLayerValue}
                              onChange={(e) => setEditingFolderValue(e.target.value)}
                              onBlur={() => handleSaveRename(layerId)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveRename(layerId);
                                if (e.key === "Escape") handleCancelRename();
                              }}
                              className="text-sm bg-gray-800 text-white px-2 py-1 rounded border border-gray-600 flex-1"
                              autoFocus
                            />
                          ) : (
                            <span className="text-sm text-white flex-1">{layerName}</span>
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
                          <div className="text-xs text-gray-300">{Math.round((layerOpacities[layerId] ?? 1) * 100)}%</div>
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
                              disabled={layerIndex === (layerOrder[folder.id]?.length || 0) - 1}
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
    </div>
  );
}


