import { useCallback } from "react";

export function getActiveFrameFolderId(selectedLayerId: string | null) {
  if (!selectedLayerId) return null;
  const parts = selectedLayerId.split("-");
  if (parts.length < 3) return null;
  // For timeline cell IDs like "row-1-0", "row-1-1", etc., map them to the composition folder
  // which is always at frame 0 (row-1-0)
  return `${parts[0]}-${parts[1]}-0`;
}

export default function useFolders({
  drawingFrames,
  setDrawingFrames,
  setLayerStrokes,
  setFolderLayers,
  setLayerOrder,
  setOpenFolders,
  setSelectedLayerId,
  setSelectedFrameNumber,
  setRows,
  setSelectedRow,
  saveToUndoStack,
  selectedRow,
  selectedLayerId,
  mode,
  // optional compositing-only placeholder control
  compositeFolderIds,
  setCompositeFolderIds,
}: any) {
  const addFolder = useCallback(() => {
    // In compositing mode, we treat assets as folders under a single virtual row
    const targetRowId = "row-1";
    const rowFrames = drawingFrames.filter(
      (df: any) => df.rowId === targetRowId
    );
    const realizedMax =
      rowFrames.length > 0
        ? Math.max(...rowFrames.map((f: any) => f.frameIndex))
        : -1;
    const placeholderMax = (compositeFolderIds || []).reduce(
      (acc: number, id: string) => {
        const parts = id.split("-");
        const idx = parseInt(parts[2] || "0", 10);
        return Number.isFinite(idx) ? Math.max(acc, idx) : acc;
      },
      -1
    );
    const nextIndex = Math.max(realizedMax, placeholderMax) + 1;
    const folderId = `${targetRowId}-${nextIndex}`;

    if (mode === "composite") {
      // Do NOT create a timeline cell yet; just register a placeholder folder id
      setCompositeFolderIds?.((prev: string[]) =>
        prev.includes(folderId) ? prev : [...prev, folderId]
      );
    } else {
      setDrawingFrames((prev: any[]) => [
        ...prev,
        {
          rowId: targetRowId,
          frameIndex: nextIndex,
          length: 1,
          imageUrl: "",
          fileName: "",
        },
      ]);
    }
    setLayerOrder((prev: any) => ({
      ...prev,
      [folderId]: mode === "composite" ? [] : [`${folderId}-main`],
    }));
    setFolderLayers((prev: any) => ({ ...prev, [folderId]: [] }));
    setOpenFolders((prev: any) => ({ ...prev, [folderId]: true }));
    // Do not select timeline frame; this is assets-only creation for compositing
    setSelectedLayerId(null);
    setSelectedFrameNumber(null);
    saveToUndoStack();
  }, [
    drawingFrames,
    setDrawingFrames,
    setLayerOrder,
    setFolderLayers,
    setOpenFolders,
    setSelectedLayerId,
    setSelectedFrameNumber,
    saveToUndoStack,
  ]);

  const deleteSelectedFolder = useCallback(() => {
    const folderId = getActiveFrameFolderId(selectedLayerId || "");
    if (!folderId) return;
    setDrawingFrames((prev: any[]) =>
      prev.filter((df: any) => `${df.rowId}-${df.frameIndex}` !== folderId)
    );
    setLayerStrokes((prev: any) => {
      const next: Record<string, any[]> = {};
      for (const [key, value] of Object.entries(prev)) {
        if (!key.startsWith(folderId)) next[key] = value as any[];
      }
      return next;
    });
    setFolderLayers((prev: any) => {
      const copy = { ...prev };
      delete (copy as any)[folderId];
      return copy;
    });
    setLayerOrder((prev: any) => {
      const copy = { ...prev };
      delete (copy as any)[folderId];
      return copy;
    });
    saveToUndoStack();
  }, [
    selectedLayerId,
    setDrawingFrames,
    setLayerStrokes,
    setFolderLayers,
    setLayerOrder,
    saveToUndoStack,
  ]);

  const reorderFrameFolder = useCallback(
    (folderId: string, direction: "up" | "down") => {
      setDrawingFrames((prev: any[]) => {
        if (!Array.isArray(prev) || prev.length === 0) return prev;
        const [row, idxStr] = folderId.split("-");
        const idx = parseInt(idxStr, 10);
        const rowFrames = prev.filter((df: any) => df.rowId === row);
        const target = rowFrames.find((f: any) => f.frameIndex === idx);
        if (!target) return prev;
        const neighborIndex = direction === "up" ? idx - 1 : idx + 1;
        const neighbor = rowFrames.find(
          (f: any) => f.frameIndex === neighborIndex
        );
        if (!neighbor) return prev;
        return prev.map((df: any) => {
          if (df.rowId !== row) return df;
          if (df.frameIndex === idx)
            return { ...df, frameIndex: neighborIndex };
          if (df.frameIndex === neighborIndex)
            return { ...df, frameIndex: idx };
          return df;
        });
      });
      setLayerOrder((prev: any) => prev);
      setFolderLayers((prev: any) => prev);
      saveToUndoStack();
    },
    [setDrawingFrames, setLayerOrder, setFolderLayers, saveToUndoStack]
  );

  const moveFrameFolderUp = useCallback(
    (folderId: string) => reorderFrameFolder(folderId, "up"),
    [reorderFrameFolder]
  );
  const moveFrameFolderDown = useCallback(
    (folderId: string) => reorderFrameFolder(folderId, "down"),
    [reorderFrameFolder]
  );

  const deleteFrameByFolderId = useCallback(
    (folderId: string) => {
      if (!folderId) return;
      const parts = folderId.split("-");
      const rowId = `${parts[0]}-${parts[1]}`;
      const frameIndex = parseInt(parts[2], 10);
      setDrawingFrames((prev: any[]) =>
        prev.filter(
          (df: any) => !(df.rowId === rowId && df.frameIndex === frameIndex)
        )
      );
      setLayerStrokes((prev: any) => {
        const next: Record<string, any[]> = { ...prev };
        Object.keys(next).forEach((k) => {
          if (k.startsWith(folderId)) delete (next as any)[k];
        });
        return next;
      });
      setFolderLayers((prev: any) => {
        const copy = { ...prev };
        delete (copy as any)[folderId];
        return copy;
      });
      setLayerOrder((prev: any) => {
        const copy = { ...prev };
        delete (copy as any)[folderId];
        return copy;
      });
      setSelectedLayerId(null);
      setSelectedFrameNumber(null);
      saveToUndoStack();
    },
    [
      setDrawingFrames,
      setLayerStrokes,
      setFolderLayers,
      setLayerOrder,
      setSelectedLayerId,
      setSelectedFrameNumber,
      saveToUndoStack,
    ]
  );

  const deleteRowById = useCallback(
    (rowId: string) => {
      if (!rowId) return;
      setDrawingFrames((prev: any[]) =>
        prev.filter((df: any) => df.rowId !== rowId)
      );
      setRows((prev: any[]) => prev.filter((r: any) => r.id !== rowId));
      setLayerStrokes((prev: any) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          if (k.startsWith(rowId)) delete (next as any)[k];
        });
        return next;
      });
      setFolderLayers((prev: any) => {
        const copy = { ...prev };
        Object.keys(copy).forEach((k) => {
          if (k.startsWith(rowId)) delete (copy as any)[k];
        });
        return copy;
      });
      setSelectedRow("");
      setSelectedLayerId(null);
      setSelectedFrameNumber(null);
      saveToUndoStack();
    },
    [
      setDrawingFrames,
      setRows,
      setLayerStrokes,
      setFolderLayers,
      setSelectedRow,
      setSelectedLayerId,
      setSelectedFrameNumber,
      saveToUndoStack,
    ]
  );

  return {
    addFolder,
    deleteSelectedFolder,
    moveFrameFolderUp,
    moveFrameFolderDown,
    getActiveFrameFolderId,
    deleteFrameByFolderId,
    deleteRowById,
  } as const;
}
