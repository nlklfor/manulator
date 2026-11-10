"use client";

// TranscriptionLines — the list of transcribed lines, with inline editing.
//   click a line      -> select it
//   click it again, or press Enter -> edit (Enter or Save saves, Esc or Cancel cancels)
//   Arrow up / down   -> move the selection
// A correction counts as saved only once the backend has confirmed it. If saving
// fails, the editor stays open with the entered text, so the user can try again.
// Words the model was unsure about are underlined.
import { useEffect, useRef, useState } from "react";
import { Check, CircleAlert } from "lucide-react";
import type { TranscriptionLine } from "../types";

interface TranscriptionLinesProps {
  lines: TranscriptionLine[]; // the lines to show (already filtered)
  selectedN: number | null;
  onSelectLine: (n: number) => void;
  // Resolves once the backend has saved the line, throws an Error if it could not
  onSaveLine: (n: number, text: string) => Promise<void>;
}

const KEY_CLASS = "rounded border border-mt-border-strong px-1 font-mono text-[10px]";
const SAVED_DISPLAY_DURATION = 3000;

export function TranscriptionLines({
  lines,
  selectedN,
  onSelectLine,
  onSaveLine,
}: TranscriptionLinesProps) {
  const [editingN, setEditingN] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedN, setSavedN] = useState<number | null>(null);
  // Blocks a second request while one is running (state updates are not instant)
  const savingRef = useRef(false);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (savedN === null) return;
    const timer = setTimeout(() => setSavedN(null), SAVED_DISPLAY_DURATION);
    return () => clearTimeout(timer);
  }, [savedN]);

  function focusLine(n: number) {
    requestAnimationFrame(() =>
      listRef.current?.querySelector<HTMLButtonElement>(`[data-line="${n}"]`)?.focus(),
    );
  }

  function startEdit(line: TranscriptionLine) {
    if (savingRef.current) return;
    onSelectLine(line.n);
    setEditingN(line.n);
    setDraft(line.text);
    setSaveError(null);
    setSavedN(null);
  }

  function cancelEdit(line: TranscriptionLine) {
    if (savingRef.current) return;
    setEditingN(null);
    setSaveError(null);
    focusLine(line.n);
  }

  async function saveEdit(line: TranscriptionLine) {
    if (savingRef.current) return;
    const text = draft.trim();
    if (!text) {
      setSaveError("The line must not be empty.");
      return;
    }
    if (text === line.text) {
      cancelEdit(line);
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSaveLine(line.n, text);
      setEditingN(null);
      setSavedN(line.n);
      focusLine(line.n);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Could not save the correction. Please try again.",
      );
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }

  function handleClick(line: TranscriptionLine) {
    if (selectedN === line.n) startEdit(line);
    else if (!savingRef.current) {
      setEditingN(null);
      setSaveError(null);
      onSelectLine(line.n);
    }
  }

  // Arrow keys move the selection and the keyboard focus
  function handleKeyDown(e: React.KeyboardEvent<HTMLOListElement>) {
    if (editingN !== null) return;
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const index = lines.findIndex((l) => l.n === selectedN);
    const nextIndex =
      e.key === "ArrowDown" ? Math.min(lines.length - 1, index + 1) : Math.max(0, index - 1);
    const next = lines[nextIndex];
    if (!next) return;
    onSelectLine(next.n);
    listRef.current?.querySelector<HTMLButtonElement>(`[data-line="${next.n}"]`)?.focus();
  }

  return (
    <>
      <ol
        ref={listRef}
        onKeyDown={handleKeyDown}
        aria-label="Transcribed lines"
        className="flex flex-1 flex-col gap-0.5 overflow-auto p-2"
      >
        {lines.map((line) => {
          const isEditing = editingN === line.n;
          const isSelected = selectedN === line.n;
          return (
            <li
              key={line.n}
              className={`grid grid-cols-[36px_1fr] items-start rounded-mt-md ${
                isEditing
                  ? "bg-mt-raised shadow-[inset_0_0_0_2px_var(--color-mt-accent)]"
                  : isSelected
                    ? "bg-mt-accent-soft shadow-[inset_0_0_0_1px_var(--color-mt-accent-soft-strong)]"
                    : "hover:bg-mt-hover"
              }`}
            >
              <span
                className={`py-2 pr-2 text-right font-mono text-[10px] ${
                  isEditing || isSelected ? "text-mt-accent-text" : "text-mt-text-subtle"
                }`}
              >
                {line.n}
              </span>

              {isEditing ? (
                <div className="flex flex-col gap-1.5 py-1.5 pl-1 pr-3">
                  <input
                    autoFocus
                    aria-label={`Edit line ${line.n}`}
                    aria-invalid={saveError !== null}
                    aria-describedby={saveError ? `line-${line.n}-error` : undefined}
                    value={draft}
                    readOnly={isSaving}
                    onChange={(e) => {
                      setDraft(e.target.value);
                      setSaveError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void saveEdit(line);
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        cancelEdit(line);
                      }
                    }}
                    spellCheck={false}
                    autoComplete="off"
                    className="w-full bg-transparent text-[15px] leading-7 text-mt-text outline-none read-only:text-mt-text-muted"
                  />

                  {saveError && (
                    <p
                      id={`line-${line.n}-error`}
                      role="alert"
                      className="flex items-start gap-1.5 rounded-mt-md bg-mt-danger-bg px-2 py-1.5 text-xs text-mt-danger-fg"
                    >
                      <CircleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>
                        <strong className="font-semibold">Not saved.</strong> {saveError}
                      </span>
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void saveEdit(line)}
                      disabled={isSaving}
                      className="inline-flex h-7 items-center gap-1.5 rounded-mt-md bg-mt-accent px-3 text-xs font-medium text-mt-accent-fg hover:bg-mt-accent-hover disabled:cursor-wait disabled:opacity-60"
                    >
                      {isSaving && (
                        <span
                          className="h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent"
                          aria-hidden="true"
                        />
                      )}
                      {isSaving ? "Saving…" : saveError ? "Try again" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelEdit(line)}
                      disabled={isSaving}
                      className="inline-flex h-7 items-center rounded-mt-md border border-mt-border-strong bg-mt-raised px-3 text-xs font-medium text-mt-text hover:bg-mt-hover disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <p className="ml-auto flex gap-3 text-[11px] text-mt-text-subtle">
                      <span>
                        <kbd className={KEY_CLASS}>Enter</kbd> Save
                      </span>
                      <span>
                        <kbd className={KEY_CLASS}>Esc</kbd> Cancel
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  data-line={line.n}
                  onClick={() => handleClick(line)}
                  onDoubleClick={() => startEdit(line)}
                  className="block w-full cursor-pointer rounded-mt-md py-2 pl-1 pr-3 text-left text-[15px] leading-7 text-mt-text"
                >
                  {line.text.split(" ").map((word, i, words) => (
                    <span
                      key={i}
                      className={
                        line.lowConfWords.includes(i)
                          ? "underline decoration-dotted decoration-mt-warning-fg underline-offset-4"
                          : ""
                      }
                    >
                      {word}
                      {i < words.length - 1 ? " " : ""}
                    </span>
                  ))}
                  {savedN === line.n && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded bg-mt-success-bg px-1.5 align-middle text-[11px] font-medium text-mt-success-fg">
                      <Check className="h-3 w-3" aria-hidden="true" />
                      Saved
                    </span>
                  )}
                  {isSelected && savedN !== line.n && (
                    <span className="ml-2 text-[11px] text-mt-text-subtle">
                      {line.confidence !== null && `${line.confidence}% confidence · `}
                      {line.lowConfWords.length > 0
                        ? `${line.lowConfWords.length} uncertain · press Enter to correct`
                        : "press Enter to edit"}
                    </span>
                  )}
                </button>
              )}
            </li>
          );
        })}
      </ol>

      <span role="status" className="sr-only">
        {isSaving ? `Saving line ${editingN}…` : savedN !== null ? `Line ${savedN} saved` : ""}
      </span>

      {/* Keyboard hints */}
      <div className="flex h-10 shrink-0 items-center gap-4 border-t border-mt-border px-4 text-[11px] text-mt-text-subtle">
        <span className="flex items-center gap-1">
          <kbd className={KEY_CLASS}>↑</kbd>
          <kbd className={KEY_CLASS}>↓</kbd> Move
        </span>
        <span className="flex items-center gap-1">
          <kbd className={KEY_CLASS}>Enter</kbd> Edit / save
        </span>
        <span className="flex items-center gap-1">
          <kbd className={KEY_CLASS}>Esc</kbd> Cancel
        </span>
        <span className="ml-auto">
          <span className="underline decoration-dotted decoration-mt-warning-fg underline-offset-4">
            word
          </span>{" "}
          = uncertain
        </span>
      </div>
    </>
  );
}

// Shown in the "Needs review" filter when every uncertain line has been checked
export function NothingToReview() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <Check className="h-8 w-8 text-mt-success-fg" aria-hidden="true" />
      <strong className="text-sm font-semibold text-mt-text">Nothing left to review</strong>
      <span className="text-xs text-mt-text-muted">
        Every uncertain word on this page has been checked.
      </span>
    </div>
  );
}
