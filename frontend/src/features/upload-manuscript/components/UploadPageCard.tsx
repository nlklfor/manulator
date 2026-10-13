"use client";

import { useFileSelection } from "../hooks/useFileSelection";
import { UploadDropzone } from "./UploadDropzone";
import { CompactUploadBar } from "./CompactUploadBar";
import { ManuscriptLibrary } from "./ManuscriptLibrary";
import { useCallback, useState } from "react";
import { Toast } from "@/components/ui/Toast";

const STEPS = [
  { title: "Upload a scan", description: "One image per manuscript page." },
  { title: "Transcribe", description: "The HTR model reads it line by line." },
  { title: "Correct and export", description: "Fix uncertain words, then export TXT or PAGE XML." },
];

export function UploadPageCard() {
  const { libraryEntries, uploadError, selectFile, removeManuscript } = useFileSelection();
  const [toast, setToast] = useState<{ message: string; success: boolean } | null>(null);
  const hasEntries = libraryEntries.length > 0;

  function handleDeleted(id: string, success: boolean, message: string) {
    if (success) {
      // Remove the manuscript from the library if deletion was successful
      removeManuscript(id);
    }
    setToast({ message, success });
  }

  // Stable function, so the Toast timer is not restarted on every render
  const closeToast = useCallback(() => setToast(null), []);

  return (
    <div className="mx-auto w-full max-w-5xl">
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.success ? "success" : "error"}
          onClose={closeToast}
        />
      )}

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
            <ManuscriptLibrary entries={libraryEntries} onDeleted={handleDeleted} />
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
