import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getOrCreateComposition } from "@/lib/sequences";
import { loadSceneDoc } from "@/lib/editor/persistence";

export default function useSceneLoader({
  mode,
  sceneSettings,
  compositionId,
  setCompositionId,
  setAppliedWidth,
  setAppliedHeight,
  setAppliedFps,
  setRows,
  setFrameCount,
  setDrawingFrames,
  setLayerOrder,
  setFolderLayers,
  setLayerStrokes,
  setCurrentFrame,
  setSelectedRow,
  setZoom,
  setOnionSkin,
  setShowGrid,
  setFolderNames,
  setFrameAssetKeys,
}: any) {
  useEffect(() => {
    const load = async () => {
      const isStoryboard = mode === "storyboard";
      if (
        mode === "composite" &&
        sceneSettings?.projectId &&
        sceneSettings?.chapterId &&
        !compositionId
      ) {
        try {
          const comp = await getOrCreateComposition({
            projectId: sceneSettings.projectId,
            chapterId: sceneSettings.chapterId,
            title: sceneSettings.sceneName,
          });
          if (comp) setCompositionId(comp.id);
        } catch {}
      }
      const isCompositeLoad = mode === "composite";
      const targetId = isStoryboard
        ? sceneSettings?.storyboardId
        : isCompositeLoad
        ? compositionId
        : sceneSettings?.shotId;
      if (!targetId) return;
      const { data, doc } = await loadSceneDoc({ mode, targetId });
      if (!data || !doc) return;
      if (typeof data.width === "number") setAppliedWidth(data.width);
      if (typeof data.height === "number") setAppliedHeight(data.height);
      if (typeof data.fps === "number") setAppliedFps(data.fps);
      try {
        if (Array.isArray(doc.rows)) setRows(doc.rows);
        if (typeof doc.frameCount === "number") setFrameCount(doc.frameCount);
        if (doc.timeline?.drawingFrames)
          setDrawingFrames(doc.timeline.drawingFrames);
        if (doc.timeline?.layerOrder) setLayerOrder(doc.timeline.layerOrder);
        if (doc.layers?.folderLayers) setFolderLayers(doc.layers.folderLayers);
        if (doc.layers?.layerStrokes) setLayerStrokes(doc.layers.layerStrokes);
        if (doc.uiState?.currentFrame)
          setCurrentFrame(doc.uiState.currentFrame);
        if (doc.uiState?.selectedRow) setSelectedRow(doc.uiState.selectedRow);
        if (typeof doc.uiState?.zoom === "number") setZoom(doc.uiState.zoom);
        if (typeof doc.uiState?.onionSkin === "boolean")
          setOnionSkin(doc.uiState.onionSkin);
        if (typeof doc.uiState?.showGrid === "boolean")
          setShowGrid(doc.uiState.showGrid);
        if (doc.folderNames && typeof doc.folderNames === "object")
          setFolderNames(doc.folderNames);
        if (doc.frameAssetKeys && typeof doc.frameAssetKeys === "object") {
          setFrameAssetKeys(doc.frameAssetKeys);
          // Re-sign stored frame asset keys and hydrate drawingFrames imageUrl
          const enableStorage =
            process.env.NEXT_PUBLIC_ENABLE_SCENE_STORAGE === "true";
          if (enableStorage) {
            const bucket =
              process.env.NEXT_PUBLIC_SCENE_BUCKET || "animation-assets";
            const entries: Array<[string, string]> = Object.entries(
              doc.frameAssetKeys
            );
            if (entries.length > 0) {
              try {
                const urlMap: Record<string, string> = {};
                for (const [cell, key] of entries) {
                  const { data: signed } = await supabase.storage
                    .from(bucket)
                    .createSignedUrl(key, 60 * 60 * 24);
                  if (signed?.signedUrl) urlMap[cell] = signed.signedUrl;
                }
                setDrawingFrames((prev: any[]) =>
                  prev.map((df: any) => {
                    const cellKey = `${df.rowId}|${df.frameIndex}`;
                    return urlMap[cellKey]
                      ? { ...df, imageUrl: urlMap[cellKey] }
                      : df;
                  })
                );
              } catch (e) {
                // If re-sign fails, leave frames as-is; inline data may still render
              }
            }
          }
        }
      } catch {}
    };
    load();
  }, [mode, sceneSettings?.shotId, sceneSettings?.storyboardId]);
}
