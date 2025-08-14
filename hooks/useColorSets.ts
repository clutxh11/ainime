export default function useColorSets({
  customColorSets,
  setCustomColorSets,
  newSetName,
  setNewSetName,
}: any) {
  const createColorSet = () => {
    if (newSetName.trim()) {
      setCustomColorSets((prev: any) => ({
        ...prev,
        [newSetName.trim()]: [],
      }));
      setNewSetName("");
    }
  };
  const addColorToSet = (setName: string, color: string) => {
    setCustomColorSets((prev: any) => ({
      ...prev,
      [setName]: [...(prev[setName] || []), color],
    }));
  };
  const removeColorFromSet = (setName: string, colorIndex: number) => {
    setCustomColorSets((prev: any) => ({
      ...prev,
      [setName]: (prev[setName] || []).filter(
        (_: any, i: number) => i !== colorIndex
      ),
    }));
  };
  return { createColorSet, addColorToSet, removeColorFromSet } as const;
}
