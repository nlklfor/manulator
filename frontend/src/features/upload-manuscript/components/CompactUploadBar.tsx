"use client";

import { useRef, useState, type DragEvent } from "react";
import { Upload } from "lucide-react";

interface CompactUploadBarProps {
  onFileSelected: (file: File) => void;
}

export function CompactUploadBar({ onFileSelected }: CompactUploadBarProps) {
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
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragActive(true);
      }}
      onDragLeave={() => setIsDragActive(false)}
      onDrop={handleDrop}
      className={`flex items-center gap-3 rounded-mt-md border border-dashed px-4 py-3 transition-colors ${
        isDragActive ? "border-mt-accent bg-mt-accent-soft" : "border-mt-border bg-mt-surface"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(event) => {
          handleFiles(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
      />

      <Upload className="h-4 w-4 shrink-0 text-mt-text-subtle" />

      <p className="text-sm text-mt-text">
        Drop page scans here, or{" "}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="font-medium text-mt-accent-text underline underline-offset-2 hover:text-mt-accent-hover"
        >
          browse files
        </button>
      </p>

      <span className="ml-auto shrink-0 text-xs text-mt-text-subtle">
        JPG or PNG · up to 20 MB per file
      </span>
    </div>
  );
}
