import React from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight } from "lucide-react";

export interface TransformSettings {
  opacity: number; // 0-100
  position: { x: number; y: number };
  rotation: number; // degrees
  scale: number; // 1.0 = 100%
}

interface TransformPanelProps {
  assetIdentity: string;
  transform: TransformSettings;
  onTransformChange: (identity: string, transform: TransformSettings) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  disabled?: boolean;
}

export function TransformPanel({
  assetIdentity,
  transform,
  onTransformChange,
  isCollapsed,
  onToggleCollapse,
  disabled = false,
}: TransformPanelProps) {
  // Ensure transform has all required properties with defaults
  const safeTransform: TransformSettings = {
    opacity: 100,
    position: { x: 0, y: 0 },
    rotation: 0,
    scale: 1,
    ...transform,
    position: {
      x: 0,
      y: 0,
      ...transform?.position,
    },
  };

  const updateTransform = (updates: Partial<TransformSettings>) => {
    if (disabled) return; // Don't update if disabled

    const newTransform: TransformSettings = {
      ...safeTransform,
      ...updates,
    };
    console.log(`[TRANSFORM DEBUG] Transform change:`, {
      assetIdentity,
      updates,
      newTransform,
      previousTransform: safeTransform,
    });
    onTransformChange(assetIdentity, newTransform);
  };

  return (
    <div className="space-y-4">
      {/* Header with collapse toggle */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={onToggleCollapse}
      >
        <h3 className="text-sm font-medium text-white">Transform</h3>
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </div>

      {/* Content - only show when not collapsed */}
      {!isCollapsed && (
        <div className="space-y-4 pl-2">
          {/* Opacity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-300">Opacity</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={safeTransform.opacity}
                onChange={(e) =>
                  updateTransform({ opacity: parseInt(e.target.value) || 0 })
                }
                className="w-16 h-6 text-xs bg-gray-700 border-gray-600"
                disabled={disabled}
              />
            </div>
            <Slider
              value={[safeTransform.opacity]}
              onValueChange={([value]) => updateTransform({ opacity: value })}
              max={100}
              min={0}
              step={1}
              className="w-full"
              disabled={disabled}
            />
          </div>

          {/* Position */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-300">Position</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-gray-400">X</Label>
                <Input
                  type="number"
                  value={Math.round(safeTransform.position.x)}
                  onChange={(e) =>
                    updateTransform({
                      position: {
                        ...safeTransform.position,
                        x: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  className="h-6 text-xs bg-gray-700 border-gray-600"
                  disabled={disabled}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-400">Y</Label>
                <Input
                  type="number"
                  value={Math.round(safeTransform.position.y)}
                  onChange={(e) =>
                    updateTransform({
                      position: {
                        ...safeTransform.position,
                        y: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  className="h-6 text-xs bg-gray-700 border-gray-600"
                  disabled={disabled}
                />
              </div>
            </div>
          </div>

          {/* Rotation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-300">Rotation</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="0"
                  max="360"
                  value={Math.round(safeTransform.rotation)}
                  onChange={(e) =>
                    updateTransform({ rotation: parseInt(e.target.value) || 0 })
                  }
                  className="w-16 h-6 text-xs bg-gray-700 border-gray-600"
                  disabled={disabled}
                />
                <span className="text-xs text-gray-400">°</span>
              </div>
            </div>
            <Slider
              value={[safeTransform.rotation]}
              onValueChange={([value]) => updateTransform({ rotation: value })}
              max={360}
              min={0}
              step={1}
              className="w-full"
              disabled={disabled}
            />
          </div>

          {/* Scale */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-300">Scale</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={safeTransform.scale.toFixed(1)}
                  onChange={(e) =>
                    updateTransform({ scale: parseFloat(e.target.value) || 1 })
                  }
                  className="w-16 h-6 text-xs bg-gray-700 border-gray-600"
                  disabled={disabled}
                />
                <span className="text-xs text-gray-400">x</span>
              </div>
            </div>
            <Slider
              value={[safeTransform.scale * 100]}
              onValueChange={([value]) =>
                updateTransform({ scale: value / 100 })
              }
              max={500}
              min={10}
              step={10}
              className="w-full"
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </div>
  );
}
