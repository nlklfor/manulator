import { useCallback, useEffect, useRef, useState } from "react";
import { validateFile } from "./validateFile";
import type { LibraryEntry, TranscribedLine, UploadError } from "../types/upload";
import { uploadImage, type UploadDetails } from "../api/uploadImage";
import { getManuscripts } from "../api/getManuscripts";
import { updateManuscript } from "../api/updateManuscript";

const ERROR_DISPLAY_DURATION = 5000;

export function useFileSelection() {
  const [libraryEntries, setLibraryEntries] = useState<LibraryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<UploadError | null>(null);
  // File waiting for the user to confirm its name and document type
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewUrlsRef = useRef(new Set<string>());

  // Load the manuscripts the user has already uploaded
  useEffect(() => {
    let cancelled = false;

    getManuscripts()
      .then((manuscripts) => {
        if (cancelled) return;
        const loaded: LibraryEntry[] = manuscripts.map((manuscript) => ({
          id: manuscript.id,
          fileName: manuscript.title,
          documentType: manuscript.document_type,
          fileType: manuscript.content_type,
          previewUrl: manuscript.url,
          status: manuscript.status,
          transcription: manuscript.transcription,
        }));
        // Keep uploads started while the list was loading on top
        setLibraryEntries((prev) => [
          ...prev,
          ...loaded.filter((entry) => !prev.some((p) => p.id === entry.id)),
        ]);
        // The backend sends an empty url when it could not create the preview links
        if (loaded.some((entry) => !entry.previewUrl)) {
          setLoadError("Some previews could not be loaded. Please reload the page.");
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load your pages. Please reload the page.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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

  const updateEntryTranscription = useCallback(
    (id: string, transcription: TranscribedLine[] | null) => {
      setLibraryEntries((prev) =>
        prev.map((entry) => (entry.id === id ? { ...entry, transcription } : entry)),
      );
    },
    [],
  );

  const removeManuscript = useCallback((id: string) => {
    setLibraryEntries((prev) => {
      const manuscriptToRemove = prev.find((e) => e.id === id);
      if (manuscriptToRemove && previewUrlsRef.current.has(manuscriptToRemove.previewUrl)) {
        URL.revokeObjectURL(manuscriptToRemove.previewUrl);
        previewUrlsRef.current.delete(manuscriptToRemove.previewUrl);
      }
      return prev.filter((e) => e.id !== id);
    });
  }, []);

  // Saves a new name and document type, then shows them everywhere in the app.
  // Throws when the backend refuses, so the edit form can show an error.
  const editManuscript = useCallback(async (id: string, details: UploadDetails) => {
    const saved = await updateManuscript(id, details);
    setLibraryEntries((prev) =>
      prev.map((entry) =>
        entry.id === id
          ? { ...entry, fileName: saved.title, documentType: saved.document_type }
          : entry,
      ),
    );
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
        documentType: details.documentType,
        fileType: file.type,
        previewUrl,
        status: "uploading",
      };

      setLibraryEntries((prev) => [newEntry, ...prev]);

      uploadImage(file, details)
        .then((response) => {
          // The backend stores only the first page of a PDF, as an image. Show that image
          // instead of the local PDF, and drop the local preview link.
          const converted = file.type === "application/pdf";
          if (converted) {
            URL.revokeObjectURL(previewUrl);
            previewUrlsRef.current.delete(previewUrl);
          }
          // Switch to the server's manuscript id, so deleting it works
          setLibraryEntries((prev) =>
            prev.map((entry) =>
              entry.id === id
                ? {
                    ...entry,
                    id: response.id,
                    status: "uploaded",
                    ...(converted && {
                      fileType: response.content_type,
                      previewUrl: response.url,
                    }),
                  }
                : entry,
            ),
          );
        })
        .catch(() => updateEntryStatus(id, "upload-failed"));
    },
    [pendingFile, updateEntryStatus],
  );

  return {
    libraryEntries,
    isLoading,
    loadError,
    uploadError,
    pendingFile,
    selectFile,
    confirmUpload,
    cancelUpload,
    removeManuscript,
    editManuscript,
    updateEntryStatus,
    updateEntryTranscription,
  };
}
