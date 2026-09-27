"use client";

import { useRef, useState, type DragEvent } from "react";
import { FileUp, Upload } from "lucide-react";

interface UploadDropzoneProps {
  onFileSelected: (file: File) => void;
}

export function UploadDropzone({ onFileSelected }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFileSelected(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    handleFiles(event.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragActive(true);
      }}
      onDragLeave={() => setIsDragActive(false)}
      onDrop={handleDrop}
      className={`rounded-mt-lg border border-dashed px-8 py-12 text-center transition-colors 
        ${isDragActive ? "border-mt-accent bg-mt-accent-soft" : "border-mt-border bg-mt-surface"}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />

      <div className="flex flex-col items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-mt-md border border-mt-border bg-mt-raised text-mt-text-subtle">
          <FileUp className="h-6 w-6" strokeWidth={1.5} />
        </span>

        <div>
          <p className="text-base font-semibold text-mt-text">Add your first manuscript page</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-mt-text-muted">
            Upload a scan of a page. Manulator finds the lines of handwriting and transcribes them,
            so you can correct, search and export the text.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-mt-md bg-mt-accent px-4 py-2 text-sm font-medium text-mt-accent-fg hover:bg-mt-accent-hover"
          >
            <Upload className="h-4 w-4" />
            Upload page
          </button>
          <span className="text-sm text-mt-text-subtle">or drop files here</span>
        </div>

        <p className="text-xs text-mt-text-subtle">JPG or PNG · up to 20 MB per file</p>
      </div>
    </div>
  );
}
