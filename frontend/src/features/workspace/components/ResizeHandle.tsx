"use client";

// ResizeHandle — the bar between two workspace panels. Drag it to make one panel
// wider and the other narrower; with the keyboard, focus it and use arrow left/right.
import { useRef } from "react";

interface ResizeHandleProps {
  // Width of the left panel as a share (0–1) of the two panels next to the handle
  value: number;
  // Called with the distance moved, as a share of the whole workspace width
  onResize: (delta: number) => void;
  // The element whose width the shares refer to
  containerRef: React.RefObject<HTMLElement | null>;
  label: string;
}

const KEYBOARD_STEP = 0.02;

export function ResizeHandle({ value, onResize, containerRef, label }: ResizeHandleProps) {
  const lastX = useRef<number | null>(null);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    lastX.current = e.clientX;
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const width = containerRef.current?.getBoundingClientRect().width;
    if (lastX.current === null || !width) return;
    onResize((e.clientX - lastX.current) / width);
    lastX.current = e.clientX;
  }

  function handlePointerUp() {
    lastX.current = null;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowLeft") onResize(-KEYBOARD_STEP);
    else if (e.key === "ArrowRight") onResize(KEYBOARD_STEP);
    else return;
    e.preventDefault();
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      className="group relative z-10 -mx-1 w-2 shrink-0 cursor-col-resize touch-none focus-visible:outline-none"
    >
      {/* The visible line; it gets thicker on hover, while dragging and on focus */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-mt-border transition-[width,background-color] group-hover:w-1 group-hover:bg-mt-accent group-focus-visible:w-1 group-focus-visible:bg-mt-accent group-active:w-1 group-active:bg-mt-accent"
      />
    </div>
  );
}
