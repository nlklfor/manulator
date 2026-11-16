"use client";

import { CircleAlert, Info, Languages } from "lucide-react";
import {
  TRANSLATION_TYPES,
  type Translation,
  type TranslationType,
} from "../api/translate-manuscript";

interface TranslationPanelProps {
  isTranscribed: boolean;
  // How the text is translated: the whole text at once or sentence by sentence
  translationType: TranslationType;
  onTranslationTypeChange: (type: TranslationType) => void;
  translation: Translation | null;
  isTranslating: boolean;
  error: string | null;
  // The transcription was corrected after the translation was made
  isOutdated: boolean;
  onTranslate: () => void;
}

export function TranslationPanel({
  isTranscribed,
  translationType,
  onTranslationTypeChange,
  translation,
  isTranslating,
  error,
  isOutdated,
  onTranslate,
}: TranslationPanelProps) {
  return (
    <>
      {/* Panel header */}
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-mt-border px-4">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[15px] font-semibold text-mt-text">Translation</h2>
          <span className="text-xs text-mt-text-subtle">
            {isTranslating
              ? "Working…"
              : translation
                ? translation.type === "sentence"
                  ? `English · ${translation.parts.length} sentences`
                  : "English"
                : "No translation yet"}
          </span>
        </div>
        {isTranscribed && (
          <div className="ml-auto flex items-center gap-2">
            <label htmlFor="translation-type" className="sr-only">
              Translation type
            </label>
            <select
              id="translation-type"
              value={translationType}
              disabled={isTranslating}
              onChange={(e) => onTranslationTypeChange(e.target.value as TranslationType)}
              className="h-7 cursor-pointer rounded-mt-md border border-mt-border-strong bg-mt-raised px-2 text-xs text-mt-text disabled:cursor-not-allowed disabled:opacity-60"
            >
              {TRANSLATION_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {translation && !isTranslating && (
          <button
            type="button"
            onClick={onTranslate}
            className="inline-flex h-7 items-center gap-1.5 rounded-mt-md border border-mt-border-strong bg-mt-raised px-2.5 text-xs font-medium text-mt-text hover:bg-mt-hover"
          >
            <Languages className="h-3.5 w-3.5" aria-hidden="true" />
            Translate again
          </button>
        )}
      </div>

      {!isTranscribed ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <strong className="text-sm font-semibold text-mt-text">Nothing to translate yet</strong>
          <span className="max-w-xs text-xs text-mt-text-muted">
            Transcribe the page first. The translation is made from the transcribed text.
          </span>
        </div>
      ) : isTranslating ? (
        <div
          role="status"
          className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center"
        >
          <span
            className="h-7 w-7 animate-spin rounded-full border-2 border-mt-accent border-r-transparent"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-mt-text">Translating…</p>
          <p className="text-xs text-mt-text-subtle">This can take a minute for a long page.</p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-3 overflow-auto p-4">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-mt-md bg-mt-danger-bg px-3 py-2.5 text-sm text-mt-danger-fg"
            >
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                <strong className="font-semibold">Translation failed.</strong> {error} The
                transcription has not been changed.
              </span>
            </div>
          )}

          {translation ? (
            <>
              {isOutdated && (
                <div className="flex items-start gap-2 rounded-mt-md bg-mt-warning-bg px-3 py-2.5 text-sm text-mt-warning-fg">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    The transcription was corrected after this translation. Translate again to
                    update it.
                  </span>
                </div>
              )}
              {translation.type === "sentence" ? (
                <ol lang="en" aria-label="Translated sentences" className="flex flex-col gap-0.5">
                  {translation.parts.map((sentence, i) => (
                    <li
                      key={i}
                      className="grid grid-cols-[36px_1fr] items-start rounded-mt-md hover:bg-mt-hover"
                    >
                      <span className="py-2 pr-2 text-right font-mono text-[10px] text-mt-text-subtle">
                        {i + 1}
                      </span>
                      <span className="py-2 pl-1 pr-3 text-[15px] leading-7 text-mt-text">
                        {sentence}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p lang="en" className="text-[15px] leading-7 text-mt-text">
                  {translation.parts.join(" ")}
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-mt-accent-soft text-mt-accent-text">
                <Languages className="h-7 w-7" aria-hidden="true" />
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <h3 className="text-lg font-semibold text-mt-text">Not translated yet</h3>
                <p className="max-w-xs text-sm text-mt-text-muted">
                  Translate the transcribed text of this page into English.
                </p>
              </div>
              <button
                type="button"
                onClick={onTranslate}
                className="inline-flex h-10 items-center gap-2 rounded-mt-md bg-mt-accent px-5 text-sm font-medium text-mt-accent-fg hover:bg-mt-accent-hover"
              >
                <Languages className="h-4 w-4" aria-hidden="true" />
                {error ? "Try again" : "Translate page"}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
