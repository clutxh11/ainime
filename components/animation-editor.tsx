"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
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
} from "lucide-react"
import type { CurrentView } from "@/app/page"

interface AnimationEditorProps {
  onViewChange: (view: CurrentView) => void
}

export function AnimationEditor({ onViewChange }: AnimationEditorProps) {
  const [selectedTool, setSelectedTool] = useState<"pencil" | "eraser">("pencil")
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentFrame, setCurrentFrame] = useState(1)
  const [onionSkin, setOnionSkin] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const frames = Array.from({ length: 8 }, (_, i) => i + 1)

  const tools = [
    { id: "pencil", icon: Pencil, label: "Pencil" },
    { id: "eraser", icon: Eraser, label: "Eraser" },
  ]

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
            <Button variant="outline" size="sm" className="text-gray-400 bg-transparent border-gray-600">
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
        <div className="w-16 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-4 gap-2">
          {tools.map((tool) => (
            <Button
              key={tool.id}
              variant={selectedTool === tool.id ? "default" : "ghost"}
              size="sm"
              className="w-12 h-12 p-0"
              onClick={() => setSelectedTool(tool.id as "pencil" | "eraser")}
            >
              <tool.icon className="w-5 h-5" />
            </Button>
          ))}
          <Separator className="w-8 my-2" />
          <Button variant="ghost" size="sm" className="w-12 h-12 p-0">
            <Undo className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm" className="w-12 h-12 p-0">
            <Redo className="w-5 h-5" />
          </Button>
          <Separator className="w-8 my-2" />
          <Button
            variant={onionSkin ? "default" : "ghost"}
            size="sm"
            className="w-12 h-12 p-0"
            onClick={() => setOnionSkin(!onionSkin)}
          >
            {onionSkin ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </Button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Canvas Area */}
          <div className="flex-1 bg-gray-900 flex items-center justify-center p-8">
            <Card className="bg-white">
              <CardContent className="p-0">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={600}
                  className="border border-gray-300 cursor-crosshair"
                  style={{ imageRendering: "pixelated" }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Timeline */}
          <div className="bg-gray-800 border-t border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsPlaying(!isPlaying)}>
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="sm">
                  <SkipBack className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <SkipForward className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-300 ml-4">
                  Frame {currentFrame} of {frames.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="bg-transparent border-gray-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Frame
                </Button>
                <Button variant="outline" size="sm" className="bg-transparent border-gray-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Frame
                </Button>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {frames.map((frame) => (
                <Card
                  key={frame}
                  className={`min-w-[100px] cursor-pointer transition-colors ${
                    currentFrame === frame
                      ? "bg-blue-600 border-blue-500"
                      : "bg-gray-700 border-gray-600 hover:bg-gray-600"
                  }`}
                  onClick={() => setCurrentFrame(frame)}
                >
                  <CardContent className="p-2">
                    <div className="w-full h-16 bg-gray-600 rounded mb-2 flex items-center justify-center">
                      <span className="text-xs text-gray-400">Frame {frame}</span>
                    </div>
                    <div className="text-xs text-center text-gray-300">
                      {frame === 1 ? "0.0s" : `${((frame - 1) * 0.1).toFixed(1)}s`}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
