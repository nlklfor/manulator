"use client";

// WorkspacePage — detail view of one manuscript page (route: /manuscript/<id>).
// Layout: top bar, the page image on the left (can be hidden), a drag bar to resize,
// and on the right the text views as browser-like tabs: Transcription, Translation
// (with "Compare": transcription and translation side by side) and Summary.
import { useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  CircleAlert,
  Download,
  Languages,
  PanelLeftClose,
  PanelLeftOpen,
  ScanLine,
  Workflow,
} from "lucide-react";
import { useLibrary } from "@/features/upload-manuscript/context/LibraryContext";
import { StatusBadge } from "@/features/upload-manuscript/components/StatusBadge";
import { ImageViewer } from "./ImageViewer";
import { TranscriptionPanel } from "./TranscriptionPanel";
import { TranslationPanel } from "./TranslationPanel";
import { SummaryPanel } from "./SummaryPanel";
import { ResizeHandle } from "./ResizeHandle";
import { tabId, tabPanelId, WorkspaceTabs, type WorkspaceTab } from "./WorkspaceTabs";
import { processManuscript } from "@/features/workspace/api/process-manuscript";
import { saveLineCorrection } from "@/features/workspace/api/correct-line";
import {
  fromSavedTranslation,
  toSavedTranslation,
  translateManuscript,
  translationPlan,
  type TranslationType,
} from "@/features/workspace/api/translate-manuscript";
import { summarizeManuscript } from "@/features/workspace/api/summarize-manuscript";
import { hasTranscription } from "@/features/upload-manuscript/constants/status";
import { isStepRunning } from "@/features/upload-manuscript/api/pipeline";
import { mergeProcessResult, toTranscriptionLines } from "../transcription";

// The image takes this share of the width at first, and stays between MIN and MAX
const DEFAULT_IMAGE_SHARE = 0.56;
const MIN_IMAGE_SHARE = 0.2;
const MAX_IMAGE_SHARE = 0.8;

interface WorkspacePageProps {
  manuscriptId: string;
}

