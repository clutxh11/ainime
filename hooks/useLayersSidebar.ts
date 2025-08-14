export default function useLayersSidebar({
  setOpenFolders,
  setLayerOpacities,
  setEditingLayerName,
  setEditingLayerValue,
  setFolderLayers,
  setLayerOrder,
  folderLayers,
  saveToUndoStack,
}: any) {
  const toggleFolder = (id: string) => {
    setOpenFolders((prev: any) => ({ ...prev, [id]: !prev[id] }));
  };
  const handleOpacityChange = (id: string, value: number) => {
    setLayerOpacities((prev: any) => ({ ...prev, [id]: value }));
  };
  const handleStartRename = (layerId: string, currentName: string) => {
    setEditingLayerName(layerId);
    setEditingLayerValue(currentName);
  };
  const handleSaveRename = (layerId: string, editingLayerValue: string) => {
    if (layerId.includes("-extra-")) {
      const [folderId, extraPart] = layerId.split("-extra-");
      const extraIndex = parseInt(extraPart);
      setFolderLayers((prev: any) => {
        const layers = prev[folderId] || [];
        const newLayers = [...layers];
        newLayers[extraIndex] =
          editingLayerValue || `Untitled.${extraIndex + 2}`;
        return { ...prev, [folderId]: newLayers };
      });
    }
    setEditingLayerName(null);
    setEditingLayerValue("");
  };
  const handleCancelRename = () => {
    setEditingLayerName(null);
    setEditingLayerValue("");
  };
  const moveLayer = (
    folderId: string,
    layerId: string,
    direction: "up" | "down"
  ) => {
    setLayerOrder((prev: any) => {
      const order = prev[folderId];
      if (!order) return prev;
      const index = order.indexOf(layerId);
      if (index === -1) return prev;
      const newOrder = [...order];
      if (direction === "up" && index > 0) {
        [newOrder[index - 1], newOrder[index]] = [
          newOrder[index],
          newOrder[index - 1],
        ];
      } else if (direction === "down" && index < order.length - 1) {
        [newOrder[index + 1], newOrder[index]] = [
          newOrder[index],
          newOrder[index + 1],
        ];
      }
      return { ...prev, [folderId]: newOrder };
    });
  };
  return {
    toggleFolder,
    handleOpacityChange,
    handleStartRename,
    handleSaveRename,
    handleCancelRename,
    moveLayer,
  } as const;
}
