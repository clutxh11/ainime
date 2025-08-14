import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { slugifyName } from "@/lib/editor/paths";

export default function useAssetDrop({
  sceneSettings,
  setFrameAssetKeys,
  setDrawingFrames,
  setSelectedLayerId,
  setSelectedFrameNumber,
  saveToUndoStack,
}: any) {
  const handleDrop = useCallback(
    (rowId: string, frameIndex: number, e: React.DragEvent) => {
      e.preventDefault();
      console.log("[Drop.hook] onDrop", {
        rowId,
        frameIndex,
        filesLen: e.dataTransfer?.files?.length,
        types: e.dataTransfer?.types,
      });
      const file = (e.dataTransfer && e.dataTransfer.files[0]) as
        | File
        | undefined;
      if (!file || !file.type.startsWith("image/")) {
        console.log("[Drop.hook] Abort: not an image file", file?.type);
        return;
      }
      const enableStorage =
        process.env.NEXT_PUBLIC_ENABLE_SCENE_STORAGE === "true";
      console.log("[Drop.hook] enableStorage", enableStorage);
      const doUpload = async () => {
        let imageUrl = "";
        let key: string | undefined = undefined;
        if (
          enableStorage &&
          sceneSettings?.projectId &&
          sceneSettings?.chapterId &&
          sceneSettings?.sequenceId &&
          sceneSettings?.shotId
        ) {
          try {
            const bucket =
              process.env.NEXT_PUBLIC_SCENE_BUCKET || "animation-assets";
            const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
            const ts = new Date().toISOString().replace(/[:.]/g, "-");
            const projectPart = `${slugifyName(sceneSettings.projectTitle)}-${
              sceneSettings.projectId
            }`;
            const chapterPart = `${slugifyName(sceneSettings.chapterTitle)}-${
              sceneSettings.chapterId
            }`;
            const sequencePart = `${slugifyName(sceneSettings.sequenceCode)}-${
              sceneSettings.sequenceId
            }`;
            const shotPart = `shot-${slugifyName(sceneSettings.shotCode)}-${
              sceneSettings.shotId
            }`;
            key = `${projectPart}/${chapterPart}/${sequencePart}/${shotPart}/assets/frames/${rowId}/${frameIndex}/${ts}-${safeName}`;
            console.log("[Drop.hook] Uploading to storage", { bucket, key });
            const { error: upErr } = await supabase.storage
              .from(bucket)
              .upload(key, file, { upsert: true, contentType: file.type });
            if (upErr) {
              imageUrl = URL.createObjectURL(file);
              console.log("[Drop.hook] Upload error, using blob URL", upErr);
            } else {
              const { data: signed } = await supabase.storage
                .from(bucket)
                .createSignedUrl(key, 60 * 60 * 24);
              imageUrl = signed?.signedUrl || URL.createObjectURL(file);
              console.log("[Drop.hook] Signed URL created", {
                key,
                imageUrl,
              });
            }
          } catch (err) {
            imageUrl = URL.createObjectURL(file);
            console.log(
              "[Drop.hook] Exception during upload, using blob URL",
              err
            );
          }
        } else {
          imageUrl = URL.createObjectURL(file);
          console.log("[Drop.hook] Storage disabled, using blob URL");
        }
        if (key) {
          setFrameAssetKeys((prev: any) => ({
            ...prev,
            [`${rowId}|${frameIndex}`]: key!,
          }));
          console.log("[Drop.hook] Saved frameAssetKey", {
            cell: `${rowId}|${frameIndex}`,
            key,
          });
        }
        const url = imageUrl;
        setDrawingFrames((prev: any[]) => {
          console.log("[Drop.hook] setDrawingFrames start", {
            prevLen: prev.length,
          });
          const existing = prev.find(
            (df) => df.rowId === rowId && df.frameIndex === frameIndex
          );
          if (existing) {
            const next = prev.map((df) =>
              df.rowId === rowId && df.frameIndex === frameIndex
                ? { ...df, imageUrl: url, fileName: file.name }
                : df
            );
            console.log("[Drop.hook] Updated existing frame with imageUrl", {
              rowId,
              frameIndex,
              url,
            });
            return next;
          }
          const next = [
            ...prev,
            {
              rowId,
              frameIndex,
              length: 1,
              imageUrl: url,
              fileName: file.name,
            },
          ];
          console.log("[Drop.hook] Added new frame with imageUrl", {
            rowId,
            frameIndex,
            url,
          });
          return next;
        });
        setSelectedLayerId(`${rowId}-${frameIndex}-main`);
        setSelectedFrameNumber(frameIndex + 1);
        console.log("[Drop.hook] Selected layer & frame", {
          layerId: `${rowId}-${frameIndex}-main`,
          frameNumber: frameIndex + 1,
        });
        setTimeout(() => saveToUndoStack(), 0);
        console.log("[Drop.hook] Done");
      };
      void doUpload();
    },
    [
      sceneSettings,
      setFrameAssetKeys,
      setDrawingFrames,
      setSelectedLayerId,
      setSelectedFrameNumber,
      saveToUndoStack,
    ]
  );
  return { handleDrop } as const;
}
