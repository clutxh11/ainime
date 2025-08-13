import { MutableRefObject, useCallback } from "react";

export interface Point {
  x: number;
  y: number;
}
export interface DrawingStroke {
  id: string;
  points: Point[];
}

interface UseResizeHandlersArgs {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  setContextMenu: (v: { visible: boolean; x: number; y: number }) => void;
  lassoSelection: {
    points: Point[];
    selectedStrokeIds: string[];
    isActive: boolean;
  } | null;
  selectedLayerId: string | null;
  layerStrokes: Record<string, DrawingStroke[]>;
  setLayerStrokes: React.Dispatch<
    React.SetStateAction<Record<string, DrawingStroke[]>>
  >;
  setLassoSelection: (v: any) => void;
  handleCloseContextMenu: () => void;
  setIsResizing: (v: boolean) => void;
  setResizeBox: (v: any) => void;
  saveToUndoStack: () => void;
  setActiveHandle: (v: string | null) => void;
  setIsDraggingResizeBox: (v: boolean) => void;
}

export default function useResizeHandlers(args: UseResizeHandlersArgs) {
  const {
    canvasRef,
    setContextMenu,
    lassoSelection,
    selectedLayerId,
    layerStrokes,
    setLayerStrokes,
    setLassoSelection,
    handleCloseContextMenu,
    setIsResizing,
    setResizeBox,
    saveToUndoStack,
    setActiveHandle,
    setIsDraggingResizeBox,
  } = args;

  const showContextMenuForSelection = useCallback(
    (selection: { points: Point[] }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const { minX, maxX, minY, maxY } = getLassoBoundingBox(selection.points);
      const scaleX = rect.width / canvas.width;
      const scaleY = rect.height / canvas.height;
      const menuX = rect.left + ((minX + maxX) / 2) * scaleX;
      const menuY = rect.top + maxY * scaleY + 15;
      setContextMenu({ visible: true, x: menuX, y: menuY });
    },
    [canvasRef, setContextMenu]
  );

  const getLassoBoundingBox = (points: Point[]) => {
    if (points.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    points.forEach((p) => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });
    return { minX, maxX, minY, maxY };
  };

  const handleResizeClick = useCallback(() => {
    if (!lassoSelection || !selectedLayerId) return;
    const selectedStrokes = (layerStrokes[selectedLayerId] || []).filter((s) =>
      lassoSelection.selectedStrokeIds.includes(s.id)
    );
    if (selectedStrokes.length === 0) return;
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    selectedStrokes.forEach((stroke) => {
      stroke.points.forEach((point) => {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      });
    });
    const padding = 10;
    const boxX = minX - padding;
    const boxY = minY - padding;
    const boxWidth = maxX - minX + padding * 2;
    const boxHeight = maxY - minY + padding * 2;
    setResizeBox({
      x: boxX,
      y: boxY,
      width: boxWidth,
      height: boxHeight,
      strokes: selectedStrokes,
      originalStrokes: JSON.parse(JSON.stringify(selectedStrokes)),
      initialX: boxX,
      initialY: boxY,
      initialWidth: boxWidth,
      initialHeight: boxHeight,
    });
    setIsResizing(true);
    setLassoSelection(null as any);
    handleCloseContextMenu();
  }, [
    lassoSelection,
    selectedLayerId,
    layerStrokes,
    setResizeBox,
    setIsResizing,
    setLassoSelection,
    handleCloseContextMenu,
  ]);

  const handleConfirmResize = useCallback(() => {
    setIsResizing(false);
    setResizeBox(null);
    setActiveHandle(null);
    setIsDraggingResizeBox(false);
    saveToUndoStack();
  }, [
    setIsResizing,
    setResizeBox,
    setActiveHandle,
    setIsDraggingResizeBox,
    saveToUndoStack,
  ]);

  return {
    handleResizeClick,
    handleConfirmResize,
    showContextMenuForSelection,
  } as const;
}