export function WorkspacePage({ manuscriptId }: WorkspacePageProps) {
  // The library lives in memory (LibraryContext), so we look the page up by id.
  const {
    libraryEntries,
    isLoading,
    updateEntryStatus,
    updateEntryTranscription,
    updateEntry,
    runPipeline,
  } = useLibrary();
  const entry = libraryEntries.find((e) => e.id === manuscriptId);

  const transcription = entry?.transcription;
  // No useMemo needed: the React Compiler memoizes this
  const lines = toTranscriptionLines(transcription);
  // The line selected in the list; its outline is highlighted on the scan
  const [selectedN, setSelectedN] = useState<number | null>(null);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  // The panels side by side and their widths; image and transcription by default
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("transcription");
  // Translation tab only: transcription and translation side by side
  const [isComparing, setIsComparing] = useState(false);
  const [isImageVisible, setIsImageVisible] = useState(true);
  // Width of the image as a share of the workspace; changed with the drag bar
  const [imageShare, setImageShare] = useState(DEFAULT_IMAGE_SHARE);
  const splitRef = useRef<HTMLDivElement>(null);
  // The backend saves the translation and the summary with the page
  const savedTranslation = entry?.translation;
  const translation = savedTranslation ? fromSavedTranslation(savedTranslation) : null;
  const summary = entry?.summary ?? null;
  const [translationType, setTranslationType] = useState<TranslationType>("full");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [isTranslationOutdated, setIsTranslationOutdated] = useState(false);
  // Counts translation requests, so the result of an outdated request is ignored
  const translationRequestRef = useRef(0);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summarizeError, setSummarizeError] = useState<string | null>(null);
  const summaryRequestRef = useRef(0);

  // For now the plan is to just transcribe the page
  const processPlan = {
    steps: [],
    plan: "Transcribe",
    options: {},
  };

  // Runs line detection + transcription. On failure the page goes back to
  // "uploaded" and shows the error, so the user can start again.
  function handleTranscribe(modelId: string) {
    if (!entry) return;
    const id = entry.id;
    void modelId;

    function fail(message: string) {
      setTranscribeError(message);
      updateEntryStatus(id, "uploaded");
    }

    setTranscribeError(null);
    updateEntryStatus(id, "transcribing");
    processManuscript(id, processPlan)
      .then((result) => {
        if (!result.success) {
          fail(result.message ?? "The model could not read this page. Please try again.");
          return;
        }
        updateEntryTranscription(id, mergeProcessResult(result.data));
        updateEntryStatus(id, "transcribed");
      })
      .catch((error: Error) => fail(error.message));
  }

  // Translates the transcribed page: the status shows "Translating", then "Translated".
  // A failed translation keeps the old one (if any) and the old status, and never
  // changes the transcription.
  async function handleTranslate() {
    if (!entry || isTranslating || isBusy) return;
    const id = entry.id;
    const statusBefore = entry.status;
    const request = ++translationRequestRef.current;
    setActiveTab("translation");
    setIsTranslating(true);
    setTranslateError(null);
    updateEntryStatus(id, "translating");
    try {
      const result = await translateManuscript(id, translationPlan(translationType));
      if (request !== translationRequestRef.current) return;
      // The backend removed the old summary: it was made from the old translation
      updateEntry(id, {
        translation: toSavedTranslation(result),
        summary: null,
        status: "translated",
      });
      setIsTranslationOutdated(false);
    } catch (error) {
      if (request !== translationRequestRef.current) return;
      updateEntryStatus(id, statusBefore);
      setTranslateError(
        error instanceof Error ? error.message : "Could not translate the page. Please try again.",
      );
    } finally {
      if (request === translationRequestRef.current) setIsTranslating(false);
    }
  }

  // Summarizes the saved translation: the status shows "Summarizing", then "Summarized".
  // A failed summary keeps the old one (if any) and the old status.
  async function handleSummarize() {
    if (!entry || isSummarizing || isBusy) return;
    const id = entry.id;
    const statusBefore = entry.status;
    const request = ++summaryRequestRef.current;
    setActiveTab("summary");
    setIsSummarizing(true);
    setSummarizeError(null);
    updateEntryStatus(id, "summarizing");
    try {
      const text = await summarizeManuscript(id);
      if (request !== summaryRequestRef.current) return;
      updateEntry(id, { summary: text, status: "summarized" });
    } catch (error) {
      if (request !== summaryRequestRef.current) return;
      updateEntryStatus(id, statusBefore);
      setSummarizeError(
        error instanceof Error ? error.message : "Could not summarize the page. Please try again.",
      );
    } finally {
      if (request === summaryRequestRef.current) setIsSummarizing(false);
    }
  }

  // Forgets the translation and the summary, e.g. when the page is transcribed again
  function resetTranslation() {
    translationRequestRef.current++;
    summaryRequestRef.current++;
    setIsSummarizing(false);
    setSummarizeError(null);
    setIsTranslating(false);
    setTranslateError(null);
    setIsTranslationOutdated(false);
  }

  // Saves a corrected line through the backend. The workspace and the library show the
  // text only after the backend has stored it. Throws on failure, so the editor keeps
  // the entered text and shows the error.
  async function handleSaveLine(n: number, text: string) {
    if (!entry?.transcription) return;
    const id = entry.id;
    const saved = await saveLineCorrection(id, n - 1, text);
    updateEntryTranscription(
      id,
      entry.transcription.map((l) => (l.index === saved.index ? { ...l, text: saved.text } : l)),
    );
    updateEntryStatus(id, saved.status);
    if (translation) setIsTranslationOutdated(true);
  }

  // Runs the full pipeline in the backend: transcribe, translate sentence by sentence,
  // summarize. The library follows its progress and updates this page after each step.
  function handleRunAll() {
    if (!entry || isBusy) return;
    resetTranslation();
    setTranscribeError(null);
    setSelectedN(null);
    setActiveTab("transcription");
    runPipeline(entry.id);
  }

  // Go back to the empty state, so the user can pick a model and run it again
  function handleReTranscribe() {
    if (!entry) return;
    updateEntry(entry.id, {
      transcription: null,
      translation: null,
      summary: null,
      status: "uploaded",
    });
    setSelectedN(null);
    resetTranslation();
    setActiveTab("transcription");
  }

  const isTranscribed = entry ? hasTranscription(entry.status) : false;
  // A step runs (started here, or by the pipeline after the upload): wait for it
  const isBusy = entry ? isStepRunning(entry.status) : false;
  const showTranslating = isTranslating || entry?.status === "translating";
  const showSummarizing = isSummarizing || entry?.status === "summarizing";

  // The content of one text tab
  function renderTab(tab: WorkspaceTab) {
    if (!entry) return null;
    switch (tab) {
      case "transcription":
        return (
          <TranscriptionPanel
            status={entry.status}
            lines={lines}
            selectedN={selectedN}
            onSelectLine={setSelectedN}
            onSaveLine={handleSaveLine}
            onTranscribe={handleTranscribe}
            error={transcribeError}
          />
        );
      case "translation":
        return (
          <TranslationPanel
            isTranscribed={isTranscribed}
            translationType={translationType}
            onTranslationTypeChange={setTranslationType}
            translation={translation}
            isTranslating={showTranslating}
            error={translateError}
            isOutdated={isTranslationOutdated}
            onTranslate={() => void handleTranslate()}
          />
        );
      case "summary":
        return (
          <SummaryPanel
            isTranslated={translation !== null}
            summary={summary}
            isSummarizing={showSummarizing}
            error={summarizeError}
            onSummarize={() => void handleSummarize()}
          />
        );
    }
  }

  if (!entry && isLoading) {
    return (
      <div
        role="status"
        className="flex min-h-screen items-center justify-center gap-3 text-sm text-mt-text-muted"
      >
        <span
          className="h-5 w-5 animate-spin rounded-full border-2 border-mt-accent border-r-transparent"
          aria-hidden="true"
        />
        Loading manuscript…
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-12 text-center">
        <p className="text-lg font-semibold text-mt-text">Manuscript not found</p>
        <p className="text-sm text-mt-text-muted">
          This page may have been deleted or the link is invalid.
        </p>
        <Link
          href="/"
          className="text-sm font-medium text-mt-accent-text underline underline-offset-4"
        >
          ← Back to Library
        </Link>
      </div>
    );
  }

  return (
    // Fixed full-screen layer, so the workspace covers the dashboard sidebar
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-mt-bg">
      {/* Top bar: breadcrumb back to the library + status */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-mt-border bg-mt-surface px-4">
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-1.5 text-sm text-mt-text-subtle"
        >
          <Link href="/" className="hover:text-mt-text hover:underline">
            Library
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="max-w-[240px] truncate font-semibold text-mt-text">
            {entry.fileName}
          </span>
        </nav>
        <StatusBadge status={entry.status} />

        {/* Runs transcription, sentence-by-sentence translation and summary one after another */}
        <button
          type="button"
          onClick={handleRunAll}
          disabled={isBusy}
          title="Transcribe, translate sentence by sentence and summarize the page"
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-mt-md border border-mt-border-strong bg-mt-raised px-3.5 text-sm font-medium text-mt-text hover:bg-mt-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Workflow className="h-4 w-4" aria-hidden="true" />
          {isTranscribed ? "Run all steps again" : "Run all steps"}
        </button>

        {isTranscribed && (
          <button
            type="button"
            onClick={handleReTranscribe}
            disabled={isBusy}
            className="inline-flex h-9 items-center gap-1.5 rounded-mt-md border border-mt-border-strong bg-mt-raised px-3.5 text-sm font-medium text-mt-text hover:bg-mt-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ScanLine className="h-4 w-4" aria-hidden="true" />
            Re-transcribe
          </button>
        )}

        {isTranscribed && (
          <button
            type="button"
            onClick={() => void handleTranslate()}
            disabled={isTranslating || isBusy}
            className="inline-flex h-9 items-center gap-1.5 rounded-mt-md border border-mt-border-strong bg-mt-raised px-3.5 text-sm font-medium text-mt-text hover:bg-mt-hover disabled:cursor-wait disabled:opacity-60"
          >
            {showTranslating ? (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
                aria-hidden="true"
              />
            ) : (
              <Languages className="h-4 w-4" aria-hidden="true" />
            )}
            {showTranslating ? "Translating…" : "Translate"}
          </button>
        )}

        {/* Export is not implemented yet, so the button stays disabled */}
        <button
          type="button"
          disabled
          title="Available once the page is transcribed"
          className={`inline-flex h-9 items-center gap-1.5 rounded-mt-md bg-mt-accent px-3.5 text-sm font-medium text-mt-accent-fg disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Export
        </button>
      </header>

      {entry.pipelineError && !isBusy && (
        <div
          role="alert"
          className="flex shrink-0 items-center gap-2 border-b border-mt-border bg-mt-danger-bg px-4 py-2 text-sm text-mt-danger-fg"
        >
          <CircleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-semibold">The automatic pipeline stopped.</strong>{" "}
            {entry.pipelineError} The finished steps are saved; you can run the next one by hand.
          </span>
        </div>
      )}

      <div ref={splitRef} className="flex min-h-0 flex-1">
        {/* Left: the page image, or a narrow bar to show it again */}
        {isImageVisible ? (
          <section
            aria-label="Page image"
            style={{ flexBasis: `${imageShare * 100}%` }}
            className="flex min-w-0 shrink-0 grow-0 flex-col bg-mt-sunken"
          >
            <div className="flex h-10 shrink-0 items-center justify-between border-b border-mt-border bg-mt-sunken px-3">
              <span className="text-sm font-medium text-mt-text-muted">Image</span>
              <button
                type="button"
                onClick={() => setIsImageVisible(false)}
                className="inline-flex h-7 items-center gap-1.5 rounded-mt-md px-2 text-xs font-medium text-mt-text-muted hover:bg-mt-hover hover:text-mt-text"
              >
                <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
                Hide
              </button>
            </div>
            <ImageViewer
              src={entry.previewUrl}
              fileName={entry.fileName}
              isPdf={entry.fileType === "application/pdf"}
              lines={lines}
              selectedN={selectedN}
            />
          </section>
        ) : (
          <div className="flex w-10 shrink-0 flex-col items-center border-r border-mt-border bg-mt-sunken py-1.5">
            <button
              type="button"
              onClick={() => setIsImageVisible(true)}
              title="Show image"
              aria-label="Show image"
              className="inline-flex h-7 w-7 items-center justify-center rounded-mt-md text-mt-text-muted hover:bg-mt-hover hover:text-mt-text"
            >
              <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {isImageVisible && (
          <ResizeHandle
            label="Resize image and text"
            value={imageShare}
            onResize={(delta) =>
              setImageShare((share) =>
                Math.min(Math.max(share + delta, MIN_IMAGE_SHARE), MAX_IMAGE_SHARE),
              )
            }
            containerRef={splitRef}
          />
        )}

        {/* Right: the text views as tabs */}
        <section aria-label="Text" className="flex min-w-0 flex-1 flex-col bg-mt-surface">
          <WorkspaceTabs
            active={activeTab}
            onSelect={setActiveTab}
            isComparing={isComparing}
            onCompareChange={setIsComparing}
          />
          <div
            role="tabpanel"
            id={tabPanelId(activeTab)}
            aria-labelledby={tabId(activeTab)}
            className="flex min-h-0 flex-1"
          >
            {activeTab === "translation" && isComparing ? (
              <>
                <div className="flex min-w-0 flex-1 flex-col border-r border-mt-border">
                  {renderTab("transcription")}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">{renderTab("translation")}</div>
              </>
            ) : (
              <div className="flex min-w-0 flex-1 flex-col">{renderTab(activeTab)}</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
