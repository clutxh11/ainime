import { supabase } from "@/lib/supabase";
import { slugifyName } from "@/lib/editor/paths";

export interface SerializeDocArgs {
  sceneName: string;
  width: number;
  height: number;
  fps: number;
  rows: any[];
  frameCount: number;
  drawingFrames: any[];
  layerOrder: Record<string, string[]>;
  folderLayers: Record<string, string[]>;
  layerStrokes: Record<string, any[]>;
  currentFrame: number;
  selectedRow: string;
  zoom: number;
  onionSkin: boolean;
  showGrid: boolean;
  frameAssetKeys: Record<string, string>;
  folderNames: Record<string, string>;
}

export function serializeDocument(args: SerializeDocArgs) {
  const {
    sceneName,
    width,
    height,
    fps,
    rows,
    frameCount,
    drawingFrames,
    layerOrder,
    folderLayers,
    layerStrokes,
    currentFrame,
    selectedRow,
    zoom,
    onionSkin,
    showGrid,
    frameAssetKeys,
    folderNames,
  } = args;
  return {
    version: 1,
    sceneSettings: { sceneName, width, height, fps, units: "px" },
    rows,
    frameCount,
    timeline: { drawingFrames, layerOrder },
    layers: { folderLayers, layerStrokes },
    uiState: { currentFrame, selectedRow, zoom, onionSkin, showGrid },
    frameAssetKeys,
    folderNames,
  } as const;
}

export interface SaveArgs {
  mode: "animate" | "storyboard" | "composite";
  targetId?: string | null;
  scene: SerializeDocArgs & {
    projectTitle?: string;
    projectId?: string;
    chapterTitle?: string;
    chapterId?: string;
    sequenceCode?: string;
    sequenceId?: string;
    shotCode?: string;
    shotId?: string;
  };
}

export async function saveSceneDoc({ mode, targetId, scene }: SaveArgs) {
  if (!targetId) return;
  const isStoryboard = mode === "storyboard";
  const isComposite = mode === "composite";
  const { data: row, error: readErr } = await supabase
    .from(isStoryboard ? "storyboards" : isComposite ? "compositions" : "shots")
    .select("data")
    .eq("id", targetId)
    .maybeSingle();
  if (readErr) console.warn("Failed to read row:", readErr);
  const baseData = (row?.data as any) || {};

  const doc = serializeDocument(scene);
  const enableStorage = process.env.NEXT_PUBLIC_ENABLE_SCENE_STORAGE === "true";
  const bucket = process.env.NEXT_PUBLIC_SCENE_BUCKET || "animation-assets";
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const projectPart = `${slugifyName(scene.projectTitle)}-${
    scene.projectId || "unknown-project"
  }`;
  const chapterPart = `${slugifyName(scene.chapterTitle)}-${
    scene.chapterId || "unknown-chapter"
  }`;
  let key = "";
  if (isStoryboard) {
    key = `${projectPart}/${chapterPart}/storyboard-${
      scene.shotId || targetId
    }/storyboard/storyboard-${ts}.json`;
  } else if (isComposite) {
    key = `${projectPart}/${chapterPart}/composition-${targetId}/composition/scene-${ts}.json`;
  } else {
    const sequencePart = `${slugifyName(scene.sequenceCode)}-${
      scene.sequenceId || "unknown-seq"
    }`;
    key = `${projectPart}/${chapterPart}/${sequencePart}/shot-${slugifyName(
      scene.shotCode
    )}-${scene.shotId || targetId}/shot/scene-${ts}.json`;
  }

  let uploadOk = false;
  if (enableStorage) {
    try {
      const blob = new Blob([JSON.stringify(doc)], {
        type: "application/json",
      });
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(key, blob, { upsert: true });
      if (!upErr) uploadOk = true;
    } catch (e) {
      console.warn("Storage upload error", e);
    }
  }

  const prevManifest: any[] = Array.isArray(baseData?.manifest)
    ? baseData.manifest
    : [];
  const merged = {
    ...baseData,
    initialized: true,
    width: scene.width,
    height: scene.height,
    units: "px",
    fps: scene.fps,
    document: doc,
    latest_key: uploadOk ? key : baseData?.latest_key,
    manifest: uploadOk
      ? [
          ...prevManifest,
          {
            key,
            saved_at: new Date().toISOString(),
            width: scene.width,
            height: scene.height,
            fps: scene.fps,
            version: 1,
          },
        ]
      : prevManifest,
  } as any;

  const { error } = await supabase
    .from(isStoryboard ? "storyboards" : isComposite ? "compositions" : "shots")
    .update({ data: merged })
    .eq("id", targetId);
  if (error) console.warn("Failed to save scene:", error);
}

export interface LoadArgs {
  mode: "animate" | "storyboard" | "composite";
  targetId?: string | null;
}

export async function loadSceneDoc({ mode, targetId }: LoadArgs): Promise<{
  data: any;
  doc: any | null;
}> {
  if (!targetId) return { data: null, doc: null };
  const isStoryboard = mode === "storyboard";
  const isComposite = mode === "composite";
  const { data: row, error } = await supabase
    .from(isStoryboard ? "storyboards" : isComposite ? "compositions" : "shots")
    .select("data")
    .eq("id", targetId)
    .maybeSingle();
  if (error) return { data: null, doc: null };
  const data: any = row?.data || {};

  // Prefer storage-saved latest version; fallback to inline document
  let doc: any = null;
  const latestKey: string | undefined = data?.latest_key;
  const enableStorage = process.env.NEXT_PUBLIC_ENABLE_SCENE_STORAGE === "true";
  if (enableStorage && latestKey) {
    // Only attempt download if the key looks like the new slugified path (avoids 400s for old UUID-only keys)
    const firstSeg = String(latestKey).split("/")[0] || "";
    const looksNew = /[a-zA-Z]/.test(firstSeg);
    if (looksNew) {
      try {
        const { data: file, error: dlErr } = await supabase.storage
          .from(process.env.NEXT_PUBLIC_SCENE_BUCKET || "animation-assets")
          .download(latestKey);
        if (!dlErr && file) {
          const text = await file.text();
          doc = JSON.parse(text);
        }
      } catch {
        // Fall through to inline doc
      }
    }
  }
  if (!doc) doc = data.document || null;
  return { data, doc };
}
