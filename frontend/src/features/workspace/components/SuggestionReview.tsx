"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, CircleAlert, SpellCheck, X } from "lucide-react";
import type { CorrectionSuggestion } from "../api/correct-transcription";

const POPOVER_WIDTH = 288;
const GAP = 6;

export function SuggestionDiff({ suggestion }: { suggestion: CorrectionSuggestion }) {
  return (
    <span className="inline-flex min-w-0 flex-wrap items-baseline gap-x-1.5">
      <del className="text-mt-danger-fg decoration-mt-danger-fg/70">
        <span className="sr-only">replace </span>
        {suggestion.original}
      </del>
      <span className="text-mt-text-subtle" aria-hidden="true">
        →
      </span>
      <ins className="font-semibold text-mt-success-fg no-underline">
        <span className="sr-only"> with </span>
        {suggestion.suggested}
      </ins>
    </span>
  );
}

interface SuggestionPopoverProps {
  suggestion: CorrectionSuggestion;
  anchor: HTMLElement;
  isBusy: boolean;
  error: string | null;
  autoFocus: boolean;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export function SuggestionPopover({
  suggestion,
  anchor,
  isBusy,
  error,
  autoFocus,
  onAccept,
  onReject,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: SuggestionPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const acceptRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const rect = anchor.getBoundingClientRect();
    const height = panelRef.current?.offsetHeight ?? 0;
    const below = rect.bottom + GAP;
    const top =
      below + height > window.innerHeight - GAP ? Math.max(GAP, rect.top - GAP - height) : below;
    const left = Math.min(Math.max(GAP, rect.left), window.innerWidth - POPOVER_WIDTH - GAP);
    setPosition({ top, left });
  }, [anchor, suggestion.id]);

  useEffect(() => {
    if (autoFocus && position) acceptRef.current?.focus();
  }, [autoFocus, position]);

  // Close on Escape, a click outside, scrolling or resizing
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function handlePointer(e: PointerEvent) {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !anchor.contains(target)) onClose();
    }
    function handleScroll(e: Event) {
      if (!panelRef.current?.contains(e.target as Node)) onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("pointerdown", handlePointer);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("pointerdown", handlePointer);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", onClose);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={`Suggested correction for "${suggestion.original}"`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        width: POPOVER_WIDTH,
        visibility: position ? "visible" : "hidden",
      }}
      className="fixed z-[60] flex flex-col gap-3 rounded-mt-lg border border-mt-border bg-mt-raised p-3 shadow-lg"
    >
      <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-mt-text-subtle uppercase">
        <SpellCheck className="h-3.5 w-3.5" aria-hidden="true" />
        Suggested correction · line {suggestion.lineN}
      </p>
      <p className="text-[15px] leading-6">
        <SuggestionDiff suggestion={suggestion} />
      </p>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-1.5 rounded-mt-md bg-mt-danger-bg px-2 py-1.5 text-xs text-mt-danger-fg"
        >
          <CircleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-semibold">Not saved.</strong> {error}
          </span>
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          ref={acceptRef}
          type="button"
          onClick={onAccept}
          disabled={isBusy}
          className="inline-flex h-7 items-center gap-1.5 rounded-mt-md bg-mt-accent px-3 text-xs font-medium text-mt-accent-fg hover:bg-mt-accent-hover disabled:cursor-wait disabled:opacity-60"
        >
          {isBusy ? (
            <span
              className="h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent"
              aria-hidden="true"
            />
          ) : (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {isBusy ? "Saving…" : error ? "Try again" : "Accept"}
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={isBusy}
          className="inline-flex h-7 items-center gap-1.5 rounded-mt-md border border-mt-border-strong bg-mt-raised px-3 text-xs font-medium text-mt-text hover:bg-mt-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Reject
        </button>
        <span className="ml-auto text-[11px] text-mt-text-subtle">
          <kbd className="rounded border border-mt-border-strong px-1 font-mono text-[10px]">
            Esc
          </kbd>{" "}
          Close
        </span>
      </div>
    </div>,
    document.body,
  );
}

interface SuggestionChipsProps {
  suggestions: CorrectionSuggestion[];
  busyId: string | null;
  error: { id: string; message: string } | null;
  onAccept: (suggestion: CorrectionSuggestion) => void;
  onReject: (suggestion: CorrectionSuggestion) => void;
}

export function SuggestionChips({
  suggestions,
  busyId,
  error,
  onAccept,
  onReject,
}: SuggestionChipsProps) {
  const iconButton =
    "inline-flex h-6 w-6 items-center justify-center rounded-mt-sm disabled:cursor-wait disabled:opacity-60";
  return (
    <div className="flex flex-col gap-1.5 pr-3 pb-2 pl-1">
      <ul aria-label="Suggested corrections" className="flex flex-wrap gap-1.5">
        {suggestions.map((s) => {
          const isBusy = busyId === s.id;
          return (
            <li
              key={s.id}
              className="inline-flex items-center gap-1 rounded-mt-md border border-mt-accent-soft-strong bg-mt-raised py-0.5 pr-0.5 pl-2 text-[13px]"
            >
              <SuggestionDiff suggestion={s} />
              <button
                type="button"
                onClick={() => onAccept(s)}
                disabled={busyId !== null}
                aria-label={`Accept "${s.suggested}" instead of "${s.original}"`}
                title="Accept"
                className={`${iconButton} ml-1 text-mt-success-fg hover:bg-mt-success-bg`}
              >
                {isBusy ? (
                  <span
                    className="h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent"
                    aria-hidden="true"
                  />
                ) : (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                onClick={() => onReject(s)}
                disabled={busyId !== null}
                aria-label={`Reject "${s.suggested}", keep "${s.original}"`}
                title="Reject"
                className={`${iconButton} text-mt-text-muted hover:bg-mt-hover hover:text-mt-text`}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
      {error && suggestions.some((s) => s.id === error.id) && (
        <p
          role="alert"
          className="flex items-start gap-1.5 rounded-mt-md bg-mt-danger-bg px-2 py-1.5 text-xs text-mt-danger-fg"
        >
          <CircleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-semibold">Not saved.</strong> {error.message}
          </span>
        </p>
      )}
    </div>
  );
}
