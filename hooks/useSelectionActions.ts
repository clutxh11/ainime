import { useCallback } from "react";

export default function useSelectionActions({
  lassoSelection,
  selectedLayerId,
  layerStrokes,
  setLayerStrokes,
  setLassoSelection,
  setClipboard,
  setPastePreview,
  handleCloseContextMenu,
  saveToUndoStack,
}: any) {
  const handleDeleteSelectedStrokes = useCallback(() => {
    if (!lassoSelection || !selectedLayerId) return;
    setLayerStrokes((prev: any) => ({
      ...prev,
      [selectedLayerId]: (prev[selectedLayerId] || []).filter(
        (stroke: any) => !lassoSelection.selectedStrokeIds.includes(stroke.id)
      ),
    }));
    setLassoSelection(null);
    handleCloseContextMenu();
    saveToUndoStack();
  }, [
    lassoSelection,
    selectedLayerId,
    setLayerStrokes,
    setLassoSelection,
    handleCloseContextMenu,
    saveToUndoStack,
  ]);

  const handleDuplicateSelectedStrokes = useCallback(() => {
    if (!lassoSelection || !selectedLayerId) return;
    const strokesToDuplicate = (layerStrokes[selectedLayerId] || []).filter(
      (s: any) => lassoSelection.selectedStrokeIds.includes(s.id)
    );
    const newStrokes = strokesToDuplicate.map((s: any) => ({
      ...JSON.parse(JSON.stringify(s)),
      id: `${s.id}-copy-${Date.now()}`,
      points: s.points.map((p: any) => ({ x: p.x + 10, y: p.y + 10 })),
    }));
    setLayerStrokes((prev: any) => ({
      ...prev,
      [selectedLayerId]: [...(prev[selectedLayerId] || []), ...newStrokes],
    }));
    const newSelectionPoints = lassoSelection.points.map((p: any) => ({
      x: p.x + 10,
      y: p.y + 10,
    }));
    setLassoSelection({
      points: newSelectionPoints,
      isActive: true,
      selectedStrokeIds: newStrokes.map((s: any) => s.id),
    });
    handleCloseContextMenu();
    saveToUndoStack();
  }, [
    lassoSelection,
    selectedLayerId,
    layerStrokes,
    setLayerStrokes,
    setLassoSelection,
    handleCloseContextMenu,
    saveToUndoStack,
  ]);

  const handleCopySelectedStrokes = useCallback(() => {
    if (!lassoSelection || !selectedLayerId) return;
    const strokesToCopy = (layerStrokes[selectedLayerId] || [])
      .filter((stroke: any) =>
        lassoSelection.selectedStrokeIds.includes(stroke.id)
      )
      .map((s: any) => JSON.parse(JSON.stringify(s)));
    setClipboard(strokesToCopy);
    handleCloseContextMenu();
  }, [
    lassoSelection,
    selectedLayerId,
    layerStrokes,
    setClipboard,
    handleCloseContextMenu,
  ]);

  const handleCutSelectedStrokes = useCallback(() => {
    handleCopySelectedStrokes();
    handleDeleteSelectedStrokes();
    handleCloseContextMenu();
  }, [
    handleCopySelectedStrokes,
    handleDeleteSelectedStrokes,
    handleCloseContextMenu,
  ]);

  const pasteFromClipboard = useCallback(() => {
    if (selectedLayerId) {
      setPastePreview((prev: any) => prev); // trigger paste preview UI; actual commit handled elsewhere
      setLassoSelection(null);
      handleCloseContextMenu();
    }
  }, [
    selectedLayerId,
    setPastePreview,
    setLassoSelection,
    handleCloseContextMenu,
  ]);

  return {
    handleDeleteSelectedStrokes,
    handleDuplicateSelectedStrokes,
    handleCopySelectedStrokes,
    handleCutSelectedStrokes,
    pasteFromClipboard,
  } as const;
}
