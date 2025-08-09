"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Mode = "animate" | "storyboard";

interface StrokePoint {
  x: number;
  y: number;
}

interface Stroke {
  points: StrokePoint[];
  color: string;
  width: number;
}

interface FrameData {
  strokesByLayerId: Record<string, Stroke[]>;
}

interface Layer {
  id: string;
  name: string;
  visible: boolean;
}

interface AudioTrack {
  id: string;
  name: string;
  fileName?: string;
  muted: boolean;
}

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function EditorShell(): JSX.Element {
  const params = useSearchParams();
  const mode = (params.get("mode") || "animate") as Mode;
  const projectId = params.get("projectId") || "";
  const chapterId = params.get("chapterId") || "";
  const sequenceId = params.get("sequenceId") || "";
  const shotId = params.get("shotId") || "";

  // Timeline / playback
  const [fps, setFps] = useState<number>(12);
  const [durationFrames, setDurationFrames] = useState<number>(72);
  const [currentFrame, setCurrentFrame] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const playTimerRef = useRef<number | null>(null);

  // Canvas state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [brushColor, setBrushColor] = useState<string>("#ffffff");
  const [brushWidth, setBrushWidth] = useState<number>(3);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [onionSkin, setOnionSkin] = useState<boolean>(true);

  // Layers
  const [layers, setLayers] = useState<Layer[]>([
    { id: generateId("layer"), name: "Line", visible: true },
  ]);
  const [activeLayerId, setActiveLayerId] = useState<string>(() => layers[0]?.id);

  // Frames data (in-memory)
  const [frames, setFrames] = useState<Record<number, FrameData>>({});

  // Audio (placeholder rows)
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);

  const ensureFrameData = useCallback(
    (frame: number): FrameData => {
      setFrames((prev) => {
        if (!prev[frame]) {
          return { ...prev, [frame]: { strokesByLayerId: {} } };
        }
        return prev;
      });
      return frames[frame] || { strokesByLayerId: {} };
    },
    [frames]
  );

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeLayerId) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setFrames((prev) => {
      const frameData: FrameData = prev[currentFrame] || { strokesByLayerId: {} };
      const strokes = frameData.strokesByLayerId[activeLayerId] || [];
      const newStroke: Stroke = { points: [{ x, y }], color: brushColor, width: brushWidth };
      const next: FrameData = {
        strokesByLayerId: {
          ...frameData.strokesByLayerId,
          [activeLayerId]: [...strokes, newStroke],
        },
      };
      return { ...prev, [currentFrame]: next };
    });
    setIsDrawing(true);
  };

  const continueDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !activeLayerId) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setFrames((prev) => {
      const frameData = prev[currentFrame];
      if (!frameData) return prev;
      const strokes = frameData.strokesByLayerId[activeLayerId] || [];
      const last = strokes[strokes.length - 1];
      if (!last) return prev;
      last.points.push({ x, y });
      return { ...prev };
    });
  };

  const stopDrawing = () => setIsDrawing(false);

  // Render frames
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const drawStroke = (stroke: Stroke) => {
      if (stroke.points.length < 2) return;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    };

    const drawFrame = (frameNumber: number, alpha = 1) => {
      const frameData = frames[frameNumber];
      if (!frameData) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      // draw by layer order
      for (const layer of layers) {
        if (!layer.visible) continue;
        const strokes = frameData.strokesByLayerId[layer.id] || [];
        strokes.forEach(drawStroke);
      }
      ctx.restore();
    };

    // Onion skin: previous/next
    if (mode === "animate" && onionSkin) {
      drawFrame(currentFrame - 1, 0.25);
      drawFrame(currentFrame + 1, 0.25);
    }
    drawFrame(currentFrame, 1);
  }, [frames, currentFrame, layers, mode, onionSkin]);

  // Playback
  useEffect(() => {
    if (!isPlaying) {
      if (playTimerRef.current) cancelAnimationFrame(playTimerRef.current);
      playTimerRef.current = null;
      return;
    }
    let last = performance.now();
    const frameDurationMs = 1000 / fps;
    const step = (now: number) => {
      if (now - last >= frameDurationMs) {
        last = now;
        setCurrentFrame((f) => (f >= durationFrames ? 1 : f + 1));
      }
      playTimerRef.current = requestAnimationFrame(step);
    };
    playTimerRef.current = requestAnimationFrame(step);
    return () => {
      if (playTimerRef.current) cancelAnimationFrame(playTimerRef.current);
      playTimerRef.current = null;
    };
  }, [isPlaying, fps, durationFrames]);

  // UI helpers
  const addLayer = () => {
    const id = generateId("layer");
    setLayers((prev) => [...prev, { id, name: `Layer ${prev.length + 1}`, visible: true }]);
    setActiveLayerId(id);
  };

  const toggleLayerVisibility = (id: string) =>
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));

  const addAudioTrack = () =>
    setAudioTracks((prev) => [...prev, { id: generateId("track"), name: `Track ${prev.length + 1}`, muted: false }]);

  const onAudioFileChange = (trackId: string, file?: File | null) => {
    if (!file) return;
    setAudioTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, fileName: file.name } : t)));
  };

  const frameButtons = useMemo(() => {
    const items: number[] = [];
    for (let i = 1; i <= durationFrames; i++) items.push(i);
    return items;
  }, [durationFrames]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      {/* Top bar */}
      <div className="h-14 border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm flex items-center px-4 gap-4 sticky top-0 z-50">
        <div className="font-semibold">
          {projectId ? `Project ${projectId}` : "Project"} / {chapterId || "Chapter"} / {sequenceId || "Seq"} / {shotId || "Shot"}
        </div>
        <Badge variant="secondary" className="bg-gray-700 text-gray-200">
          {mode === "animate" ? "Animate" : "Storyboard"}
        </Badge>
        <div className="ml-auto flex items-center gap-2">
          {mode === "animate" && (
            <>
              <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => setIsPlaying((p) => !p)}>
                {isPlaying ? "Pause" : "Play"}
              </Button>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <span>FPS</span>
                <Input
                  type="number"
                  className="w-16 bg-gray-800 border-gray-700"
                  value={fps}
                  onChange={(e) => setFps(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <span>Frames</span>
                <Input
                  type="number"
                  className="w-20 bg-gray-800 border-gray-700"
                  value={durationFrames}
                  onChange={(e) => setDurationFrames(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left toolbar */}
        <div className="w-16 border-r border-gray-800 bg-gray-900 flex flex-col items-center gap-3 p-3">
          <input
            type="color"
            aria-label="Brush color"
            className="w-8 h-8 p-0 border-0 bg-transparent cursor-pointer"
            value={brushColor}
            onChange={(e) => setBrushColor(e.target.value)}
          />
          <div className="text-xs text-gray-400">Width</div>
          <Slider
            value={[brushWidth]}
            min={1}
            max={20}
            step={1}
            onValueChange={(v) => setBrushWidth(v[0])}
            className="w-10 rotate-90"
          />
          {mode === "animate" && (
            <Button variant="outline" size="sm" className="text-xs border-gray-700" onClick={() => setOnionSkin((o) => !o)}>
              {onionSkin ? "Onion On" : "Onion Off"}
            </Button>
          )}
        </div>

        {/* Center canvas */}
        <div className="flex-1 bg-gray-950 flex flex-col items-center justify-center">
          <div className="w-full max-w-5xl aspect-video bg-gray-800 border border-gray-700 rounded-md overflow-hidden">
            <canvas
              ref={canvasRef}
              width={1280}
              height={720}
              className="w-full h-full cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={continueDrawing}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
          </div>
        </div>

        {/* Right panel (layers + meta) */}
        <div className="w-80 border-l border-gray-800 bg-gray-900 p-3 flex flex-col gap-3">
          <div>
            <div className="text-sm text-gray-300 mb-2">Layers</div>
            <div className="space-y-2">
              {layers.map((layer) => (
                <div key={layer.id} className={`flex items-center justify-between rounded border ${layer.id === activeLayerId ? "border-red-600" : "border-gray-700"} bg-gray-800 px-2 py-1`}>
                  <button
                    className="text-left text-sm text-gray-200 flex-1"
                    onClick={() => setActiveLayerId(layer.id)}
                  >
                    {layer.name}
                  </button>
                  <Button variant="outline" size="xs" className="border-gray-700" onClick={() => toggleLayerVisibility(layer.id)}>
                    {layer.visible ? "Hide" : "Show"}
                  </Button>
                </div>
              ))}
            </div>
            <Button className="w-full mt-2 bg-red-600 hover:bg-red-700" size="sm" onClick={addLayer}>
              Add Layer
            </Button>
          </div>

          <div>
            <div className="text-sm text-gray-300 mb-2">Shot Metadata</div>
            <div className="text-xs text-gray-400 space-y-1">
              <div>Project: {projectId || "-"}</div>
              <div>Chapter: {chapterId || "-"}</div>
              <div>Sequence: {sequenceId || "-"}</div>
              <div>Shot: {shotId || "-"}</div>
              <div>FPS: {fps}</div>
              {mode === "animate" && <div>Frames: {durationFrames}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom timeline / panels */}
      <div className="border-t border-gray-800 bg-gray-900 p-3">
        {mode === "animate" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 overflow-x-auto">
              {frameButtons.map((f) => (
                <button
                  key={f}
                  onClick={() => setCurrentFrame(f)}
                  className={`min-w-[28px] h-8 px-1 text-xs rounded ${
                    currentFrame === f ? "bg-red-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-300">Audio Tracks</div>
                <Button size="sm" variant="outline" className="border-gray-700" onClick={addAudioTrack}>
                  Add Track
                </Button>
              </div>
              <div className="space-y-2">
                {audioTracks.length === 0 && (
                  <div className="text-xs text-gray-500">No audio tracks added</div>
                )}
                {audioTracks.map((t) => (
                  <div key={t.id} className="bg-gray-800 border border-gray-700 rounded p-2 flex items-center justify-between">
                    <div className="text-sm text-gray-200">{t.name}</div>
                    <div className="flex items-center gap-2">
                      <Input type="file" accept="audio/*" className="bg-gray-900 border-gray-700 text-xs" onChange={(e) => onAudioFileChange(t.id, e.target.files?.[0])} />
                      <div className="text-xs text-gray-400 min-w-[120px] truncate">{t.fileName || "No file"}</div>
                      <Button size="sm" variant="outline" className="border-gray-700" onClick={() => setAudioTracks((prev) => prev.map((x) => (x.id === t.id ? { ...x, muted: !x.muted } : x)))}>
                        {t.muted ? "Unmute" : "Mute"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-sm text-gray-300 mb-2">Storyboard Panels</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[3/2] bg-gray-800 border border-gray-700 rounded" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


