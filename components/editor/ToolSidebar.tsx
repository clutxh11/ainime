"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Grid } from "lucide-react";

export interface ToolDef {
  id: string;
  icon: any;
  label: string;
}

export interface ToolSidebarProps {
  visible: boolean;
  tools: ToolDef[];
  currentTool: string;
  setCurrentTool: (tool: string) => void;
  onionSkin: boolean;
  setOnionSkin: (v: boolean) => void;
  showGrid: boolean;
  setShowGrid: (v: boolean) => void;
  onToolSwitched?: () => void;
}

export default function ToolSidebar({
  visible,
  tools,
  currentTool,
  setCurrentTool,
  onionSkin,
  setOnionSkin,
  showGrid,
  setShowGrid,
  onToolSwitched,
}: ToolSidebarProps) {
  if (!visible) return null;
  return (
    <div className="w-20 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-4 gap-2 flex-shrink-0">
      {tools.map((tool) => (
        <Button
          key={tool.id}
          variant={currentTool === tool.id ? "default" : "ghost"}
          size="sm"
          className="w-12 h-12 p-0"
          onClick={() => {
            setCurrentTool(tool.id);
            onToolSwitched?.();
          }}
          title={tool.label}
        >
          <tool.icon className="w-5 h-5" />
        </Button>
      ))}

      <Separator className="w-8 my-2" />

      <Button
        variant={onionSkin ? "default" : "ghost"}
        size="sm"
        className="w-12 h-12 p-0"
        onClick={() => setOnionSkin(!onionSkin)}
        title="Onion Skin"
      >
        {onionSkin ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
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
  );
}


