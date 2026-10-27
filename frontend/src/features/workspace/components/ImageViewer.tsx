"use client";

// ImageViewer — left panel of the workspace: shows the scanned page and lets the
// user zoom in/out, fit the page to the panel and drag it to pan.
// The outlines of the detected lines are drawn on top of the page.
import { useEffect, useRef, useState } from "react";
import { Field, Label, Switch } from "@headlessui/react";
import { ImageOff, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import type { TranscriptionLine } from "../types";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.25;
const FIT_PADDING = 24;
// Space (in screen px) two lines need between their middles to show all line numbers
const MIN_NUMBER_GAP = 16;
const LEFT_END_SHARE = 0.05;

function medianGap(middles: number[]): number {
  const sorted = [...middles].sort((a, b) => a - b);
  const gaps = sorted
    .slice(1)
    .map((m, i) => m - sorted[i])
    .filter((gap) => gap > 0);
  if (gaps.length === 0) return 0;
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)];
}

interface ImageViewerProps {
  src: string;
  fileName: string;
  isPdf: boolean;
  lines: TranscriptionLine[];
  selectedN: number | null;
}

export function ImageViewer({ src, fileName, isPdf, lines, selectedN }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  // Pointer position and pan at the moment the drag started
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [imageSize, setImageSize] = useState<{ src: string; width: number; height: number } | null>(
    null,
  );
  const naturalSize = imageSize?.src === src ? imageSize : null;
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<{ width: number; height: number } | null>(null);
  const [showOutlines, setShowOutlines] = useState(true);
  const outlined = lines.filter((line) => line.boundary.length > 2);

  // Follow the panel size, so the fitted page grows and shrinks with the window
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      setViewport({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const fitScale =
    naturalSize && viewport
      ? Math.max(
          0,
          Math.min(
            (viewport.width - 2 * FIT_PADDING) / naturalSize.width,
            (viewport.height - 2 * FIT_PADDING) / naturalSize.height,
          ),
        )
      : null;
  const fitted =
    naturalSize && fitScale !== null
      ? { width: naturalSize.width * fitScale, height: naturalSize.height * fitScale }
      : null;

  const numberSpots = outlined.map((line) => {
    const xs = line.boundary.map(([x]) => x);
    const left = Math.min(...xs);
    const leftEnd = left + LEFT_END_SHARE * (Math.max(...xs) - left);
    let ys = line.boundary.filter(([x]) => x <= leftEnd).map(([, y]) => y);
    if (ys.length < 2) ys = line.boundary.map(([, y]) => y);
    return { n: line.n, left, middle: (Math.min(...ys) + Math.max(...ys)) / 2 };
  });
  const lineGap = medianGap(numberSpots.map((s) => s.middle)) * (fitScale ?? 0) * zoom;
  const showAllNumbers = lineGap >= MIN_NUMBER_GAP;

  function zoomIn() {
    setZoom((z) => Math.min(MAX_ZOOM, z * ZOOM_STEP));
  }

  function zoomOut() {
    setZoom((z) => Math.max(MIN_ZOOM, z / ZOOM_STEP));
  }

  // "Fit" shows the whole page and centres it
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
          Fit to screen
        </button>
        <span className="mx-1 h-5 w-px bg-mt-border" aria-hidden="true" />
        {/* Show or hide the detected line outlines on the scan */}
        <Field className="flex h-8 items-center gap-2 px-2.5">
          <Switch
            checked={showOutlines}
            onChange={setShowOutlines}
            className="group inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full bg-mt-border-strong transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mt-accent data-checked:bg-mt-accent"
          >
            <span className="h-3 w-3 translate-x-0.5 rounded-full bg-mt-raised shadow-sm transition-transform group-data-checked:translate-x-3.5" />
          </Switch>
          <Label className="cursor-pointer text-xs text-mt-text-muted">Line outlines</Label>
        </Field>
        <span className="ml-auto text-xs text-mt-text-subtle">Drag to pan</span>
      </div>

      {/* Viewport: the page is centred and moved with CSS transform */}
      <div
        ref={viewportRef}
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
          ) : !src ? (
            // The backend sends an empty url when it could not create the preview link
            <div className="flex h-[520px] w-[390px] items-center justify-center rounded-lg bg-mt-surface text-mt-text-subtle shadow-md">
              <ImageOff
                className="h-10 w-10"
                strokeWidth={1.5}
                aria-label="Preview not available"
              />
            </div>
          ) : (
            <div className={`relative ${fitted ? "" : "invisible"}`} style={fitted ?? undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={fileName}
                draggable={false}
                onLoad={(e) =>
                  setImageSize({
                    src,
                    width: e.currentTarget.naturalWidth,
                    height: e.currentTarget.naturalHeight,
                  })
                }
                className={`block select-none rounded-lg shadow-md ${fitted ? "h-full w-full" : ""}`}
              />
              {naturalSize && showOutlines && outlined.length > 0 && (
                <>
                  <svg
                    aria-hidden="true"
                    data-testid="line-overlay"
                    viewBox={`0 0 ${naturalSize.width} ${naturalSize.height}`}
                    preserveAspectRatio="none"
                    className="pointer-events-none absolute inset-0 h-full w-full"
                  >
                    {outlined.map((line) => {
                      const isSelected = line.n === selectedN;
                      return (
                        <polygon
                          key={line.n}
                          data-line={line.n}
                          data-selected={isSelected || undefined}
                          points={line.boundary.map(([x, y]) => `${x},${y}`).join(" ")}
                          fill={isSelected ? "var(--color-mt-outline-selected)" : "none"}
                          fillOpacity={isSelected ? 0.12 : undefined}
                          stroke={
                            isSelected
                              ? "var(--color-mt-outline-selected)"
                              : "var(--color-mt-outline)"
                          }
                          strokeWidth={isSelected ? 2.5 : 1.5}
                          strokeLinejoin="round"
                          // Keep the line width the same at every zoom level
                          vectorEffect="non-scaling-stroke"
                        />
                      );
                    })}
                  </svg>

                  {/* Line numbers. Each sits on a zero-size anchor that undoes the
                      zoom, so the numbers keep the same size on screen. */}
                  {numberSpots
                    .filter((spot) => showAllNumbers || spot.n === selectedN)
                    .map((spot) => (
                      <span
                        key={spot.n}
                        aria-hidden="true"
                        className="pointer-events-none absolute h-0 w-0"
                        style={{
                          left: `${(spot.left / naturalSize.width) * 100}%`,
                          top: `${(spot.middle / naturalSize.height) * 100}%`,
                          transform: `scale(${1 / zoom})`,
                        }}
                      >
                        <span
                          className={`absolute right-1 top-0 flex h-3.5 min-w-3.5 -translate-y-1/2 items-center justify-center rounded-mt-sm px-0.5 font-mono text-[9px] font-semibold leading-none text-mt-accent-fg ${
                            spot.n === selectedN ? "bg-mt-outline-selected" : "bg-mt-accent"
                          }`}
                        >
                          {spot.n}
                        </span>
                      </span>
                    ))}
                </>
              )}
            </div>
          )}
        </div>

        <div className="absolute bottom-3 left-3 rounded-full bg-mt-raised px-3 py-1 font-mono text-xs text-mt-text-muted shadow">
          {fileName}
          {naturalSize && ` · ${naturalSize.width} × ${naturalSize.height} px`}
        </div>
      </div>
    </>
  );
}
