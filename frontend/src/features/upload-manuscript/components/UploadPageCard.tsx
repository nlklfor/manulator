"use client";

import { useFileSelection } from "../hooks/useFileSelection";
import { UploadDropzone } from "./UploadDropzone";
import { CompactUploadBar } from "./CompactUploadBar";
import { ManuscriptLibrary } from "./ManuscriptLibrary";

const STEPS = [
  { title: "Upload a scan", description: "One image per manuscript page." },
  { title: "Transcribe", description: "The HTR model reads it line by line." },
  { title: "Correct and export", description: "Fix uncertain words, then export TXT or PAGE XML." },
];

export function UploadPageCard() {
  const { libraryEntries, uploadError, selectFile } = useFileSelection();
  const hasEntries = libraryEntries.length > 0;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="text-2xl font-semibold text-mt-text">All pages</h1>
      <p className="mt-1 text-sm text-mt-text-muted">
        {hasEntries
          ? `${libraryEntries.length} page${libraryEntries.length > 1 ? "s" : ""}`
          : "No pages yet"}
      </p>

      {uploadError && (
        <div className="mt-4 rounded-mt-md border border-mt-danger bg-mt-danger-bg px-4 py-3 text-sm text-mt-danger-fg">
          <span className="font-medium">Could not upload file: </span>
          {uploadError.message}
        </div>
      )}

      <div className="mt-6">
        {hasEntries ? (
          <div className="space-y-6">
            <CompactUploadBar onFileSelected={selectFile} />
            <ManuscriptLibrary entries={libraryEntries} />
          </div>
        ) : (
          <>
            <UploadDropzone onFileSelected={selectFile} />
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {STEPS.map((step, index) => (
                <div key={step.title} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-mt-border-strong text-xs font-medium text-mt-text-muted">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-mt-text">{step.title}</p>
                    <p className="text-sm text-mt-text-muted">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
