"use client";

import { Card, CardContent } from "@/components/ui/card";
import React from "react";

export interface CanvasViewportProps {
  show: boolean;
  panX: number;
  panY: number;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onDragOver: (e: React.DragEvent<HTMLCanvasElement>) => void;
  onDrop: (e: React.DragEvent<HTMLCanvasElement>) => void;
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseLeave: () => void;
  onContextMenu: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onWheel: (e: React.WheelEvent<HTMLCanvasElement>) => void;
  isPanning: boolean;
}

export default function CanvasViewport({
  show,
  panX,
  panY,
  canvasRef,
  onDragOver,
  onDrop,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  onContextMenu,
  onWheel,
  isPanning,
}: CanvasViewportProps) {
  if (!show) return null;
  return (
    <Card
      className="bg-white"
      style={{
        transform: `translate(${panX}px, ${panY}px)`,
        transition: isPanning ? "none" : "transform 0.1s ease-out",
      }}
    >
      <CardContent className="p-0">
        <canvas
          ref={canvasRef}
          className="border border-gray-300 cursor-crosshair"
          style={{ imageRendering: "pixelated" }}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onContextMenu={onContextMenu}
          onWheel={onWheel}
        />
      </CardContent>
    </Card>
  );
}


