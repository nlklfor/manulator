"use client";

import { useRef } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import Image from "next/image";
import { ZoomIn, ZoomOut } from "lucide-react";
import { clampCrop, cropStyle, MAX_ZOOM } from "../resizeAvatar";
import type { CropPosition } from "../resizeAvatar";

const FRAME_PX = 260; // size of the square crop area
const KEY_STEP = 2; // % moved per arrow key press

const ARROW_KEYS: Record<string, [number, number]> = {
  ArrowLeft: [-KEY_STEP, 0],
  ArrowRight: [KEY_STEP, 0],
  ArrowUp: [0, -KEY_STEP],
  ArrowDown: [0, KEY_STEP],
};

interface AvatarCropperProps {
  imageUrl: string;
  crop: CropPosition;
  onChange: (crop: CropPosition) => void;
  onImageError: () => void; // the browser could not open the file as a picture
}

// Step 2 of the dialog: drag and zoom the picture inside the round frame,
// with previews at the sizes the app uses (profile, menu, sidebar)
export function AvatarCropper({ imageUrl, crop, onChange, onImageError }: AvatarCropperProps) {
  // Where a drag started: pointer position and picture position at that moment
  const dragStart = useRef<{ pointerX: number; pointerY: number; crop: CropPosition } | null>(null);

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    // Keep receiving moves even when the pointer leaves the frame
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { pointerX: event.clientX, pointerY: event.clientY, crop };
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const start = dragStart.current;
    if (!start) return;
    // The picture follows the pointer: pixels moved -> % of the frame
    const dx = ((event.clientX - start.pointerX) / FRAME_PX) * 100;
    const dy = ((event.clientY - start.pointerY) / FRAME_PX) * 100;
    onChange(clampCrop({ ...start.crop, x: start.crop.x + dx, y: start.crop.y + dy }));
  }

  function handlePointerUp() {
    dragStart.current = null;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const step = ARROW_KEYS[event.key];
    if (!step) return;
    event.preventDefault();
    onChange(clampCrop({ ...crop, x: crop.x + step[0], y: crop.y + step[1] }));
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Side by side in the 520 px dialog, stacked on narrow screens */}
      <div className="flex flex-wrap items-center gap-5">
        <button
          type="button"
          aria-label="Reposition picture. Drag, or use the arrow keys."
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
          style={{ width: FRAME_PX, height: FRAME_PX }}
          className="relative flex-none cursor-grab touch-none overflow-hidden rounded-[12px] bg-mt-sunken active:cursor-grabbing"
        >
          <CropImage imageUrl={imageUrl} crop={crop} onError={onImageError} />
          <span className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/90 shadow-[0_0_0_200px_rgba(20,16,10,0.58)]" />
        </button>

        <div className="flex flex-col gap-3.5">
          <span className="text-xs font-semibold tracking-wide text-mt-text-subtle uppercase">
            Preview
          </span>
          <div className="flex items-end gap-3">
            {["size-24", "size-10", "size-7"].map((size) => (
              <span
                key={size}
                className={`relative flex-none overflow-hidden rounded-full bg-mt-sunken ${size}`}
              >
                <CropImage imageUrl={imageUrl} crop={crop} />
              </span>
            ))}
          </div>
          <span className="max-w-[180px] text-xs text-mt-text-subtle">
            Drag the picture to move it. Everything inside the circle is kept.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3" style={{ width: FRAME_PX }}>
        <label htmlFor="avatar-zoom" className="sr-only">
          Zoom
        </label>
        <ZoomOut className="size-4 flex-none text-mt-text-muted" aria-hidden="true" />
        <input
          id="avatar-zoom"
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={crop.zoom}
          onChange={(event) => onChange(clampCrop({ ...crop, zoom: Number(event.target.value) }))}
          className="h-7 flex-1 accent-mt-accent"
        />
        <ZoomIn className="size-4 flex-none text-mt-text-muted" aria-hidden="true" />
      </div>
    </div>
  );
}

interface CropImageProps {
  imageUrl: string;
  crop: CropPosition;
  onError?: () => void;
}

function CropImage({ imageUrl, crop, onError }: CropImageProps) {
  return (
    <Image
      src={imageUrl}
      alt=""
      fill
      unoptimized
      draggable={false}
      onError={onError}
      style={cropStyle(crop)}
      className="pointer-events-none object-cover select-none"
    />
  );
}
