/**
 * Color effects utilities for image processing in the compositing editor
 * Implements functionality similar to After Effects color key and color keep effects
 */

export interface ColorKeySettings {
  enabled: boolean;
  keyColor: string; // hex color to key out
  tolerance: number; // 0-100, how much variation to allow
  softness: number; // 0-100, edge softness
}

export interface ColorKeepSettings {
  enabled: boolean;
  keepColor: string; // hex color to keep
  tolerance: number; // 0-100, how much variation to allow
  softness: number; // 0-100, edge softness
}

export interface FillSettings {
  enabled: boolean;
  fillColor: string; // hex color to fill with
  opacity: number; // 0-100, opacity of the fill
  preserveOriginalAlpha: boolean; // whether to preserve the original alpha channel
}

export interface AssetEffects {
  colorKey?: ColorKeySettings;
  colorKeep?: ColorKeepSettings;
  fill?: FillSettings;
}

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calculate color distance between two RGB colors
 */
function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  // Using Euclidean distance in RGB space
  return Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2));
}

/**
 * Apply color key effect to an image on canvas
 * Removes pixels that match the key color within tolerance
 */
export function applyColorKey(
  ctx: CanvasRenderingContext2D,
  imageData: ImageData,
  settings: ColorKeySettings
): ImageData {
  if (!settings.enabled) return imageData;

  const keyRgb = hexToRgb(settings.keyColor);
  if (!keyRgb) return imageData;

  const data = new Uint8ClampedArray(imageData.data);
  const tolerance = (settings.tolerance / 100) * 255; // Convert to 0-255 range
  const softness = settings.softness / 100; // Convert to 0-1 range

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Skip transparent pixels
    if (a === 0) continue;

    const distance = colorDistance(r, g, b, keyRgb.r, keyRgb.g, keyRgb.b);

    if (distance <= tolerance) {
      // Within key range - calculate alpha based on distance and softness
      if (softness > 0) {
        const alpha = Math.max(0, (distance - tolerance * (1 - softness)) / (tolerance * softness));
        data[i + 3] = Math.round(a * alpha);
      } else {
        // Hard key - fully transparent
        data[i + 3] = 0;
      }
    }
  }

  return new ImageData(data, imageData.width, imageData.height);
}

/**
 * Apply color keep effect to an image on canvas
 * Keeps only pixels that match the keep color within tolerance
 */
export function applyColorKeep(
  ctx: CanvasRenderingContext2D,
  imageData: ImageData,
  settings: ColorKeepSettings
): ImageData {
  if (!settings.enabled) return imageData;

  const keepRgb = hexToRgb(settings.keepColor);
  if (!keepRgb) return imageData;

  const data = new Uint8ClampedArray(imageData.data);
  const tolerance = (settings.tolerance / 100) * 255; // Convert to 0-255 range
  const softness = settings.softness / 100; // Convert to 0-1 range

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Skip transparent pixels
    if (a === 0) continue;

    const distance = colorDistance(r, g, b, keepRgb.r, keepRgb.g, keepRgb.b);

    if (distance > tolerance) {
      // Outside keep range - calculate alpha based on distance and softness
      if (softness > 0) {
        const alpha = Math.max(0, 1 - (distance - tolerance) / (tolerance * softness));
        data[i + 3] = Math.round(a * alpha);
      } else {
        // Hard keep - fully transparent
        data[i + 3] = 0;
      }
    }
  }

  return new ImageData(data, imageData.width, imageData.height);
}

/**
 * Apply fill effect to an image on canvas
 * Fills the image with a solid color in normal blend mode
 */
export function applyFill(
  ctx: CanvasRenderingContext2D,
  imageData: ImageData,
  settings: FillSettings
): ImageData {
  if (!settings.enabled) return imageData;

  const fillRgb = hexToRgb(settings.fillColor);
  if (!fillRgb) return imageData;

  const data = new Uint8ClampedArray(imageData.data);
  const fillOpacity = settings.opacity / 100; // Convert to 0-1 range

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Skip transparent pixels
    if (a === 0) continue;

    // Apply normal blend mode (replace with fill color)
    const newR = fillRgb.r;
    const newG = fillRgb.g;
    const newB = fillRgb.b;
    let newA = a;

    // Apply fill opacity by blending between original and fill color
    const finalR = r + (newR - r) * fillOpacity;
    const finalG = g + (newG - g) * fillOpacity;
    const finalB = b + (newB - b) * fillOpacity;

    // Preserve original alpha if requested, otherwise apply fill opacity to alpha
    if (!settings.preserveOriginalAlpha) {
      newA = a * fillOpacity;
    }

    data[i] = Math.round(Math.max(0, Math.min(255, finalR)));
    data[i + 1] = Math.round(Math.max(0, Math.min(255, finalG)));
    data[i + 2] = Math.round(Math.max(0, Math.min(255, finalB)));
    data[i + 3] = Math.round(Math.max(0, Math.min(255, newA)));
  }

  return new ImageData(data, imageData.width, imageData.height);
}

/**
 * Process image with all applied effects
 */
export function processImageWithEffects(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  effects: AssetEffects
): HTMLCanvasElement {
  // Create a temporary canvas for processing
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = img.naturalWidth;
  tempCanvas.height = img.naturalHeight;
  const tempCtx = tempCanvas.getContext('2d');
  
  if (!tempCtx) return tempCanvas;

  // Draw original image
  tempCtx.drawImage(img, 0, 0);
  
  // Get image data for processing
  let imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

  // Apply fill effect first (base color transformation)
  if (effects.fill?.enabled) {
    imageData = applyFill(tempCtx, imageData, effects.fill);
  }

  // Apply color key effect
  if (effects.colorKey?.enabled) {
    imageData = applyColorKey(tempCtx, imageData, effects.colorKey);
  }

  // Apply color keep effect
  if (effects.colorKeep?.enabled) {
    imageData = applyColorKeep(tempCtx, imageData, effects.colorKeep);
  }

  // Put processed image data back
  tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
  tempCtx.putImageData(imageData, 0, 0);

  return tempCanvas;
}
