import { useEffect } from "react";

export default function useCanvasSetup({
  canvasRef,
  contextRef,
  appliedWidth,
  appliedHeight,
  color,
  brushSize,
  zoom,
  drawFrame,
}: any) {
  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement | null;
    if (!canvas) return;

    const canvasWidth = appliedWidth ?? 800;
    const canvasHeight = appliedHeight ?? 600;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const maxDisplayHeight = window.innerHeight * 0.6;
    const maxDisplayWidth = window.innerWidth * 0.7;

    const scaleX = maxDisplayWidth / canvasWidth;
    const scaleY = maxDisplayHeight / canvasHeight;
    const autoScale = Math.min(scaleX, scaleY, 1);

    const finalScale = autoScale * zoom;
    canvas.style.width = `${canvasWidth * finalScale}px`;
    canvas.style.height = `${canvasHeight * finalScale}px`;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    contextRef.current = context;

    drawFrame();
  }, [
    canvasRef,
    contextRef,
    zoom,
    appliedWidth,
    appliedHeight,
    color,
    brushSize,
    drawFrame,
  ]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current as HTMLCanvasElement | null;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  return { getCanvasCoords } as const;
}
