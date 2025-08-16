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
}

export function TransformPanel({
  assetIdentity,
  transform,
  onTransformChange,
  isCollapsed,
  onToggleCollapse,
}: TransformPanelProps) {
  const updateTransform = (updates: Partial<TransformSettings>) => {
    const newTransform: TransformSettings = {
      ...transform,
      ...updates,
    };
    console.log(`[TRANSFORM DEBUG] Transform change:`, {
      assetIdentity,
      updates,
      newTransform,
      previousTransform: transform
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
                value={transform.opacity}
                onChange={(e) =>
                  updateTransform({ opacity: parseInt(e.target.value) || 0 })
                }
                className="w-16 h-6 text-xs bg-gray-700 border-gray-600"
              />
            </div>
            <Slider
              value={[transform.opacity]}
              onValueChange={([value]) => updateTransform({ opacity: value })}
              max={100}
              min={0}
              step={1}
              className="w-full"
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
                  value={Math.round(transform.position.x)}
                  onChange={(e) =>
                    updateTransform({
                      position: {
                        ...transform.position,
                        x: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  className="h-6 text-xs bg-gray-700 border-gray-600"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-400">Y</Label>
                <Input
                  type="number"
                  value={Math.round(transform.position.y)}
                  onChange={(e) =>
                    updateTransform({
                      position: {
                        ...transform.position,
                        y: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  className="h-6 text-xs bg-gray-700 border-gray-600"
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
                  value={Math.round(transform.rotation)}
                  onChange={(e) =>
                    updateTransform({ rotation: parseInt(e.target.value) || 0 })
                  }
                  className="w-16 h-6 text-xs bg-gray-700 border-gray-600"
                />
                <span className="text-xs text-gray-400">°</span>
              </div>
            </div>
            <Slider
              value={[transform.rotation]}
              onValueChange={([value]) => updateTransform({ rotation: value })}
              max={360}
              min={0}
              step={1}
              className="w-full"
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
                  value={transform.scale.toFixed(1)}
                  onChange={(e) =>
                    updateTransform({ scale: parseFloat(e.target.value) || 1 })
                  }
                  className="w-16 h-6 text-xs bg-gray-700 border-gray-600"
                />
                <span className="text-xs text-gray-400">x</span>
              </div>
            </div>
            <Slider
              value={[transform.scale * 100]}
              onValueChange={([value]) => updateTransform({ scale: value / 100 })}
              max={500}
              min={10}
              step={10}
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
