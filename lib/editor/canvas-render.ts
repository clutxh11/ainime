export async function renderFrameToContextImpl(
  frameIndex: number,
  targetCtx: CanvasRenderingContext2D,
  includeGrid: boolean,
  drawingFrames: Array<{
    rowId: string;
    frameIndex: number;
    length: number;
    imageUrl?: string;
  }>,
  layerOrder: Record<string, string[]>,
  layerVisibility: Record<string, boolean>,
  layerOpacities: Record<string, number>,
  layerStrokes: Record<
    string,
    Array<{
      color: string;
      brushSize: number;
      points: { x: number; y: number }[];
    }>
  >
) {
  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  targetCtx.save();
  targetCtx.clearRect(0, 0, targetCtx.canvas.width, targetCtx.canvas.height);

  // background
  targetCtx.fillStyle = "#ffffff";
  targetCtx.fillRect(0, 0, targetCtx.canvas.width, targetCtx.canvas.height);

  if (includeGrid) {
    targetCtx.strokeStyle = "#e0e0e0";
    targetCtx.lineWidth = 0.5;
    const gridSize = 20;
    for (let x = 0; x <= targetCtx.canvas.width; x += gridSize) {
      targetCtx.beginPath();
      targetCtx.moveTo(x, 0);
      targetCtx.lineTo(x, targetCtx.canvas.height);
      targetCtx.stroke();
    }
    for (let y = 0; y <= targetCtx.canvas.height; y += gridSize) {
      targetCtx.beginPath();
      targetCtx.moveTo(0, y);
      targetCtx.lineTo(targetCtx.canvas.width, y);
      targetCtx.stroke();
    }
  }

  const framesForIndex = drawingFrames.filter(
    (df) =>
      frameIndex >= df.frameIndex &&
      frameIndex < df.frameIndex + (df.length || 1)
  );
  for (const frame of framesForIndex) {
    const folderId = `${frame.rowId}-${frame.frameIndex}`;
    const orderedLayers = layerOrder[folderId] || [];
    for (const layerId of orderedLayers) {
      if (layerVisibility[layerId] === false) continue;
      targetCtx.globalAlpha = layerOpacities[layerId] ?? 1;
      if (layerId.endsWith("-main") && frame.imageUrl) {
        try {
          const img = await loadImage(frame.imageUrl);
          targetCtx.drawImage(img, 0, 0);
        } catch {}
      }
      const strokes = layerStrokes[layerId];
      if (strokes && strokes.length > 0) {
        targetCtx.lineCap = "round";
        targetCtx.lineJoin = "round";
        strokes.forEach((stroke) => {
          targetCtx.strokeStyle = stroke.color;
          targetCtx.lineWidth = stroke.brushSize ?? 2;
          targetCtx.beginPath();
          stroke.points.forEach((p, i) => {
            if (i === 0) targetCtx.moveTo(p.x, p.y);
            else targetCtx.lineTo(p.x, p.y);
          });
          targetCtx.stroke();
        });
      }
    }
  }

  targetCtx.restore();
}
