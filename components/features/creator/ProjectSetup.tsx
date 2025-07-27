"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CurrentView } from "@/types";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

interface ProjectSetupProps {
  onViewChange: (view: CurrentView, params?: any) => void;
}

export function ProjectSetup({ onViewChange }: ProjectSetupProps) {
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectGenre, setProjectGenre] = useState("Fantasy");
  const [canvasWidth, setCanvasWidth] = useState(1920);
  const [canvasHeight, setCanvasHeight] = useState(1080);
  const [frameRate, setFrameRate] = useState(24);
  const [units, setUnits] = useState("pixel");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateProject = async () => {
    if (!projectName.trim()) return;

    try {
      setLoading(true);
      setError(null);

      // Create new project in Supabase
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert([
          {
            title: projectName,
            description:
              projectDescription || `Animation project: ${projectName}`,
            genre: projectGenre,
            status: "Planning",
            views: 0,
            progress: 0,
            creator_id: "1", // TODO: Replace with actual user ID when auth is implemented
            canvas_width: canvasWidth,
            canvas_height: canvasHeight,
            frame_rate: frameRate,
            units: units,
          },
        ])
        .select()
        .single();

      if (projectError) throw projectError;

      console.log("Project created successfully:", project);

      // Open the animation editor with the configured settings
      onViewChange("animation-editor", {
        projectId: project.id,
        sceneName: projectName,
        canvasWidth,
        canvasHeight,
        frameRate,
      });
    } catch (err: any) {
      setError(err.message);
      console.error("Error creating project:", err);
    } finally {
      setLoading(false);
    }
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

      {/* Error State */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-6">
          <p className="text-red-400">Error creating project: {error}</p>
        </div>
      )}

      {/* Project Configuration Form */}
      <div className="bg-gray-800 rounded-2xl p-8 shadow-sm space-y-8">
        {/* Project Name */}
        <div>
          <label className="text-lg font-semibold text-white mb-3 block">
            Project Name *
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Enter project name..."
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Project Description */}
        <div>
          <label className="text-lg font-semibold text-white mb-3 block">
            Description
          </label>
          <textarea
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            placeholder="Describe your animation project..."
            rows={3}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Project Genre */}
        <div>
          <label className="text-lg font-semibold text-white mb-3 block">
            Genre
          </label>
          <select
            value={projectGenre}
            onChange={(e) => setProjectGenre(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="Fantasy">Fantasy</option>
            <option value="Action">Action</option>
            <option value="Romance">Romance</option>
            <option value="Comedy">Comedy</option>
            <option value="Drama">Drama</option>
            <option value="Sci-Fi">Sci-Fi</option>
            <option value="Horror">Horror</option>
            <option value="Adventure">Adventure</option>
            <option value="Mystery">Mystery</option>
            <option value="Slice of Life">Slice of Life</option>
          </select>
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
              <span className="text-gray-400">Genre:</span> {projectGenre}
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
            disabled={!projectName.trim() || loading}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-3 text-lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creating Project...
              </>
            ) : (
              "Create Project & Open Editor"
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => onViewChange("creator")}
            disabled={loading}
            className="border-gray-600 text-gray-300 hover:bg-gray-700 py-3 text-lg"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
