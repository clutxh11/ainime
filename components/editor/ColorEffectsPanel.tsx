import React, { useState } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { Switch } from "../ui/switch";
import { Input } from "../ui/input";
import { Palette, Pipette, Eye, EyeOff } from "lucide-react";
import type { AssetEffects, ColorKeySettings, ColorKeepSettings } from "@/lib/utils/color-effects";

interface ColorEffectsPanelProps {
  assetIdentity: string | null;
  effects: AssetEffects;
  onEffectsChange: (identity: string, effects: AssetEffects) => void;
}

export default function ColorEffectsPanel({
  assetIdentity,
  effects,
  onEffectsChange,
}: ColorEffectsPanelProps) {
  const [showColorKey, setShowColorKey] = useState(false);
  const [showColorKeep, setShowColorKeep] = useState(false);

  if (!assetIdentity) {
    return (
      <div className="p-4 text-center text-gray-400">
        <Palette className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Select an asset to apply color effects</p>
      </div>
    );
  }

  const updateColorKey = (updates: Partial<ColorKeySettings>) => {
    const newEffects = {
      ...effects,
      colorKey: {
        enabled: false,
        keyColor: "#ffffff",
        tolerance: 10,
        softness: 0,
        ...effects.colorKey,
        ...updates,
      },
    };
    onEffectsChange(assetIdentity, newEffects);
  };

  const updateColorKeep = (updates: Partial<ColorKeepSettings>) => {
    const newEffects = {
      ...effects,
      colorKeep: {
        enabled: false,
        keepColor: "#ff00ff",
        tolerance: 10,
        softness: 0,
        ...effects.colorKeep,
        ...updates,
      },
    };
    onEffectsChange(assetIdentity, newEffects);
  };

  const colorKeySettings = effects.colorKey || {
    enabled: false,
    keyColor: "#ffffff",
    tolerance: 10,
    softness: 0,
  };

  const colorKeepSettings = effects.colorKeep || {
    enabled: false,
    keepColor: "#ff00ff",
    tolerance: 10,
    softness: 0,
  };

  return (
    <div className="space-y-4 p-4">
      <div className="text-sm font-medium text-gray-200 mb-4">
        Color Effects
      </div>

      {/* Color Key Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowColorKey(!showColorKey)}
            className="flex items-center gap-2 text-left p-2 text-gray-300 hover:text-white"
          >
            <Pipette className="w-4 h-4" />
            Color Key
            {showColorKey ? (
              <EyeOff className="w-3 h-3" />
            ) : (
              <Eye className="w-3 h-3" />
            )}
          </Button>
          <Switch
            checked={colorKeySettings.enabled}
            onCheckedChange={(enabled) => updateColorKey({ enabled })}
          />
        </div>

        {showColorKey && (
          <div className="space-y-3 pl-4 border-l border-gray-600">
            <div className="space-y-2">
              <Label className="text-xs text-gray-400">Key Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={colorKeySettings.keyColor}
                  onChange={(e) => updateColorKey({ keyColor: e.target.value })}
                  className="w-12 h-8 p-1 border-gray-600"
                />
                <Input
                  type="text"
                  value={colorKeySettings.keyColor}
                  onChange={(e) => updateColorKey({ keyColor: e.target.value })}
                  className="flex-1 h-8 text-xs bg-gray-800 border-gray-600"
                  placeholder="#ffffff"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-400">Tolerance</Label>
                <span className="text-xs text-gray-500">
                  {colorKeySettings.tolerance}%
                </span>
              </div>
              <Slider
                value={[colorKeySettings.tolerance]}
                onValueChange={([value]) => updateColorKey({ tolerance: value })}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-400">Softness</Label>
                <span className="text-xs text-gray-500">
                  {colorKeySettings.softness}%
                </span>
              </div>
              <Slider
                value={[colorKeySettings.softness]}
                onValueChange={([value]) => updateColorKey({ softness: value })}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Color Keep Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowColorKeep(!showColorKeep)}
            className="flex items-center gap-2 text-left p-2 text-gray-300 hover:text-white"
          >
            <Palette className="w-4 h-4" />
            Color Keep
            {showColorKeep ? (
              <EyeOff className="w-3 h-3" />
            ) : (
              <Eye className="w-3 h-3" />
            )}
          </Button>
          <Switch
            checked={colorKeepSettings.enabled}
            onCheckedChange={(enabled) => updateColorKeep({ enabled })}
          />
        </div>

        {showColorKeep && (
          <div className="space-y-3 pl-4 border-l border-gray-600">
            <div className="space-y-2">
              <Label className="text-xs text-gray-400">Keep Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={colorKeepSettings.keepColor}
                  onChange={(e) => updateColorKeep({ keepColor: e.target.value })}
                  className="w-12 h-8 p-1 border-gray-600"
                />
                <Input
                  type="text"
                  value={colorKeepSettings.keepColor}
                  onChange={(e) => updateColorKeep({ keepColor: e.target.value })}
                  className="flex-1 h-8 text-xs bg-gray-800 border-gray-600"
                  placeholder="#ff00ff"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-400">Tolerance</Label>
                <span className="text-xs text-gray-500">
                  {colorKeepSettings.tolerance}%
                </span>
              </div>
              <Slider
                value={[colorKeepSettings.tolerance]}
                onValueChange={([value]) => updateColorKeep({ tolerance: value })}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-400">Softness</Label>
                <span className="text-xs text-gray-500">
                  {colorKeepSettings.softness}%
                </span>
              </div>
              <Slider
                value={[colorKeepSettings.softness]}
                onValueChange={([value]) => updateColorKeep({ softness: value })}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>


    </div>
  );
}
