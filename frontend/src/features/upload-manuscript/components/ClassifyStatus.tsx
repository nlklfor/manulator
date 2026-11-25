"use client";

// ClassifyStatus — shows what the classifier is doing in the upload and the edit form
// (reading the page, done, failed), with a "Classify again" button to ask once more.
import type { ReactNode } from "react";
import { AlertCircle, Loader2, RotateCw, Sparkles } from "lucide-react";
import type { ClassValues } from "./ClassFields";
import type { PageClasses } from "../api/classifyPage";

// idle = not asked yet (the edit form only asks when the user wants it)
export type Detection = "idle" | "detecting" | "done" | "failed";

const STATUS: Record<
  Exclude<Detection, "idle">,
  { icon: ReactNode; title: string; text: string; className: string }
> = {
  detecting: {
    icon: <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />,
    title: "Reading the page…",
    text: "The fields below fill in by themselves in a few seconds. You can already type.",
    className: "border-mt-accent/30 bg-mt-accent/10 text-mt-text",
  },
  done: {
    icon: <Sparkles className="h-4 w-4" aria-hidden="true" />,
    title: "Suggested from the page",
    text: "Please check them before saving.",
    className: "border-mt-border bg-mt-raised text-mt-text",
  },
  failed: {
    icon: <AlertCircle className="h-4 w-4" aria-hidden="true" />,
    title: "Could not detect the classes",
    text: "Please fill them in yourself, or try again.",
    className: "border-mt-danger/30 bg-mt-danger/10 text-mt-danger-fg",
  },
};

// The classifier's answer as form values ("" = unknown)
export function toClassValues(suggestion: PageClasses): ClassValues {
  return {
    documentType: suggestion.document_type || "",
    century: suggestion.century || "",
    script: suggestion.script || "",
    language: suggestion.language || "",
    region: suggestion.region || "",
  };
}

// The user asked for new answers, so they replace the fields;
// a field the classifier has no answer for keeps its value.
export function replaceWithAnswers(current: ClassValues, found: ClassValues): ClassValues {
  return {
    documentType: found.documentType || current.documentType,
    century: found.century || current.century,
    script: found.script || current.script,
    language: found.language || current.language,
    region: found.region || current.region,
  };
}

interface ClassifyStatusProps {
  detection: Detection;
  onClassifyAgain: () => void;
  disabled?: boolean;
}

export function ClassifyStatus({ detection, onClassifyAgain, disabled }: ClassifyStatusProps) {
  const button = detection !== "detecting" && (
    <button
      type="button"
      onClick={onClassifyAgain}
      disabled={disabled}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 self-center rounded-mt-md border border-mt-border-strong bg-mt-surface px-2.5 text-xs font-medium text-mt-text hover:bg-mt-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
      Classify again
    </button>
  );

  if (detection === "idle") {
    return (
      <div className="flex items-center justify-between gap-2.5 text-sm text-mt-text-muted">
        <span>Let the classifier read the page again and suggest the classes.</span>
        {button}
      </div>
    );
  }

  const status = STATUS[detection];
  return (
    <div
      role="status"
      className={`flex gap-2.5 rounded-mt-md border px-3 py-2.5 text-sm ${status.className}`}
    >
      <span className="mt-0.5 shrink-0">{status.icon}</span>
      <span className="min-w-0 flex-1">
        <strong className="block font-medium">{status.title}</strong>
        <span className="text-xs opacity-80">{status.text}</span>
      </span>
      {button}
    </div>
  );
}
