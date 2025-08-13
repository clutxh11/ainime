export type ExportFormat = "png" | "jpg" | "webp";

export async function exportCanvasDataURL(
  canvas: HTMLCanvasElement,
  format: ExportFormat
): Promise<string> {
  const mime = format === "jpg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
  return canvas.toDataURL(mime, 0.92);
}

export async function saveDataUrlToHandle(
  dataUrl: string,
  name: string,
  handle: any
): Promise<void> {
  const fileHandle = await handle.getFileHandle(name, { create: true });
  const writable = await fileHandle.createWritable();
  const res = await fetch(dataUrl);
  await writable.write(await res.arrayBuffer());
  await writable.close();
}

export function downloadDataUrl(dataUrl: string, name: string) {
  const link = document.createElement("a");
  link.download = name;
  link.href = dataUrl;
  link.click();
}


