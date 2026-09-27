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
      className={`flex items-center gap-3 rounded-lg border border-dashed px-4 py-3 transition-colors ${
        isDragActive ? "border-blue-500 bg-blue-50" : "border-stone-300 bg-stone-50"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <Upload className="h-4 w-4 shrink-0 text-stone-400" />

      <p className="text-sm text-stone-700">
        Drop page scans here, or{" "}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="font-medium text-blue-700 underline underline-offset-2 hover:text-blue-800"
        >
          browse files
        </button>
      </p>

      <span className="ml-auto shrink-0 text-xs text-stone-500">
        JPG or PNG · up to 20 MB per file
      </span>
    </div>
  );
}
