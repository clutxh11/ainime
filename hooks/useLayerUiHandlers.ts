export default function useLayerUiHandlers({
  setSelectedLayerId,
  setSelectedFrameNumber,
  setLayerVisibility,
  mode,
}: {
  setSelectedLayerId: (id: string) => void;
  setSelectedFrameNumber: (n: number) => void;
  setLayerVisibility: (
    fn: (prev: Record<string, boolean>) => Record<string, boolean>
  ) => void;
  mode?: string;
}) {
  const handleSidebarSelection = (layerId: string) => {
    setSelectedLayerId(layerId);
    if (mode === "composite") {
      // In compositing, timeline selection is always F1 and is handled by the caller's setter.
      // Avoid overriding it here.
      console.log("[Composite] handleSidebarSelection -> defer frame to F1", {
        layerId,
      });
      return;
    }
    const parts = layerId.split("-");
    if (parts.length >= 3) {
      const frameIndex = parseInt(parts[2], 10);
      if (!isNaN(frameIndex)) {
        setSelectedFrameNumber(frameIndex + 1);
      }
    }
  };

  const handleToggleVisibility = (layerId: string) => {
    setLayerVisibility((prev) => ({
      ...prev,
      [layerId]: prev[layerId] === false ? true : false,
    }));
  };

  return { handleSidebarSelection, handleToggleVisibility } as const;
}
