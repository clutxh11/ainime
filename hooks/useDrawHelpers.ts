export default function useDrawHelpers({ contextRef }: any) {
  const drawStrokes = (
    strokes: {
      points: { x: number; y: number }[];
      color: string;
      brushSize: number;
    }[]
  ) => {
    const context = contextRef.current as CanvasRenderingContext2D | null;
    if (!context) return;
    strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;
      context.strokeStyle = stroke.color;
      context.lineWidth = stroke.brushSize;
      context.globalCompositeOperation = "source-over";
      context.beginPath();
      context.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++)
        context.lineTo(stroke.points[i].x, stroke.points[i].y);
      context.stroke();
    });
  };
  return { drawStrokes } as const;
}
