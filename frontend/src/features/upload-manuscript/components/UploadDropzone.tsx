"use client";

import { useRef, useState, type DragEvent } from "react";
import type { SelectedFile } from "../types/upload";
import { FileUp, Upload } from "lucide-react";

interface UploadDropzoneProps {
  selectedFile: SelectedFile | null;
  onFileSelected: (file: File) => void;
}

export function UploadDropzone({ selectedFile, onFileSelected }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrop = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFileSelected(file);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(true);
    handleDrop(event.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragActive(true);
      }}
      onDragLeave={() => setIsDragActive(false)}
      onDrop={handleDragOver}
      className={`rounded-xl border border-dashed px-8 py-12 text-center transition-colors 
            ${isDragActive ? "border-blue-500 bg-blue-50" : "border-stone-300 bg-stone-50"}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg, image/png"
        className="hidden"
        onChange={(event) => handleDrop(event.target.files)}
      />

      {selectedFile ? (
        <div className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedFile.previewUrl}
            alt={selectedFile.file.name}
            className="h-32 w-auto rounded-md border border-stone-200 object-contain shadow-sm"
          />
          <p className="text-sm font-medium text-stone-800">{selectedFile.file.name}</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-sm text-blue-700 underline underline-offset-2 hover:text-blue-800"
          >
            Choose a different file
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-400">
            <FileUp className="h-6 w-6" strokeWidth={1.5} />
          </span>
          <div>
            <p className="text-base font-semibold text-stone-900">Add your first manuscript page</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-stone-600">
              Upload a scan of a page. manulator finds the lines of handwriting and transcribes
              them, so you can correct, search and export the text.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-md bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
            >
              <Upload className="h-4 w-4" />
              Upload page
            </button>
            <span className="text-sm text-stone-500">or drop files here</span>
          </div>

          <p className="text-xs text-stone-500">JPG or PNG · up to 20 MB per file</p>
        </div>
      )}
    </div>
  );
}
