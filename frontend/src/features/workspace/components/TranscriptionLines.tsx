"use client";

// TranscriptionLines — the list of transcribed lines, with inline editing.
//   click a line      -> select it
//   click it again, or press Enter -> edit (Enter saves, Esc cancels)
//   Arrow up / down   -> move the selection
// Words the model was unsure about are underlined.
import { useRef, useState } from "react";
import { Check } from "lucide-react";
import type { TranscriptionLine } from "../types";

interface TranscriptionLinesProps {
  lines: TranscriptionLine[]; // the lines to show (already filtered)
  onSaveLine: (n: number, text: string) => void;
}

const KEY_CLASS = "rounded border border-mt-border-strong px-1 font-mono text-[10px]";

export function TranscriptionLines({ lines, onSaveLine }: TranscriptionLinesProps) {
  const [selectedN, setSelectedN] = useState<number | null>(null);
  const [editingN, setEditingN] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLOListElement>(null);

  function startEdit(line: TranscriptionLine) {
    setSelectedN(line.n);
    setEditingN(line.n);
    setDraft(line.text);
  }

  function saveEdit(line: TranscriptionLine) {
    const text = draft.trim();
    setEditingN(null);
    // Only report a real change; an empty line is ignored
    if (text && text !== line.text) onSaveLine(line.n, text);
  }

  function handleClick(line: TranscriptionLine) {
    if (selectedN === line.n) startEdit(line);
    else setSelectedN(line.n);
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
    setSelectedN(next.n);
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
                  ? "bg-mt-raised shadow-[inset_0_0_0_2px_var(--mt-accent)]"
                  : isSelected
                    ? "bg-mt-accent-soft"
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
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveEdit(line);
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setEditingN(null);
                      }
                    }}
                    onBlur={() => saveEdit(line)}
                    spellCheck={false}
                    autoComplete="off"
                    className="w-full bg-transparent text-[15px] leading-7 text-mt-text outline-none"
                  />
                  <p className="flex gap-3 text-[11px] text-mt-text-subtle">
                    <span>
                      <kbd className={KEY_CLASS}>Enter</kbd> Save
                    </span>
                    <span>
                      <kbd className={KEY_CLASS}>Esc</kbd> Cancel
                    </span>
                  </p>
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
                  {isSelected && (
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
