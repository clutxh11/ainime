"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Folder,
  Eye,
  Edit3,
  Trash2,
} from "lucide-react";

interface AnimationEditorProps {
  onViewChange: (view: string) => void;
  sceneSettings?: {
    sceneName: string;
    canvasWidth: number;
    canvasHeight: number;
    frameRate: number;
  };
}

export function AnimationEditor({
  onViewChange,
  sceneSettings,
}: AnimationEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [layerOpacities, setLayerOpacities] = useState<{
    [key: string]: number;
  }>({});
  const [layerVisibility, setLayerVisibility] = useState<{
    [key: string]: boolean;
  }>({});

  const [rows, setRows] = useState([
    { id: "row-1", name: "Row1" },
    { id: "row-2", name: "Row2" },
  ]);

  const [drawingFrames, setDrawingFrames] = useState<any[]>(() => {
    if (sceneSettings) {
      return [
        {
          rowId: "row-1",
          frameIndex: 0,
          length: 1,
          imageUrl: "",
          fileName: `${sceneSettings.sceneName} - Background`,
        },
      ];
    }
    return [];
  });

  const [openFolders, setOpenFolders] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [folderLayers, setFolderLayers] = useState<{ [key: string]: string[] }>(
    {}
  );

  const sidebarFolders = drawingFrames.map((df) => ({
    id: `${df.rowId}-${df.frameIndex}`,
    label: `Row ${parseInt(df.rowId.split("-")[1])} Frame ${df.frameIndex + 1}`,
    imageUrl: df.imageUrl,
    fileName: df.fileName,
  }));

  const moveRowUp = (rowId: string) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === rowId);
      if (idx > 0) {
        const newRows = [...prev];
        [newRows[idx - 1], newRows[idx]] = [newRows[idx], newRows[idx - 1]];
        return newRows;
      }
      return prev;
    });
  };

  const moveRowDown = (rowId: string) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === rowId);
      if (idx < prev.length - 1 && idx !== -1) {
        const newRows = [...prev];
        [newRows[idx], newRows[idx + 1]] = [newRows[idx + 1], newRows[idx]];
        return newRows;
      }
      return prev;
    });
  };

  const toggleFolder = (id: string) => {
    setOpenFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
      <nav className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <h1 className="text-lg font-semibold">
          Animation Editor - Clean Version
        </h1>
      </nav>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 bg-gray-900 flex items-center justify-center">
          <Card className="bg-white">
            <CardContent className="p-0">
              <canvas
                ref={canvasRef}
                width={sceneSettings?.canvasWidth ?? 800}
                height={sceneSettings?.canvasHeight ?? 600}
                className="border border-gray-300"
                style={{ width: "400px", height: "300px" }}
              />
            </CardContent>
          </Card>
        </div>

        <div className="w-80 bg-gray-800 border-l border-gray-700 p-4">
          <div className="space-y-2">
            {rows.map((row) => {
              const folder = sidebarFolders.find((f) =>
                f.id.startsWith(row.id)
              );
              if (!folder) return null;

              return (
                <div key={folder.id} className="bg-gray-700 rounded shadow">
                  <div
                    className={`flex items-center p-2 border-b border-gray-600 rounded-t ${
                      selectedLayerId === folder.id
                        ? "bg-blue-600 text-white"
                        : ""
                    }`}
                  >
                    <div
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => toggleFolder(folder.id)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </div>

                    <div
                      className="flex items-center gap-2 cursor-pointer ml-2"
                      onClick={() => setSelectedLayerId(folder.id)}
                    >
                      <Folder className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-xs">
                        {folder.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 ml-auto">
                      {sidebarFolders.length > 1 && (
                        <>
                          {sidebarFolders.findIndex((f) => f.id === folder.id) >
                            0 && (
                            <button
                              className="text-gray-400 hover:text-white px-1"
                              title="Move Up"
                              onClick={() => moveRowUp(folder.id)}
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                          )}
                          {sidebarFolders.findIndex((f) => f.id === folder.id) <
                            sidebarFolders.length - 1 && (
                            <button
                              className="text-gray-400 hover:text-white px-1"
                              title="Move Down"
                              onClick={() => moveRowDown(folder.id)}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {openFolders[folder.id] && (
                    <div className="p-2">
                      <div
                        className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer ${
                          selectedLayerId === `${folder.id}-main`
                            ? "bg-blue-600"
                            : "bg-gray-600 hover:bg-gray-500"
                        }`}
                        onClick={() => setSelectedLayerId(`${folder.id}-main`)}
                      >
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-white" />
                          <span className="text-sm text-white">Main Layer</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
