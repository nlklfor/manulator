import { useCallback, useEffect, useRef, useState } from "react";
import { validateFile } from "./validateFile";
import type { LibraryEntry, UploadError } from "../types/upload";
import { uploadImage } from "../api/uploadImage";

const ERROR_DISPLAY_DURATION = 5000;

export function useFileSelection() {
  const [libraryEntries, setLibraryEntries] = useState<LibraryEntry[]>([]);
  const [uploadError, setUploadError] = useState<UploadError | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewUrlsRef = useRef(new Set<string>());

  // Auto-dismiss the error message after a certain duration
  useEffect(() => {
    if (!uploadError) return;

    dismissTimerRef.current = setTimeout(() => {
      setUploadError(null);
    }, ERROR_DISPLAY_DURATION);

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [uploadError]);

  // Clean up all object URLs when the component unmounts
  useEffect(() => {
    const previewUrls = previewUrlsRef.current;
    return () => {
      previewUrls.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
      previewUrls.clear();
    };
  }, []);

  const updateEntryStatus = useCallback((id: string, status: LibraryEntry["status"]) => {
    setLibraryEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, status } : entry)),
    );
  }, []);

  const selectFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);

      if (validationError) {
        setUploadError(validationError);
        return;
      }

      setUploadError(null);

      const id = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      previewUrlsRef.current.add(previewUrl);
      const newEntry: LibraryEntry = {
        id,
        fileName: file.name,
        previewUrl,
        status: "uploading",
      };

      setLibraryEntries((prev) => [newEntry, ...prev]);

      uploadImage(file)
        .then(() => updateEntryStatus(id, "uploaded"))
        .catch(() => updateEntryStatus(id, "upload-failed"));
    },
    [updateEntryStatus],
  );

  return { libraryEntries, uploadError, selectFile };
}
