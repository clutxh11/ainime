import { MutableRefObject, useCallback } from "react";

export interface Point {
  x: number;
  y: number;
}
export interface DrawingStroke {
  id: string;
  points: Point[];
  color: string;
  brushSize: number;
  tool: string;
  layerId: string | null;
}

interface UseCanvasInteractionsArgs {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  contextRef: MutableRefObject<CanvasRenderingContext2D | null>;
  getCanvasCoords: (e: React.MouseEvent<HTMLCanvasElement>) => {
    x: number;
    y: number;
  };
  drawFrame: () => void;
  // state and setters consumed by handlers
  zoom: number;
  panOffset: { x: number; y: number };
  setPanOffset: (p: { x: number; y: number }) => void;
  isSpacePressed: boolean;
  selectedLayerId: string | null;
  currentTool: string;
  color: string;
  brushSize: number;
  eraserSize: number;
  eraserStyle: "precision" | "stroke";
  setIsPanning: (v: boolean) => void;
  setIsDrawing: (v: boolean) => void;
  setCurrentStroke: (s: DrawingStroke | null) => void;
  generateStrokeId: () => string;
  layerStrokes: Record<string, DrawingStroke[]>;
  setLayerStrokes: React.Dispatch<
    React.SetStateAction<Record<string, DrawingStroke[]>>
  >;
  // selection/move/resize
  lassoSelection: {
    points: Point[];
    selectedStrokeIds: string[];
    isActive: boolean;
  } | null;
  setLassoSelection: (v: any) => void;
  isResizing: boolean;
  resizeBox: any;
  setResizeBox: (v: any) => void;
  isDraggingResizeBox: boolean;
  setIsDraggingResizeBox: (v: boolean) => void;
  dragOffset: { x: number; y: number };
  setDragOffset: (p: { x: number; y: number }) => void;
  activeHandle: string | null;
  setActiveHandle: (h: string | null) => void;
  originalLassoPoints: Point[];
  setOriginalLassoPoints: (pts: Point[]) => void;
  originalStrokePositions: Record<string, { points: Point[] }>;
  setOriginalStrokePositions: (v: Record<string, { points: Point[] }>) => void;
  // misc
  isPanning: boolean;
  saveToUndoStack: () => void;
  getResizeHandles: (box: any) => any;
  isPointInPolygon: (p: Point, poly: Point[]) => boolean;
  lastErasePointRef: MutableRefObject<Point | null>;
}

