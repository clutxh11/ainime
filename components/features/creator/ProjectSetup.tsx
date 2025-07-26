"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CurrentView } from "@/types";

interface ProjectSetupProps {
  onViewChange: (view: CurrentView, params?: any) => void;
}

export function ProjectSetup({ onViewChange }: ProjectSetupProps) {
  const [projectName, setProjectName] = useState("");
  const [canvasWidth, setCanvasWidth] = useState(1920);
  const [canvasHeight, setCanvasHeight] = useState(1080);
  const [frameRate, setFrameRate] = useState(24);
  const [units, setUnits] = useState("pixel");

  const handleCreateProject = () => {
    // Here you would typically save the project settings and then open the editor
    console.log("Creating project:", {
      name: projectName,
      width: canvasWidth,
      height: canvasHeight,
      frameRate,
      units,
    });

    // Open the animation editor with the configured settings
    onViewChange("animation-editor", {
      sceneName: projectName,
      canvasWidth,
      canvasHeight,
      frameRate,
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">
          Create New Animation Project
        </h1>
        <p className="text-gray-400">
          Set up your project parameters before starting your animation
        </p>
      </div>

      {/* Project Configuration Form */}
      <div className="bg-gray-800 rounded-2xl p-8 shadow-sm space-y-8">
        {/* Project Name */}
        <div>
          <label className="text-lg font-semibold text-white mb-3 block">
            Project Name
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Enter project name..."
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Canvas Size */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-lg font-semibold text-white mb-3 block">
              Width
            </label>
            <input
              type="number"
              value={canvasWidth}
              onChange={(e) => setCanvasWidth(parseInt(e.target.value) || 1920)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="text-lg font-semibold text-white mb-3 block">
              Height
            </label>
            <input
              type="number"
              value={canvasHeight}
              onChange={(e) =>
                setCanvasHeight(parseInt(e.target.value) || 1080)
              }
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="text-lg font-semibold text-white mb-3 block">
              Units
            </label>
            <select
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="pixel">pixel</option>
              <option value="mm">mm</option>
              <option value="cm">cm</option>
              <option value="inch">inch</option>
            </select>
          </div>
        </div>

        {/* Frame Rate */}
        <div>
          <label className="text-lg font-semibold text-white mb-3 block">
            Frame Rate
          </label>
          <input
            type="number"
            value={frameRate}
            onChange={(e) => setFrameRate(parseInt(e.target.value) || 24)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Preset Sizes */}
        <div>
          <label className="text-lg font-semibold text-white mb-4 block">
            Quick Presets
          </label>
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setCanvasWidth(1920);
                setCanvasHeight(1080);
              }}
              className="border-gray-600 text-gray-300 hover:bg-gray-700 py-3"
            >
              HD (1920x1080)
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setCanvasWidth(1280);
                setCanvasHeight(720);
              }}
              className="border-gray-600 text-gray-300 hover:bg-gray-700 py-3"
            >
              720p (1280x720)
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setCanvasWidth(3840);
                setCanvasHeight(2160);
              }}
              className="border-gray-600 text-gray-300 hover:bg-gray-700 py-3"
            >
              4K (3840x2160)
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setCanvasWidth(1080);
                setCanvasHeight(1080);
              }}
              className="border-gray-600 text-gray-300 hover:bg-gray-700 py-3"
            >
              Square (1080x1080)
            </Button>
          </div>
        </div>

        {/* Project Preview */}
        <div className="bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Project Preview
          </h3>
          <div className="space-y-2 text-gray-300">
            <div>
              <span className="text-gray-400">Project Name:</span>{" "}
              {projectName || "Untitled Project"}
            </div>
            <div>
              <span className="text-gray-400">Canvas Size:</span> {canvasWidth}{" "}
              x {canvasHeight} {units}
            </div>
            <div>
              <span className="text-gray-400">Frame Rate:</span> {frameRate} fps
            </div>
            <div>
              <span className="text-gray-400">Aspect Ratio:</span>{" "}
              {(canvasWidth / canvasHeight).toFixed(2)}:1
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex gap-4 pt-6">
          <Button
            onClick={handleCreateProject}
            disabled={!projectName.trim()}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-3 text-lg"
          >
            Create Project & Open Editor
          </Button>
          <Button
            variant="outline"
            onClick={() => onViewChange("creator")}
            className="border-gray-600 text-gray-300 hover:bg-gray-700 py-3 text-lg"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
