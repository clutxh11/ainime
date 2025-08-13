"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2, X, Eraser } from "lucide-react";

export interface SettingsPanelProps {
  visible: boolean;
  currentTool: string;
  brushSize: number;
  setBrushSize: (n: number) => void;
  color: string;
  setColor: (c: string) => void;

  // palette
  isColorPickerOpen: boolean;
  setIsColorPickerOpen: (v: boolean) => void;
  customColorSets: Record<string, string[]>;
  setCustomColorSets: (fn: (prev: Record<string, string[]>) => Record<string, string[]>) => void;
  newSetName: string;
  setNewSetName: (v: string) => void;
  isCreatingSet: boolean;
  setIsCreatingSet: (v: boolean) => void;

  // eraser
  eraserStyle: "precision" | "stroke";
  setEraserStyle: (v: "precision" | "stroke") => void;
  eraserSize: number;
  setEraserSize: (n: number) => void;
}

export default function SettingsPanel(props: SettingsPanelProps) {
  const {
    visible,
    currentTool,
    brushSize,
    setBrushSize,
    color,
    setColor,
    isColorPickerOpen,
    setIsColorPickerOpen,
    customColorSets,
    setCustomColorSets,
    newSetName,
    setNewSetName,
    isCreatingSet,
    setIsCreatingSet,
    eraserStyle,
    setEraserStyle,
    eraserSize,
    setEraserSize,
  } = props;

  const createColorSet = () => {
    if (newSetName.trim()) {
      setCustomColorSets((prev) => ({ ...prev, [newSetName.trim()]: [] }));
      setNewSetName("");
      setIsCreatingSet(false);
    }
  };
  const addColorToSet = (setName: string, c: string) => {
    setCustomColorSets((prev) => ({ ...prev, [setName]: [...(prev[setName] || []), c] }));
  };
  const removeColorFromSet = (setName: string, colorIndex: number) => {
    setCustomColorSets((prev) => ({
      ...prev,
      [setName]: prev[setName].filter((_, i) => i !== colorIndex),
    }));
  };
  const deleteColorSet = (setName: string) => {
    setCustomColorSets((prev) => {
      const next = { ...prev };
      delete next[setName];
      return next;
    });
  };

  return (
    <div
      className={`bg-gray-800 border-r border-gray-700 transition-all duration-300 ease-in-out overflow-hidden ${
        visible ? "w-64" : "w-0"
      }`}
    >
      <div className="p-4 space-y-4 min-w-64">
        {currentTool === "pencil" && (
          <div>
            <Label className="text-sm font-medium">Brush Size: {brushSize}px</Label>
            <Slider value={[brushSize]} onValueChange={(v) => setBrushSize(v[0])} max={50} min={1} step={1} className="mt-2" />
          </div>
        )}

        {currentTool === "palette" && (
          <div>
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
                <Input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1" placeholder="#000000" />
              </div>
            </div>
            <Separator className="my-3" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Custom Sets</Label>
                <Button variant="outline" size="sm" onClick={() => setIsCreatingSet(true)} className="h-6 px-2 text-xs">
                  <Plus className="w-3 h-3 mr-1" />
                  New Set
                </Button>
              </div>
              {isCreatingSet && (
                <div className="flex items-center gap-2 mb-3 p-2 border border-gray-600 rounded">
                  <Input
                    value={newSetName}
                    onChange={(e) => setNewSetName(e.target.value)}
                    placeholder="Set name"
                    className="flex-1 h-6 text-xs"
                    onKeyPress={(e) => e.key === "Enter" && createColorSet()}
                  />
                  <Button variant="outline" size="sm" onClick={createColorSet} className="h-6 px-2 text-xs">
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
              {Object.entries(customColorSets).map(([setName, colors]) => (
                <div key={setName} className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">{setName}</Label>
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
              ))}
            </div>
          </div>
        )}

        {currentTool === "eraser" && (
          <div>
            <h3 className="text-sm font-medium mb-3">ERASER STYLE</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 border border-gray-600 rounded-lg">
                <div className="w-8 h-8 bg-gray-600 rounded flex items-center justify-center">
                  <Eraser className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Precision Eraser</div>
                  <div className="text-xs text-gray-400">Erase exact areas touched by eraser</div>
                </div>
                <Button variant={eraserStyle === "precision" ? "default" : "outline"} size="sm" onClick={() => setEraserStyle("precision")}>
                  Select
                </Button>
              </div>
              <div className="flex items-center gap-3 p-3 border border-gray-600 rounded-lg">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                  <Eraser className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Stroke Eraser</div>
                  <div className="text-xs text-gray-400">Remove entire strokes when touched</div>
                </div>
                <Button variant={eraserStyle === "stroke" ? "default" : "outline"} size="sm" onClick={() => setEraserStyle("stroke")}>
                  Select
                </Button>
              </div>
            </div>
            <h3 className="text-sm font-medium mt-4 mb-3">ERASER SIZE</h3>
            <div className="space-y-2">
              <Label className="text-sm">Size: {eraserSize}px</Label>
              <Slider value={[eraserSize]} onValueChange={(v) => setEraserSize(v[0])} max={100} min={1} step={1} className="w-full" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


