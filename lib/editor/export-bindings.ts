import { renderFrameToContextImpl } from "@/lib/editor/canvas-render";

export function makeRenderFrameToContext({
  drawingFrames,
  layerOrder,
  layerVisibility,
  layerOpacities,
  layerStrokes,
}: any) {
  return async (
    frameIndex: number,
    targetCtx: CanvasRenderingContext2D,
    includeGrid: boolean
  ) => {
    await renderFrameToContextImpl(
      frameIndex,
      targetCtx,
      includeGrid,
      drawingFrames,
      layerOrder,
      layerVisibility,
      layerOpacities,
      layerStrokes
    );
  };
}

export function exportAnimation(canvas: HTMLCanvasElement | null) {
  if (!canvas || typeof window === "undefined") return;
  const link = document.createElement("a");
  link.download = "animation.png";
  link.href = canvas.toDataURL();
  link.click();
}
