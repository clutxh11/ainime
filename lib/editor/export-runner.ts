import {
  exportCanvasDataURL,
  saveDataUrlToHandle,
  downloadDataUrl,
  ExportFormat,
} from "./export";

interface RunExportArgs {
  width: number;
  height: number;
  renderFrameToContext: (
    frameIndex: number,
    ctx: CanvasRenderingContext2D,
    includeGrid: boolean
  ) => Promise<void>;
  exportFormat: ExportFormat;
  exportDirHandle: any | null;
  exportFolderName: string;
  exportRowAllFrames: boolean;
  selectedRow: string | null;
  selectedFrameNumber: number | null;
  drawingFrames: Array<{ rowId: string; frameIndex: number }>;
}

export async function runExport(args: RunExportArgs) {
  const {
    width,
    height,
    renderFrameToContext,
    exportFormat,
    exportDirHandle,
    exportFolderName,
    exportRowAllFrames,
    selectedRow,
    selectedFrameNumber,
    drawingFrames,
  } = args;

  const exportCell = async (rowId: string, frameIndex: number) => {
    const off = document.createElement("canvas");
    off.width = width;
    off.height = height;
    const offCtx = off.getContext("2d");
    if (!offCtx) return;
    await renderFrameToContext(frameIndex, offCtx, false);
    const dataUrl = await exportCanvasDataURL(off, exportFormat);
    const fileBase = `R${rowId.split("-")[1]}F${frameIndex + 1}`;
    const fileName = `${
      exportFolderName || "Export"
    }_${fileBase}.${exportFormat}`;
    if (exportDirHandle?.getFileHandle) {
      await saveDataUrlToHandle(
        dataUrl,
        `${fileBase}.${exportFormat}`,
        exportDirHandle
      );
    } else {
      downloadDataUrl(dataUrl, fileName);
    }
  };

  const exportAt = async (_rowId: string, frameIndex: number) => {
    await exportCell(_rowId, frameIndex);
  };

  if (exportRowAllFrames && selectedRow) {
    const frames = drawingFrames
      .filter((df) => df.rowId === selectedRow)
      .map((df) => df.frameIndex)
      .sort((a, b) => a - b);
    for (const fi of frames) {
      await exportAt(selectedRow, fi);
    }
  } else {
    const rowId = selectedRow || "row-1";
    const frameIndex = selectedFrameNumber ? selectedFrameNumber - 1 : 0;
    await exportAt(rowId, frameIndex);
  }
}
