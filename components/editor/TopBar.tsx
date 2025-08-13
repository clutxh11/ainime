"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Settings as SettingsIcon,
  Download,
  Save,
} from "lucide-react";

type EditorMode = "animate" | "storyboard" | "composite";

interface SceneSettings {
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
}

export interface TopBarProps {
  mode: EditorMode;
  sceneSettings?: SceneSettings;
  nameOverride?: string;

  onBack: () => void;

  undo: () => void;
  redo: () => void;
  undoDisabled: boolean;
  redoDisabled: boolean;

  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;

  onOpenSettings: () => void;
  onOpenExport: () => void;
  onSave: () => void;
  isSaving: boolean;
}

export default function TopBar({
  mode,
  sceneSettings,
  nameOverride,
  onBack,
  undo,
  redo,
  undoDisabled,
  redoDisabled,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onOpenSettings,
  onOpenExport,
  onSave,
  isSaving,
}: TopBarProps) {
  const editorTitle =
    mode === "storyboard"
      ? "Storyboard Editor"
      : mode === "composite"
      ? "Compositing Editor"
      : "Animation Editor";

  const suffix = (() => {
    if (mode === "storyboard") {
      const seq =
        nameOverride || sceneSettings?.sequenceCode || sceneSettings?.sequenceId?.slice(0, 4);
      return seq || null;
    }
    if (mode === "animate") {
      const seq = sceneSettings?.sequenceCode || sceneSettings?.sequenceId?.slice(0, 4);
      const shot = nameOverride || sceneSettings?.shotCode || sceneSettings?.shotId?.slice(0, 4);
      return seq && shot ? `${seq} - ${shot}` : shot || null;
    }
    if (mode === "composite") {
      if (sceneSettings?.sceneName) return sceneSettings.sceneName;
      return sceneSettings?.chapterId ? `chapter ${sceneSettings.chapterId.slice(0, 4)}` : null;
    }
    return null;
  })();

  return (
    <nav className="flex items-center justify-between p-3 border-b border-gray-800 bg-gray-900 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-gray-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Project
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg font-semibold">{editorTitle}</h1>
            <span className="text-sm text-gray-400">{suffix}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-gray-400 bg-transparent border-gray-600"
            onClick={undo}
            disabled={undoDisabled}
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-gray-400 bg-transparent border-gray-600"
            onClick={redo}
            disabled={redoDisabled}
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Label className="text-sm text-gray-300">Zoom:</Label>
          <Button
            variant="outline"
            size="sm"
            className="text-gray-400 bg-transparent border-gray-600"
            onClick={onZoomOut}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-300 min-w-[60px] text-center">{Math.round(zoom * 100)}%</span>
          <Button
            variant="outline"
            size="sm"
            className="text-gray-400 bg-transparent border-gray-600"
            onClick={onZoomIn}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-gray-400 bg-transparent border-gray-600"
            onClick={onZoomReset}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-300 hover:text-white"
          onClick={onOpenSettings}
          title="Scene settings"
        >
          <SettingsIcon className="w-4 h-4 mr-2" />
          Settings
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-300 hover:text-white"
          onClick={onOpenExport}
          title="Export"
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-gray-400 bg-transparent border-gray-600"
          onClick={onSave}
          disabled={isSaving}
          title="Save settings"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </nav>
  );
}


