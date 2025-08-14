export interface Point {
  x: number;
  y: number;
}
export interface DrawingStroke {
  id: string;
  color: string;
  brushSize: number;
  points: Point[];
}

export interface DrawArgs {
  frameNumber: number | null;
  showGrid: boolean;
  drawingFrames: Array<{
    rowId: string;
    frameIndex: number;
    length: number;
    imageUrl?: string;
    fileName?: string;
  }>;
  layerOrder: Record<string, string[]>;
  layerVisibility: Record<string, boolean>;
  layerOpacities: Record<string, number>;
  layerStrokes: Record<string, DrawingStroke[]>;
  currentStroke: DrawingStroke | null;
  eraserCircle: { x: number; y: number } | null;
  currentTool: string;
  eraserSize: number;
  onionSkin: boolean;
  zoom: number;
  panOffset: { x: number; y: number };
  lassoSelection: { points: Point[]; isActive: boolean } | null;
  pastePreview: DrawingStroke[] | null;
  isResizing: boolean;
  resizeBox: { x: number; y: number; width: number; height: number } | null;
  imageCache: Record<string, HTMLImageElement>;
}

export function drawFrameImpl(ctx: CanvasRenderingContext2D, args: DrawArgs) {
  const {
    frameNumber,
    showGrid,
    drawingFrames,
    layerOrder,
    layerVisibility,
    layerOpacities,
    layerStrokes,
    currentStroke,
    eraserCircle,
    currentTool,
    eraserSize,
    onionSkin,
    zoom,
    panOffset,
    lassoSelection,
    pastePreview,
    isResizing,
    resizeBox,
    imageCache,
  } = args;

  ctx.save();
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  if (frameNumber !== null) {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  if (showGrid) {
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 0.5;
    const gridSize = 20;
    const extendedWidth = ctx.canvas.width * 2;
    const extendedHeight = ctx.canvas.height * 2;
    const offsetX = -ctx.canvas.width / 2;
    const offsetY = -ctx.canvas.height / 2;
    for (let x = offsetX; x <= extendedWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, offsetY);
      ctx.lineTo(x, extendedHeight);
      ctx.stroke();
    }
    for (let y = offsetY; y <= extendedHeight; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(offsetX, y);
      ctx.lineTo(extendedWidth, y);
      ctx.stroke();
    }
  }

  if (frameNumber === null) {
    ctx.restore();
    return;
  }

  const drawImageCentered = (img: HTMLImageElement) => {
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;
    let width = img.width;
    let height = img.height;
    if (width > canvasWidth || height > canvasHeight) {
      const scale = Math.min(canvasWidth / width, canvasHeight / height);
      width *= scale;
      height *= scale;
    }
    const x = (canvasWidth - width) / 2;
    const y = (canvasHeight - height) / 2;
    ctx.drawImage(img, x, y, width, height);
  };

  const loadAndDraw = (src: string) => {
    const signedMarker = "/storage/v1/object/sign/";
    if (src.includes(signedMarker)) {
      // Avoid triggering a network request for expiring signed URLs.
      // A higher-level preload swaps these to blob URLs when available.
      return;
    }
    let img = imageCache[src];
    if (img) {
      drawImageCentered(img);
      return;
    }
    const loader = new Image();
    loader.crossOrigin = "anonymous";
    loader.onload = () => {
      imageCache[src] = loader;
      drawImageCentered(loader);
    };
    loader.onerror = () => {};
    loader.src = src;
  };

  const framesForIndex = drawingFrames.filter(
    (df) =>
      frameNumber >= df.frameIndex &&
      frameNumber < df.frameIndex + (df.length || 1)
  );

  // Onion skin behind
  if (onionSkin) {
    const prev = frameNumber - 1;
    if (prev >= 0) {
      ctx.globalAlpha = 0.3;
      const prevFrames = drawingFrames.filter(
        (df) => prev >= df.frameIndex && prev < df.frameIndex + (df.length || 1)
      );
      for (const pf of prevFrames) {
        const folderId = `${pf.rowId}-${pf.frameIndex}`;
        const orderedLayers = layerOrder[folderId] || [];
        for (const layerId of orderedLayers) {
          if (layerVisibility[layerId] === false) continue;
          if (layerId.endsWith("-main") && pf.imageUrl) {
            const src = pf.imageUrl;
            const signedMarker = "/storage/v1/object/sign/";
            if (src.includes(signedMarker)) {
              // Skip loading signed URLs here; rely on preload swap to blob URLs.
              continue;
            }
            let img = imageCache[src];
            if (img) {
              drawImageCentered(img);
            } else {
              const loader = new Image();
              loader.crossOrigin = "anonymous";
              loader.onload = () => {
                imageCache[src] = loader;
                drawImageCentered(loader);
              };
              loader.src = src;
            }
          }
          const strokes = layerStrokes[layerId];
          if (strokes) {
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            strokes.forEach((stroke) => {
              ctx.strokeStyle = stroke.color;
              ctx.lineWidth = stroke.brushSize ?? 2;
              ctx.beginPath();
              stroke.points.forEach((p, i) =>
                i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
              );
              ctx.stroke();
            });
          }
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  // Current frame
  for (const frame of framesForIndex) {
    const folderId = `${frame.rowId}-${frame.frameIndex}`;
    const orderedLayers = layerOrder[folderId] || [];
    // Fallback: if no layer order yet but imageUrl exists, draw the frame image
    if (orderedLayers.length === 0 && frame.imageUrl) {
      loadAndDraw(frame.imageUrl);
    }
    for (const layerId of orderedLayers) {
      if (layerVisibility[layerId] === false) continue;
      ctx.globalAlpha = layerOpacities[layerId] ?? 1;
      if (layerId.endsWith("-main") && frame.imageUrl) {
        loadAndDraw(frame.imageUrl);
      }
      const strokes = layerStrokes[layerId];
      if (strokes) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        strokes.forEach((stroke) => {
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = stroke.brushSize ?? 2;
          ctx.beginPath();
          stroke.points.forEach((p, i) =>
            i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
          );
          ctx.stroke();
        });
      }
    }
  }

  // Current stroke
  if (currentStroke) {
    ctx.globalAlpha = 1;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = currentStroke.color;
    ctx.lineWidth = currentStroke.brushSize;
    ctx.beginPath();
    currentStroke.points.forEach((p, i) =>
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
    );
    ctx.stroke();
  }

  // Eraser circle
  if (eraserCircle && currentTool === "eraser") {
    ctx.save();
    ctx.fillStyle = "rgba(128,128,128,0.3)";
    ctx.beginPath();
    ctx.arc(eraserCircle.x, eraserCircle.y, eraserSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Lasso path
  if (lassoSelection && lassoSelection.points.length > 0) {
    ctx.save();
    ctx.strokeStyle = "rgba(0,150,255,0.8)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(lassoSelection.points[0].x, lassoSelection.points[0].y);
    for (let i = 1; i < lassoSelection.points.length; i++) {
      const p = lassoSelection.points[i];
      ctx.lineTo(p.x, p.y);
    }
    if (lassoSelection.isActive) ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  // Resize box
  if (isResizing && resizeBox) {
    ctx.save();
    ctx.strokeStyle = "#007bff";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 3]);
    ctx.strokeRect(resizeBox.x, resizeBox.y, resizeBox.width, resizeBox.height);
    ctx.restore();
  }

  ctx.restore();
}
