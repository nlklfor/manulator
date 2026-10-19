import { useCallback, useEffect, useRef, useState } from "react";
import { validateFile } from "./validateFile";
import type { LibraryEntry, UploadError } from "../types/upload";
import { uploadImage, type UploadDetails } from "../api/uploadImage";

const ERROR_DISPLAY_DURATION = 5000;

export function useFileSelection() {
  const [libraryEntries, setLibraryEntries] = useState<LibraryEntry[]>([]);
  const [uploadError, setUploadError] = useState<UploadError | null>(null);
  // File waiting for the user to confirm its name and document type
  const [pendingFile, setPendingFile] = useState<File | null>(null);
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

  const removeManuscript = useCallback((id: string) => {
    setLibraryEntries((prev) => {
      const manuscriptToRemove = prev.find((e) => e.id === id);
      if (manuscriptToRemove) {
        URL.revokeObjectURL(manuscriptToRemove.previewUrl);
        previewUrlsRef.current.delete(manuscriptToRemove.previewUrl);
      }
      return prev.filter((e) => e.id !== id);
    });
  }, []);

  const selectFile = useCallback((file: File) => {
    const validationError = validateFile(file);

    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setUploadError(null);
    setPendingFile(file);
  }, []);

  const cancelUpload = useCallback(() => setPendingFile(null), []);

  const confirmUpload = useCallback(
    (details: UploadDetails) => {
      const file = pendingFile;
      if (!file) return;
      setPendingFile(null);

      const id = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      previewUrlsRef.current.add(previewUrl);
      const newEntry: LibraryEntry = {
        id,
        fileName: details.title,
        fileType: file.type,
        previewUrl,
        status: "uploading",
      };

      setLibraryEntries((prev) => [newEntry, ...prev]);

      uploadImage(file, details)
        .then((response) =>
          // Switch to the server's manuscript id, so deleting it works
          setLibraryEntries((prev) =>
            prev.map((entry) =>
              entry.id === id ? { ...entry, id: response.id, status: "uploaded" } : entry,
            ),
          ),
        )
        .catch(() => updateEntryStatus(id, "upload-failed"));
    },
    [pendingFile, updateEntryStatus],
  );

  return {
    libraryEntries,
    uploadError,
    pendingFile,
    selectFile,
    confirmUpload,
    cancelUpload,
    removeManuscript,
    updateEntryStatus,
  };
}
