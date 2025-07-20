"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Plus,
  Save,
  Pencil,
  Eraser,
  Eye,
  EyeOff,
  Undo,
  Redo,
  Trash2,
  Palette,
  Layers,
  Download,
  RotateCcw,
  Square,
  Circle,
  Type,
  Image,
  Move,
  ZoomIn,
  ZoomOut,
  Grid,
} from "lucide-react";
import type { CurrentView } from "@/types";

interface AnimationEditorProps {
  onViewChange: (view: CurrentView) => void;
}

interface Point {
  x: number;
  y: number;
}

interface DrawingStroke {
  points: Point[];
  color: string;
  brushSize: number;
  tool: string;
  frame: number;
}

interface Frame {
  id: number;
  strokes: DrawingStroke[];
  thumbnail?: string;
}

export function AnimationEditor({ onViewChange }: AnimationEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<
    "pencil" | "eraser" | "brush" | "line" | "rectangle" | "circle" | "text"
  >("pencil");
  const [brushSize, setBrushSize] = useState(5);
  const [color, setColor] = useState("#000000");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(1);
  const [onionSkin, setOnionSkin] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [frames, setFrames] = useState<Frame[]>([
    { id: 1, strokes: [] },
    { id: 2, strokes: [] },
    { id: 3, strokes: [] },
    { id: 4, strokes: [] },
    { id: 5, strokes: [] },
    { id: 6, strokes: [] },
    { id: 7, strokes: [] },
    { id: 8, strokes: [] },
  ]);
  const [currentStroke, setCurrentStroke] = useState<DrawingStroke | null>(
    null
  );
  const [undoStack, setUndoStack] = useState<DrawingStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawingStroke[][]>([]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = 800 * zoom;
    canvas.height = 600 * zoom;
    canvas.style.width = "800px";
    canvas.style.height = "600px";

    const context = canvas.getContext("2d");
    if (!context) return;

    context.scale(zoom, zoom);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    contextRef.current = context;

    drawFrame();
  }, [zoom]);

  // Drawing functions
  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!contextRef.current) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;

      setIsDrawing(true);
      contextRef.current.beginPath();
      contextRef.current.moveTo(x, y);

      const newStroke: DrawingStroke = {
        points: [{ x, y }],
        color,
        brushSize,
        tool: currentTool,
        frame: currentFrame,
      };
      setCurrentStroke(newStroke);
    },
    [color, brushSize, currentTool, currentFrame, zoom]
  );

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !contextRef.current || !currentStroke) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;

      contextRef.current.lineTo(x, y);
      contextRef.current.stroke();

      setCurrentStroke((prev) =>
        prev
          ? {
              ...prev,
              points: [...prev.points, { x, y }],
            }
          : null
      );
    },
    [isDrawing, currentStroke, zoom]
  );

  const stopDrawing = useCallback(() => {
    if (!isDrawing || !currentStroke) return;

    setIsDrawing(false);
    contextRef.current?.closePath();

    // Save stroke to current frame
    setFrames((prev) =>
      prev.map((frame) =>
        frame.id === currentFrame
          ? { ...frame, strokes: [...frame.strokes, currentStroke] }
          : frame
      )
    );

    // Save to undo stack
    setUndoStack((prev) => [
      ...prev,
      frames.find((f) => f.id === currentFrame)?.strokes || [],
    ]);
    setRedoStack([]);

    setCurrentStroke(null);
  }, [isDrawing, currentStroke, currentFrame, frames]);

  // Draw current frame
  const drawFrame = useCallback(() => {
    const context = contextRef.current;
    const canvas = canvasRef.current;
    if (!context || !canvas) return;

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    if (showGrid) {
      context.strokeStyle = "#e5e7eb";
      context.lineWidth = 1;
      const gridSize = 20;

      for (let x = 0; x <= canvas.width; x += gridSize) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, canvas.height);
        context.stroke();
      }

      for (let y = 0; y <= canvas.height; y += gridSize) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(canvas.width, y);
        context.stroke();
      }
    }

    // Draw onion skin (previous frame)
    if (onionSkin && currentFrame > 1) {
      const prevFrame = frames.find((f) => f.id === currentFrame - 1);
      if (prevFrame) {
        context.globalAlpha = 0.3;
        drawStrokes(prevFrame.strokes);
        context.globalAlpha = 1;
      }
    }

    // Draw current frame strokes
    const currentFrameData = frames.find((f) => f.id === currentFrame);
    if (currentFrameData) {
      drawStrokes(currentFrameData.strokes);
    }

    // Draw current stroke
    if (currentStroke) {
      drawStrokes([currentStroke]);
    }
  }, [frames, currentFrame, onionSkin, showGrid, currentStroke]);

  // Draw strokes helper
  const drawStrokes = useCallback((strokes: DrawingStroke[]) => {
    const context = contextRef.current;
    if (!context) return;

    strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;

      context.strokeStyle = stroke.color;
      context.lineWidth = stroke.brushSize;

      if (stroke.tool === "eraser") {
        context.globalCompositeOperation = "destination-out";
      } else {
        context.globalCompositeOperation = "source-over";
      }

      context.beginPath();
      context.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length; i++) {
        context.lineTo(stroke.points[i].x, stroke.points[i].y);
      }

      context.stroke();
    });

    context.globalCompositeOperation = "source-over";
  }, []);

  // Update canvas when frame changes
  useEffect(() => {
    drawFrame();
  }, [drawFrame, currentFrame, frames]);

  // Animation playback
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentFrame((prev) => {
        if (prev >= frames.length) {
          setIsPlaying(false);
          return 1;
        }
        return prev + 1;
      });
    }, 200); // 5 FPS

    return () => clearInterval(interval);
  }, [isPlaying, frames.length]);

  // Tools
  const tools = [
    { id: "pencil", icon: Pencil, label: "Pencil" },
    { id: "brush", icon: Pencil, label: "Brush" },
    { id: "eraser", icon: Eraser, label: "Eraser" },
    { id: "line", icon: Move, label: "Line" },
    { id: "rectangle", icon: Square, label: "Rectangle" },
    { id: "circle", icon: Circle, label: "Circle" },
    { id: "text", icon: Type, label: "Text" },
  ];

  // Frame management
  const addFrame = () => {
    const newFrame: Frame = {
      id: frames.length + 1,
      strokes: [],
    };
    setFrames((prev) => [...prev, newFrame]);
  };

  const deleteFrame = () => {
    if (frames.length <= 1) return;
    setFrames((prev) => prev.filter((f) => f.id !== currentFrame));
    setCurrentFrame((prev) => Math.max(1, prev - 1));
  };

  const duplicateFrame = () => {
    const currentFrameData = frames.find((f) => f.id === currentFrame);
    if (!currentFrameData) return;

    const newFrame: Frame = {
      id: frames.length + 1,
      strokes: [...currentFrameData.strokes],
    };
    setFrames((prev) => [...prev, newFrame]);
  };

  // Undo/Redo
  const undo = () => {
    if (undoStack.length === 0) return;

    const lastStrokes = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [
      ...prev,
      frames.find((f) => f.id === currentFrame)?.strokes || [],
    ]);
    setUndoStack((prev) => prev.slice(0, -1));

    setFrames((prev) =>
      prev.map((frame) =>
        frame.id === currentFrame ? { ...frame, strokes: lastStrokes } : frame
      )
    );
  };

  const redo = () => {
    if (redoStack.length === 0) return;

    const nextStrokes = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [
      ...prev,
      frames.find((f) => f.id === currentFrame)?.strokes || [],
    ]);
    setRedoStack((prev) => prev.slice(0, -1));

    setFrames((prev) =>
      prev.map((frame) =>
        frame.id === currentFrame ? { ...frame, strokes: nextStrokes } : frame
      )
    );
  };

  // Export
  const exportAnimation = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = "animation.png";
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Top Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewChange("creator")}
              className="text-gray-300 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Creator Hub
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <h1 className="text-lg font-semibold">Animation Editor</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-gray-400 bg-transparent border-gray-600"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" size="sm">
              Publish
            </Button>
          </div>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Tool Sidebar */}
        <div className="w-20 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-4 gap-2">
          {tools.map((tool) => (
            <Button
              key={tool.id}
              variant={currentTool === tool.id ? "default" : "ghost"}
              size="sm"
              className="w-12 h-12 p-0"
              onClick={() => setCurrentTool(tool.id as any)}
              title={tool.label}
            >
              <tool.icon className="w-5 h-5" />
            </Button>
          ))}

          <Separator className="w-8 my-2" />

          <Button
            variant="ghost"
            size="sm"
            className="w-12 h-12 p-0"
            onClick={undo}
            title="Undo"
          >
            <Undo className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-12 h-12 p-0"
            onClick={redo}
            title="Redo"
          >
            <Redo className="w-5 h-5" />
          </Button>

          <Separator className="w-8 my-2" />

          <Button
            variant={onionSkin ? "default" : "ghost"}
            size="sm"
            className="w-12 h-12 p-0"
            onClick={() => setOnionSkin(!onionSkin)}
            title="Onion Skin"
          >
            {onionSkin ? (
              <Eye className="w-5 h-5" />
            ) : (
              <EyeOff className="w-5 h-5" />
            )}
          </Button>

          <Button
            variant={showGrid ? "default" : "ghost"}
            size="sm"
            className="w-12 h-12 p-0"
            onClick={() => setShowGrid(!showGrid)}
            title="Show Grid"
          >
            <Grid className="w-5 h-5" />
          </Button>
        </div>

        {/* Color and Brush Panel */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 p-4">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Color</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-12 h-8 p-1 border-gray-600"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="flex-1"
                  placeholder="#000000"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">
                Brush Size: {brushSize}px
              </Label>
              <Slider
                value={[brushSize]}
                onValueChange={(value) => setBrushSize(value[0])}
                max={50}
                min={1}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">
                Zoom: {Math.round(zoom * 100)}%
              </Label>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.1))}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setZoom(1)}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom((prev) => Math.min(3, prev + 0.1))}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-sm font-medium">Quick Colors</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[
                  "#000000",
                  "#ff0000",
                  "#00ff00",
                  "#0000ff",
                  "#ffff00",
                  "#ff00ff",
                  "#00ffff",
                  "#ffffff",
                ].map((c) => (
                  <button
                    key={c}
                    className="w-8 h-8 rounded border-2 border-gray-600 hover:border-white"
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Canvas Area */}
          <div className="flex-1 bg-gray-900 flex items-center justify-center p-8">
            <Card className="bg-white">
              <CardContent className="p-0">
                <canvas
                  ref={canvasRef}
                  className="border border-gray-300 cursor-crosshair"
                  style={{ imageRendering: "pixelated" }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </CardContent>
            </Card>
          </div>

          {/* Timeline */}
          <div className="bg-gray-800 border-t border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentFrame(1)}
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentFrame(frames.length)}
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-300 ml-4">
                  Frame {currentFrame} of {frames.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-gray-600"
                  onClick={addFrame}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Frame
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-gray-600"
                  onClick={duplicateFrame}
                >
                  <Layers className="w-4 h-4 mr-2" />
                  Duplicate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-gray-600"
                  onClick={deleteFrame}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-gray-600"
                  onClick={exportAnimation}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {frames.map((frame) => (
                <Card
                  key={frame.id}
                  className={`min-w-[100px] cursor-pointer transition-colors ${
                    currentFrame === frame.id
                      ? "bg-blue-600 border-blue-500"
                      : "bg-gray-700 border-gray-600 hover:bg-gray-600"
                  }`}
                  onClick={() => setCurrentFrame(frame.id)}
                >
                  <CardContent className="p-2">
                    <div className="w-full h-16 bg-gray-600 rounded mb-2 flex items-center justify-center">
                      <span className="text-xs text-gray-400">
                        Frame {frame.id}
                      </span>
                    </div>
                    <div className="text-xs text-center text-gray-300">
                      {frame.id === 1
                        ? "0.0s"
                        : `${((frame.id - 1) * 0.1).toFixed(1)}s`}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
