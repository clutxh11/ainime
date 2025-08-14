import { useCallback } from "react";

export default function useUndoRedo({
  undoStack,
  setUndoStack,
  redoStack,
  setRedoStack,
  layerStrokes,
  setLayerStrokes,
  folderLayers,
  setFolderLayers,
  drawingFrames,
  setDrawingFrames,
  layerOrder,
  setLayerOrder,
}: any) {
  const saveToUndoStack = useCallback(() => {
    setUndoStack((prev: any[]) => {
      const currentState = {
        layerStrokes: JSON.parse(JSON.stringify(layerStrokes)),
        folderLayers: JSON.parse(JSON.stringify(folderLayers)),
        drawingFrames: JSON.parse(JSON.stringify(drawingFrames)),
        layerOrder: JSON.parse(JSON.stringify(layerOrder)),
      };
      return [...prev, currentState];
    });
    setRedoStack([]);
  }, [
    layerStrokes,
    folderLayers,
    drawingFrames,
    layerOrder,
    setUndoStack,
    setRedoStack,
  ]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previousState = undoStack[undoStack.length - 1];
    const currentState = {
      layerStrokes: JSON.parse(JSON.stringify(layerStrokes)),
      folderLayers: JSON.parse(JSON.stringify(folderLayers)),
      drawingFrames: JSON.parse(JSON.stringify(drawingFrames)),
      layerOrder: JSON.parse(JSON.stringify(layerOrder)),
    };
    setLayerStrokes(previousState.layerStrokes);
    setFolderLayers(previousState.folderLayers);
    setDrawingFrames(previousState.drawingFrames);
    setLayerOrder(previousState.layerOrder);
    setUndoStack((prev: any[]) => prev.slice(0, -1));
    setRedoStack((prev: any[]) => [...prev, currentState]);
  }, [
    undoStack,
    layerStrokes,
    folderLayers,
    drawingFrames,
    layerOrder,
    setLayerStrokes,
    setFolderLayers,
    setDrawingFrames,
    setLayerOrder,
    setUndoStack,
    setRedoStack,
  ]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];
    const currentState = {
      layerStrokes: JSON.parse(JSON.stringify(layerStrokes)),
      folderLayers: JSON.parse(JSON.stringify(folderLayers)),
      drawingFrames: JSON.parse(JSON.stringify(drawingFrames)),
      layerOrder: JSON.parse(JSON.stringify(layerOrder)),
    };
    setLayerStrokes(nextState.layerStrokes);
    setFolderLayers(nextState.folderLayers);
    setDrawingFrames(nextState.drawingFrames);
    setLayerOrder(nextState.layerOrder);
    setRedoStack((prev: any[]) => prev.slice(0, -1));
    setUndoStack((prev: any[]) => [...prev, currentState]);
  }, [
    redoStack,
    layerStrokes,
    folderLayers,
    drawingFrames,
    layerOrder,
    setLayerStrokes,
    setFolderLayers,
    setDrawingFrames,
    setLayerOrder,
    setRedoStack,
    setUndoStack,
  ]);

  return { saveToUndoStack, undo, redo } as const;
}
