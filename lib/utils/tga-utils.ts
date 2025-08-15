// Custom TGA decoder - no external dependencies

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
 * Simple TGA decoder implementation
 * Supports uncompressed 24-bit and 32-bit TGA files
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
        const view = new DataView(buffer);
        
        // Check minimum TGA header size
        if (buffer.byteLength < 18) {
          reject(new Error("File too small to be a valid TGA"));
          return;
        }

        // Read TGA header
        const idLength = view.getUint8(0);
        const colorMapType = view.getUint8(1);
        const imageType = view.getUint8(2);
        
        // We only support uncompressed true-color images (type 2)
        if (imageType !== 2) {
          reject(new Error(`Unsupported TGA image type: ${imageType}. Only uncompressed true-color (type 2) is supported.`));
          return;
        }
        
        // Skip color map data (we don't use it for true-color)
        const width = view.getUint16(12, true); // little endian
        const height = view.getUint16(14, true);
        const bitsPerPixel = view.getUint8(16);
        const imageDescriptor = view.getUint8(17);
        
        console.log(`[TGA Utils] TGA Header: ${width}x${height}, ${bitsPerPixel}bpp, type: ${imageType}`);
        
        // Only support 24-bit (RGB) and 32-bit (RGBA)
        if (bitsPerPixel !== 24 && bitsPerPixel !== 32) {
          reject(new Error(`Unsupported TGA bit depth: ${bitsPerPixel}. Only 24-bit and 32-bit are supported.`));
          return;
        }
        
        const bytesPerPixel = bitsPerPixel / 8;
        const imageDataSize = width * height * 4; // RGBA output
        const imageData = new Uint8ClampedArray(imageDataSize);
        
        // Calculate start of image data
        let dataOffset = 18 + idLength; // Header + ID field
        if (colorMapType === 1) {
          // Skip color map if present
          const colorMapLength = view.getUint16(5, true);
          const colorMapEntrySize = view.getUint8(7);
          dataOffset += colorMapLength * Math.ceil(colorMapEntrySize / 8);
        }
        
        // Check if we have enough data
        const expectedDataSize = width * height * bytesPerPixel;
        if (buffer.byteLength < dataOffset + expectedDataSize) {
          reject(new Error("TGA file appears to be truncated"));
          return;
        }
        
        // Determine if image is flipped (bit 5 of image descriptor)
        const isTopDown = (imageDescriptor & 0x20) !== 0;
        
        // Read pixel data
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            // Calculate source position
            const srcY = isTopDown ? y : (height - 1 - y); // TGA is usually bottom-up
            const srcIndex = dataOffset + (srcY * width + x) * bytesPerPixel;
            
            // Calculate destination position (always top-down for canvas)
            const dstIndex = (y * width + x) * 4;
            
            if (bitsPerPixel === 24) {
              // BGR format in TGA
              imageData[dstIndex + 0] = view.getUint8(srcIndex + 2); // R
              imageData[dstIndex + 1] = view.getUint8(srcIndex + 1); // G
              imageData[dstIndex + 2] = view.getUint8(srcIndex + 0); // B
              imageData[dstIndex + 3] = 255; // A (opaque)
            } else if (bitsPerPixel === 32) {
              // BGRA format in TGA
              imageData[dstIndex + 0] = view.getUint8(srcIndex + 2); // R
              imageData[dstIndex + 1] = view.getUint8(srcIndex + 1); // G
              imageData[dstIndex + 2] = view.getUint8(srcIndex + 0); // B
              imageData[dstIndex + 3] = view.getUint8(srcIndex + 3); // A
            }
          }
        }
        
        const result: TGAImageData = {
          width,
          height,
          data: imageData
        };

        console.log(`[TGA Utils] Successfully decoded TGA: ${width}x${height}, ${bitsPerPixel}bpp`);
        resolve(result);
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
        console.log(`[TGA Utils] Adding TGA file as fallback blob: ${file.name}`);
        // Create blob URL from original file - this will work for display in UI
        // but browsers may not be able to display TGA format directly
        try {
          const blobUrl = URL.createObjectURL(file);
          console.log(`[TGA Utils] Created fallback blob URL: ${blobUrl}`);
          results.push({ file, blobUrl });
        } catch (blobError) {
          console.error(`Failed to create blob URL for ${file.name}:`, blobError);
        }
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
