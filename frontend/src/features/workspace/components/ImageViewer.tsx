"use client";

// ImageViewer — left panel of the workspace: shows the scanned page and lets the
// user zoom in/out, fit the page to the panel and drag it to pan.
import { useRef, useState } from "react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.25;

interface ImageViewerProps {
  src: string;
  fileName: string;
  isPdf: boolean;
}

export function ImageViewer({ src, fileName, isPdf }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  // Pointer position and pan at the moment the drag started
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  function zoomIn() {
    setZoom((z) => Math.min(MAX_ZOOM, z * ZOOM_STEP));
  }

  function zoomOut() {
    setZoom((z) => Math.max(MIN_ZOOM, z / ZOOM_STEP));
  }

  // "Fit" resets zoom and position
  function fit() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    // Keep receiving move events even if the pointer leaves the panel
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    setIsDragging(true);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const start = dragStart.current;
    if (!start) return;
    setPan({ x: start.panX + e.clientX - start.x, y: start.panY + e.clientY - start.y });
  }

  function onPointerUp() {
    dragStart.current = null;
    setIsDragging(false);
  }

  const toolButton =
    "inline-flex h-8 items-center justify-center rounded-mt-md text-mt-text-muted hover:bg-mt-hover hover:text-mt-text";

  return (
    <>
      {/* Toolbar */}
      <div
        role="toolbar"
        aria-label="Image tools"
        className="flex h-12 shrink-0 items-center gap-1.5 border-b border-mt-border bg-mt-surface px-3"
      >
        <button
          type="button"
          onClick={zoomOut}
          aria-label="Zoom out"
          className={`${toolButton} w-8`}
        >
          <ZoomOut className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="min-w-[48px] text-center font-mono text-xs text-mt-text-muted">
          {Math.round(zoom * 100)}%
        </span>
        <button type="button" onClick={zoomIn} aria-label="Zoom in" className={`${toolButton} w-8`}>
          <ZoomIn className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={fit} className={`${toolButton} gap-1.5 px-2.5 text-xs`}>
          <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
          Fit
        </button>
        <span className="ml-auto text-xs text-mt-text-subtle">Drag to pan</span>
      </div>

      {/* Viewport: the page is centred and moved with CSS transform */}
      <div
        className={`relative min-h-0 flex-1 touch-none overflow-hidden bg-mt-sunken ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {isPdf ? (
            <div className="flex h-[520px] w-[390px] items-center justify-center rounded-lg bg-mt-surface text-sm text-mt-text-subtle shadow-md">
              PDF preview not available
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={fileName}
              draggable={false}
              className="block max-h-[520px] max-w-[390px] select-none rounded-lg object-contain shadow-md"
            />
          )}
        </div>

        {/* File name chip */}
        <div className="absolute bottom-3 left-3 rounded-full bg-mt-raised px-3 py-1 font-mono text-xs text-mt-text-muted shadow">
          {fileName}
        </div>
      </div>
    </>
  );
}
