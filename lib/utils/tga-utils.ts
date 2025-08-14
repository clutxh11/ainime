import TGA from "tga-js";

export interface TGAImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface ImageSequence {
  baseName: string;
  extension: string;
  frames: File[];
  isSequence: boolean;
}

/**
 * Decode a TGA file to ImageData
 */
export async function decodeTGA(file: File): Promise<TGAImageData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (!e.target?.result) {
          reject(new Error("No file data read"));
          return;
        }

        const buffer = e.target.result as ArrayBuffer;
        if (buffer.byteLength < 18) {
          reject(new Error("File too small to be a valid TGA"));
          return;
        }

        const tga = new TGA(buffer);

        // Check if TGA object was properly initialized
        if (!tga || typeof tga.getImageData !== "function") {
          reject(new Error("Invalid TGA decoder instance"));
          return;
        }

        const imageData = tga.getImageData();

        if (
          !imageData ||
          !imageData.data ||
          imageData.width <= 0 ||
          imageData.height <= 0
        ) {
          reject(new Error("Invalid TGA data structure"));
          return;
        }

        resolve(imageData);
      } catch (error: any) {
        console.error("TGA decode error details:", error);
        reject(new Error(`Failed to decode TGA: ${error?.message || error}`));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read TGA file"));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Convert ImageData to a blob URL
 */
export async function imageDataToBlobURL(
  imageData: TGAImageData
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  const imgData = ctx.createImageData(imageData.width, imageData.height);
  imgData.data.set(imageData.data);
  ctx.putImageData(imgData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        resolve(url);
      } else {
        reject(new Error("Failed to create blob from canvas"));
      }
    }, "image/png");
  });
}

/**
 * Detect if files form a numbered sequence
 */
export function detectImageSequence(files: File[]): ImageSequence | null {
  if (files.length < 2) return null;

  // Filter for image files
  const imageFiles = files.filter(
    (file) =>
      file.type.startsWith("image/") || file.name.toLowerCase().endsWith(".tga")
  );

  if (imageFiles.length < 2) return null;

  console.log(
    "[TGA Utils] Checking for sequence in files:",
    imageFiles.map((f) => f.name)
  );

  // Try to find numbered patterns
  const patterns = [
    /^(.+?)(?:\.|_|-)(\d{3,4})\.(tga|png|jpg|jpeg)$/i, // name.0001.tga, name_0001.tga, name-0001.tga
    /^(.+?)(\d{3,4})\.(tga|png|jpg|jpeg)$/i, // name0001.tga
    /^(.+?)(\d{2,4})\.(tga|png|jpg|jpeg)$/i, // name01.tga, name001.tga
    /^(.+?)(?:\.|_|-)(\d{1,4})\.(tga|png|jpg|jpeg)$/i, // name.1.tga, name_1.tga, name-1.tga
    /^(.+?)(\d{1,4})\.(tga|png|jpg|jpeg)$/i, // name1.tga
  ];

  for (const pattern of patterns) {
    const matches = imageFiles
      .map((file) => {
        const match = file.name.match(pattern);
        if (match) {
          return {
            file,
            baseName: match[1],
            frameNumber: parseInt(match[2], 10),
            extension: match[3].toLowerCase(),
          };
        }
        return null;
      })
      .filter(Boolean);

    if (matches.length >= 2) {
      console.log(
        "[TGA Utils] Found pattern matches:",
        matches.map((m) => ({ name: m!.file.name, frame: m!.frameNumber }))
      );

      // Check if frame numbers are consecutive or have a pattern
      const frameNumbers = matches
        .map((m) => m!.frameNumber)
        .sort((a, b) => a - b);
      const isConsecutive = frameNumbers.every(
        (num, i) => i === 0 || num === frameNumbers[i - 1] + 1
      );

      if (isConsecutive) {
        console.log("[TGA Utils] Sequence detected:", {
          baseName: matches[0]!.baseName,
          frameCount: matches.length,
          frameRange: `${frameNumbers[0]}-${
            frameNumbers[frameNumbers.length - 1]
          }`,
        });

        // Sort files by frame number
        const sortedFiles = matches
          .sort((a, b) => a!.frameNumber - b!.frameNumber)
          .map((m) => m!.file);

        return {
          baseName: matches[0]!.baseName,
          extension: matches[0]!.extension,
          frames: sortedFiles,
          isSequence: true,
        };
      }
    }
  }

  console.log("[TGA Utils] No sequence detected");
  return null;
}

/**
 * Process TGA files and convert them to blob URLs
 */
export async function processTGAFiles(
  files: File[]
): Promise<{ file: File; blobUrl: string }[]> {
  const results: { file: File; blobUrl: string }[] = [];

  console.log(
    "[TGA Utils] Processing files:",
    files.map((f) => ({ name: f.name, type: f.type, size: f.size }))
  );

  for (const file of files) {
    if (file.name.toLowerCase().endsWith(".tga")) {
      console.log(`[TGA Utils] Processing TGA file: ${file.name}`);
      try {
        const imageData = await decodeTGA(file);
        console.log(
          `[TGA Utils] TGA decoded successfully: ${file.name} -> ${imageData.width}x${imageData.height}`
        );
        const blobUrl = await imageDataToBlobURL(imageData);
        console.log(`[TGA Utils] TGA converted to blob URL: ${file.name}`);
        results.push({ file, blobUrl });
      } catch (error) {
        console.error(`Failed to process TGA file ${file.name}:`, error);
        // Fallback: try to use the file directly (might work in some browsers)
        console.log(`[TGA Utils] Fallback to direct file for: ${file.name}`);
        const blobUrl = URL.createObjectURL(file);
        results.push({ file, blobUrl });
      }
    } else {
      // For non-TGA files, create blob URL directly
      console.log(`[TGA Utils] Processing non-TGA file: ${file.name}`);
      const blobUrl = URL.createObjectURL(file);
      results.push({ file, blobUrl });
    }
  }

  console.log(`[TGA Utils] Processed ${results.length} files successfully`);
  return results;
}

/**
 * Clean up blob URLs to prevent memory leaks
 */
export function cleanupBlobURLs(blobUrls: string[]): void {
  blobUrls.forEach((url) => URL.revokeObjectURL(url));
}
