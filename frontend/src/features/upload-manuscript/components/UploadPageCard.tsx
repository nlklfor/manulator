"use client";

import { useFileSelection } from "../hooks/useFileSelection";
import { UploadDropzone } from "./UploadDropzone";

const STEPS = [
  { title: "Upload a scan", description: "One image per manuscript page." },
  { title: "Transcribe", description: "The HTR model reads it line by line." },
  { title: "Correct and export", description: "Fix uncertain words, then export TXT or PAGE XML." },
];

export function UploadPageCard() {
  const { selectedFile, uploadError, uploadStatus, selectFile } = useFileSelection();

  return (
    <div className="mx-auto w-full max-w-2xl">
      {uploadError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span className="font-medium">Could not upload file: </span>
          {uploadError.message}
        </div>
      )}

      <UploadDropzone
        selectedFile={selectedFile}
        uploadStatus={uploadStatus}
        onFileSelected={selectFile}
      />

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <div key={step.title} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-stone-300 text-xs font-medium text-stone-600">
              {index + 1}
            </span>
            <div>
              <p className="text-sm font-semibold text-stone-900">{step.title}</p>
              <p className="text-sm text-stone-600">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