export default function useCanvasInteractions(args: UseCanvasInteractionsArgs) {
  const {
    canvasRef,
    contextRef,
    getCanvasCoords,
    drawFrame,
    zoom,
    panOffset,
    setPanOffset,
    isSpacePressed,
    selectedLayerId,
    currentTool,
    color,
    brushSize,
    eraserSize,
    eraserStyle,
    setIsPanning,
    setIsDrawing,
    setCurrentStroke,
    generateStrokeId,
    layerStrokes,
    setLayerStrokes,
    lassoSelection,
    setLassoSelection,
    isResizing,
    resizeBox,
    setResizeBox,
    isDraggingResizeBox,
    setIsDraggingResizeBox,
    dragOffset,
    setDragOffset,
    activeHandle,
    setActiveHandle,
    originalLassoPoints,
    setOriginalLassoPoints,
    originalStrokePositions,
    setOriginalStrokePositions,
    isPanning,
    saveToUndoStack,
    getResizeHandles,
    isPointInPolygon,
    lastErasePointRef,
  } = args;

  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!contextRef.current || !selectedLayerId) return;
      const coords = getCanvasCoords(e);
      const { x, y } = coords;

      if (isResizing && resizeBox) {
        const handles = getResizeHandles(resizeBox);
        for (const [handleName, handle] of Object.entries(handles)) {
          const handleScreenX = (handle as any).x;
          const handleScreenY = (handle as any).y;
          if (
            x >= handleScreenX &&
            x <= handleScreenX + (handle as any).size &&
            y >= handleScreenY &&
            y <= handleScreenY + (handle as any).size
          ) {
            setActiveHandle(handleName);
            return;
          }
        }

        const { x: boxX, y: boxY, width, height } = resizeBox;
        if (x >= boxX && x <= boxX + width && y >= boxY && y <= boxY + height) {
          setIsDraggingResizeBox(true);
          setDragOffset({ x: x - boxX, y: y - boxY });
          return;
        }

        setResizeBox(null);
        setActiveHandle(null);
        setIsDraggingResizeBox(false);
        return;
      }

      if (e.button === 1 || isSpacePressed) {
        setIsPanning(true);
        setPanOffset({ x: (e as any).clientX, y: (e as any).clientY });
        return;
      }

      if (currentTool === "move") {
        if (lassoSelection && lassoSelection.isActive) {
          if (isPointInPolygon({ x, y }, lassoSelection.points)) {
            // start moving
            setIsDraggingResizeBox(false);
            setDragOffset({ x, y });
            setOriginalLassoPoints([...originalLassoPoints]);
            const originalPositions: Record<string, { points: Point[] }> = {};
            if (selectedLayerId) {
              const allStrokesOnLayer = layerStrokes[selectedLayerId] || [];
              lassoSelection.selectedStrokeIds.forEach((strokeId) => {
                const stroke = allStrokesOnLayer.find((s) => s.id === strokeId);
                if (stroke) {
                  originalPositions[strokeId] = {
                    points: JSON.parse(JSON.stringify(stroke.points)),
                  };
                }
              });
            }
            setOriginalStrokePositions(originalPositions);
            return;
          } else {
            setLassoSelection(null);
            setOriginalLassoPoints([]);
            setOriginalStrokePositions({});
          }
        }

        setLassoSelection({
          points: [{ x, y }],
          selectedStrokeIds: [],
          isActive: false,
        });
        return;
      }

      setIsDrawing(true);
      if (currentTool === "eraser") {
        lastErasePointRef.current = coords;
        // immediate erase handled in draw()
        return;
      }

      contextRef.current.beginPath();
      contextRef.current.moveTo(x, y);
      const newStroke: DrawingStroke = {
        id: generateStrokeId(),
        points: [{ x, y }],
        color,
        brushSize: currentTool === "eraser" ? eraserSize : brushSize,
        tool: currentTool,
        layerId: selectedLayerId,
      };
      setCurrentStroke(newStroke);
    },
    [
      contextRef,
      selectedLayerId,
      getCanvasCoords,
      isResizing,
      resizeBox,
      getResizeHandles,
      setActiveHandle,
      setIsDraggingResizeBox,
      setDragOffset,
      setResizeBox,
      isSpacePressed,
      setIsPanning,
      setPanOffset,
      currentTool,
      lassoSelection,
      isPointInPolygon,
      originalLassoPoints,
      layerStrokes,
      setOriginalStrokePositions,
      setLassoSelection,
      setIsDrawing,
      lastErasePointRef,
      color,
      brushSize,
      eraserSize,
      setCurrentStroke,
      generateStrokeId,
    ]
  );

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const coords = getCanvasCoords(e);
      const { x: currentX, y: currentY } = coords;

      if (isResizing && isDraggingResizeBox && resizeBox) {
        const newX = currentX - dragOffset.x;
        const newY = currentY - dragOffset.y;
        const deltaX = newX - resizeBox.x;
        const deltaY = newY - resizeBox.y;
        const movedStrokes = resizeBox.strokes.map((stroke: DrawingStroke) => ({
          ...stroke,
          points: stroke.points.map((p) => ({
            x: p.x + deltaX,
            y: p.y + deltaY,
          })),
        }));
        setResizeBox({ ...resizeBox, x: newX, y: newY, strokes: movedStrokes });
        if (selectedLayerId) {
          setLayerStrokes((prev) => {
            const other =
              prev[selectedLayerId]?.filter(
                (s) => !movedStrokes.some((ms: DrawingStroke) => ms.id === s.id)
              ) || [];
            return { ...prev, [selectedLayerId]: [...other, ...movedStrokes] };
          });
        }
        drawFrame();
        return;
      }

      if (isResizing && activeHandle && resizeBox) {
        const {
          initialX,
          initialY,
          initialWidth,
          initialHeight,
          originalStrokes,
        } = resizeBox;
        let newWidth = initialWidth,
          newHeight = initialHeight,
          newX = initialX,
          newY = initialY;
        switch (activeHandle) {
          case "topLeft":
            newWidth = initialX + initialWidth - currentX;
            newHeight = initialY + initialHeight - currentY;
            newX = currentX;
            newY = currentY;
            break;
          case "topRight":
            newWidth = currentX - initialX;
            newHeight = initialY + initialHeight - currentY;
            newY = currentY;
            break;
          case "bottomLeft":
            newWidth = initialX + initialWidth - currentX;
            newHeight = currentY - initialY;
            newX = currentX;
            break;
          case "bottomRight":
            newWidth = currentX - initialX;
            newHeight = currentY - initialY;
            break;
        }
        if (newWidth < 10) {
          newWidth = 10;
          if (activeHandle.includes("Left"))
            newX = initialX + initialWidth - 10;
        }
        if (newHeight < 10) {
          newHeight = 10;
          if (activeHandle.includes("top"))
            newY = initialY + initialHeight - 10;
        }
        const scaleX = initialWidth === 0 ? 1 : newWidth / initialWidth;
        const scaleY = initialHeight === 0 ? 1 : newHeight / initialHeight;
        const transformedStrokes = (originalStrokes as DrawingStroke[]).map(
          (stroke) => {
            const newPoints = stroke.points.map((p) => {
              const rx = p.x - initialX;
              const ry = p.y - initialY;
              return { x: newX + rx * scaleX, y: newY + ry * scaleY };
            });
            return { ...stroke, points: newPoints };
          }
        );
        setResizeBox({
          ...resizeBox,
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
          strokes: transformedStrokes,
        });
        if (selectedLayerId) {
          setLayerStrokes((prev) => {
            const other =
              prev[selectedLayerId]?.filter(
                (s) => !transformedStrokes.some((ts) => ts.id === s.id)
              ) || [];
            return {
              ...prev,
              [selectedLayerId]: [...other, ...transformedStrokes],
            };
          });
        }
        drawFrame();
        return;
      }

      if (lassoSelection && currentTool === "move") {
        // move/extend selection drawing
      }

      // Eraser continuous
      if (currentTool === "eraser" && selectedLayerId) {
        const lastPoint = lastErasePointRef.current;
        let pointsToErase: Point[] = [coords];
        if (lastPoint) {
          const dist = Math.hypot(
            currentX - lastPoint.x,
            currentY - lastPoint.y
          );
          const step = 2;
          const numSteps = Math.ceil(dist / step);
          for (let i = 1; i < numSteps; i++) {
            const t = i / numSteps;
            pointsToErase.push({
              x: lastPoint.x * (1 - t) + currentX * t,
              y: lastPoint.y * (1 - t) + currentY * t,
            });
          }
        }
        let layer = layerStrokes[selectedLayerId] || [];
        let changed = false;
        pointsToErase.forEach((pt) => {
          if (eraserStyle === "stroke") {
            const before = layer.length;
            layer = layer.filter(
              (s) =>
                !s.points.some(
                  (p) => Math.hypot(p.x - pt.x, p.y - pt.y) <= eraserSize
                )
            );
            if (layer.length < before) changed = true;
          } else {
            const next: DrawingStroke[] = [];
            for (const s of layer) {
              const kept = s.points.filter(
                (p) => Math.hypot(p.x - pt.x, p.y - pt.y) > eraserSize
              );
              if (kept.length !== s.points.length) changed = true;
              if (kept.length >= 2) next.push({ ...s, points: kept });
            }
            layer = next;
          }
        });
        if (changed) {
          setLayerStrokes((prev) => ({ ...prev, [selectedLayerId]: layer }));
          drawFrame();
        }
        lastErasePointRef.current = coords;
      }
    },
    [
      getCanvasCoords,
      isResizing,
      isDraggingResizeBox,
      resizeBox,
      dragOffset,
      setResizeBox,
      selectedLayerId,
      setLayerStrokes,
      drawFrame,
      activeHandle,
      currentTool,
      lastErasePointRef,
      layerStrokes,
      eraserStyle,
      eraserSize,
    ]
  );

  const stopDrawing = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
  }, [isPanning, setIsPanning]);

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    if (isResizing) {
      if (activeHandle) {
        setActiveHandle(null);
        if (resizeBox) {
          setResizeBox((prev: any) =>
            prev
              ? {
                  ...prev,
                  originalStrokes: JSON.parse(JSON.stringify(prev.strokes)),
                }
              : null
          );
        }
        saveToUndoStack();
      }
      if (isDraggingResizeBox) {
        setIsDraggingResizeBox(false);
        if (resizeBox) {
          setResizeBox((prev: any) =>
            prev
              ? {
                  ...prev,
                  originalStrokes: JSON.parse(JSON.stringify(prev.strokes)),
                }
              : null
          );
        }
        saveToUndoStack();
      }
      return;
    }
  }, [
    isPanning,
    setIsPanning,
    isResizing,
    activeHandle,
    resizeBox,
    setResizeBox,
    saveToUndoStack,
    isDraggingResizeBox,
    setIsDraggingResizeBox,
    setActiveHandle,
  ]);

  return { startDrawing, draw, stopDrawing, handleMouseUp } as const;
}
