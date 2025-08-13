"use client";

import { Button } from "@/components/ui/button";
import { Folder } from "lucide-react";

export interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  exportFolderName: string;
  setExportFolderName: (v: string) => void;
  exportNameScheme: "frame-folder";
  setExportNameScheme: (v: "frame-folder") => void;
  exportFormat: "png" | "jpg" | "webp";
  setExportFormat: (v: "png" | "jpg" | "webp") => void;
  exportLayersMerge: boolean;
  setExportLayersMerge: (v: boolean) => void;
  exportRowAllFrames: boolean;
  setExportRowAllFrames: (v: boolean) => void;
  mode: "animate" | "storyboard" | "composite";
  setExportDirHandle: (h: any | null) => void;
  onExport: () => void;
}

export default function ExportModal(props: ExportModalProps) {
  const {
    open,
    onClose,
    exportFolderName,
    setExportFolderName,
    exportNameScheme,
    setExportNameScheme,
    exportFormat,
    setExportFormat,
    exportLayersMerge,
    setExportLayersMerge,
    exportRowAllFrames,
    setExportRowAllFrames,
    mode,
    setExportDirHandle,
    onExport,
  } = props;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-gray-800 border border-gray-700 rounded-lg p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-white mb-4">Export</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Export folder</label>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-gray-700/80 border border-gray-600 rounded px-3 py-2 text-gray-300 cursor-not-allowed"
                value={exportFolderName}
                readOnly
                disabled
              />
              <Button
                variant="ghost"
                size="icon"
                className="w-10 text-gray-300 hover:text-white"
                title="Choose folder"
                onClick={async () => {
                  try {
                    const anyWindow: any = window as any;
                    if (anyWindow.showDirectoryPicker) {
                      const handle = await anyWindow.showDirectoryPicker();
                      setExportDirHandle(handle);
                      let pathName = handle.name || exportFolderName;
                      if (pathName.length > 48) {
                        pathName = pathName.slice(0, 22) + "…" + pathName.slice(-22);
                      }
                      setExportFolderName(pathName);
                    } else {
                      alert("Your browser does not support folder picking. Files will download via the browser.");
                    }
                  } catch {
                    // user cancelled
                  }
                }}
              >
                <Folder className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">File name</label>
            <select
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              value={exportNameScheme}
              onChange={(e) => setExportNameScheme(e.target.value as any)}
            >
              <option value="frame-folder">Frame folder name</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">File format</label>
            <select
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as any)}
            >
              <option value="png">PNG (.png)</option>
              <option value="jpg">JPEG (.jpg)</option>
              <option value="webp">WEBP (.webp)</option>
            </select>
          </div>

          {mode === "animate" && (
            <div className="flex items-center gap-2">
              <input
                id="mergeLayers"
                type="checkbox"
                className="accent-blue-500"
                checked={exportLayersMerge}
                onChange={(e) => setExportLayersMerge(e.target.checked)}
              />
              <label htmlFor="mergeLayers" className="text-sm text-gray-300">
                Export layers not in animation folders
              </label>
            </div>
          )}

          {mode === "animate" && (
            <div className="flex items-center gap-2">
              <input
                id="rowAll"
                type="checkbox"
                className="accent-blue-500"
                checked={exportRowAllFrames}
                onChange={(e) => setExportRowAllFrames(e.target.checked)}
              />
              <label htmlFor="rowAll" className="text-sm text-gray-300">
                Export entire selected row
              </label>
            </div>
          )}

          <div className="flex gap-2 pt-2 justify-end">
            <button className="border border-gray-600 text-gray-300 rounded px-3 py-2" onClick={onClose}>
              Cancel
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-2" onClick={onExport}>
              Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


