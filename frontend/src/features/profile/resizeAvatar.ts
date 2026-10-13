import type { CSSProperties } from "react";

// The saved picture is a square of at most 512 x 512 px (sharp enough for the
const AVATAR_SIZE = 512;
const QUALITY = 0.8;
export const MAX_ZOOM = 3;

/**
 * zoom: 1 = the short side of the picture fills the frame, up to MAX_ZOOM.
 * x / y: how far the picture is moved, in % of the frame size.
 */
export interface CropPosition {
  zoom: number;
  x: number;
  y: number;
}

export const DEFAULT_CROP: CropPosition = { zoom: 1, x: 0, y: 0 };

// Keeps the picture covering the whole frame: the more you zoom in,
// the further you can move it before an empty edge would show.
export function clampCrop({ zoom, x, y }: CropPosition): CropPosition {
  const safeZoom = Math.min(MAX_ZOOM, Math.max(1, zoom));
  const limit = ((safeZoom - 1) / 2) * 100;
  const clamp = (value: number) => Math.max(-limit, Math.min(limit, value));
  return { zoom: safeZoom, x: clamp(x), y: clamp(y) };
}

// CSS for a picture that fills its square frame (object-fit: cover), so the
// frame shows exactly the part that resizeAvatar() will cut out
export function cropStyle({ zoom, x, y }: CropPosition): CSSProperties {
  return { transform: `translate(${x}%, ${y}%) scale(${zoom})` };
}

/**
 * Cuts out the part of the picture shown in the frame, shrinks it and
 * encodes it as WebP. Phone photos are turned the right way up by
 * createImageBitmap. Browsers that cannot create WebP (older Safari) get a JPEG.
 */
export async function resizeAvatar(file: File, crop: CropPosition = DEFAULT_CROP): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This file is not a valid image.");
  }

  const { zoom, x, y } = clampCrop(crop);
  const { width, height } = bitmap;

  // At zoom 1 the frame shows a square as big as the picture's short side.
  // Zooming in makes that square smaller; moving the picture moves the square
  const frame = Math.min(width, height);
  const cropSide = frame / zoom;
  const centerX = width / 2 - ((x / 100) * frame) / zoom;
  const centerY = height / 2 - ((y / 100) * frame) / zoom;

  const size = Math.max(1, Math.min(AVATAR_SIZE, Math.round(cropSide)));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  canvas
    .getContext("2d")
    ?.drawImage(
      bitmap,
      centerX - cropSide / 2,
      centerY - cropSide / 2,
      cropSide,
      cropSide,
      0,
      0,
      size,
      size,
    );
  bitmap.close();

  const webp = await toBlob(canvas, "image/webp");
  if (webp?.type === "image/webp") return webp;

  const jpeg = await toBlob(canvas, "image/jpeg");
  if (!jpeg) throw new Error("Could not prepare your picture. Please try another one.");
  return jpeg;
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}
