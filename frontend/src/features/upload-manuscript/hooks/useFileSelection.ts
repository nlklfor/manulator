import { useCallback, useEffect, useRef, useState } from "react";
import { validateFile } from "./validateFile";
import type { LibraryEntry, TranscribedLine, UploadError } from "../types/upload";
import { uploadImage, type UploadDetails } from "../api/uploadImage";
import { getManuscripts } from "../api/getManuscripts";
import { updateManuscript } from "../api/updateManuscript";
import {
  getPipelineProgress,
  isStepRunning,
  startPipeline,
  type PipelineProgress,
} from "../api/pipeline";

const ERROR_DISPLAY_DURATION = 5000;
const PIPELINE_POLL_MS = 3000; // how often the pipeline's progress is checked

export function useFileSelection() {
  const [libraryEntries, setLibraryEntries] = useState<LibraryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<UploadError | null>(null);
  // File waiting for the user to confirm its name and document type
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewUrlsRef = useRef(new Set<string>());
  // Pages whose pipeline (transcribe → translate → summarize) runs in the backend
  const [followedIds, setFollowedIds] = useState<ReadonlySet<string>>(new Set());

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
          century: manuscript.century,
          script: manuscript.script,
          language: manuscript.language,
          region: manuscript.region,
          fileType: manuscript.content_type,
          previewUrl: manuscript.url,
          status: manuscript.status,
          transcription: manuscript.transcription,
          translation: manuscript.translation,
          summary: manuscript.summary,
        }));
        // Pipelines still running in the backend (e.g. after a reload): keep following them
        const running = loaded.filter((entry) => isStepRunning(entry.status));
        if (running.length > 0) {
          setFollowedIds((prev) => new Set([...prev, ...running.map((entry) => entry.id)]));
        }
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

  // Shows the pipeline's progress: its status and the results saved so far
  const applyProgress = useCallback((progress: PipelineProgress) => {
    setLibraryEntries((prev) =>
      prev.map((entry) =>
        entry.id === progress.manuscript_id
          ? {
              ...entry,
              status: progress.status,
              transcription: progress.transcription,
              translation: progress.translation,
              summary: progress.summary,
              pipelineError: progress.error,
            }
          : entry,
      ),
    );
    if (!isStepRunning(progress.status)) {
      setFollowedIds((prev) => {
        const next = new Set(prev);
        next.delete(progress.manuscript_id);
        return next;
      });
    }
  }, []);

  // While pipelines run, check their progress every few seconds
  useEffect(() => {
    if (followedIds.size === 0) return;
    const timer = setInterval(() => {
      followedIds.forEach((id) => {
        getPipelineProgress(id)
          .then(applyProgress)
          .catch(() => {}); // e.g. offline for a moment: try again at the next tick
      });
    }, PIPELINE_POLL_MS);
    return () => clearInterval(timer);
  }, [followedIds, applyProgress]);

  // Runs transcription, sentence-by-sentence translation and summary one after another
  const runPipeline = useCallback(
    (id: string) => {
      startPipeline(id)
        .then((progress) => {
          applyProgress(progress);
          setFollowedIds((prev) => new Set(prev).add(id));
        })
        .catch((error: Error) =>
          setLibraryEntries((prev) =>
            prev.map((entry) =>
              entry.id === id
                ? { ...entry, pipelineError: error.message || "Could not start the pipeline." }
                : entry,
            ),
          ),
        );
    },
    [applyProgress],
  );

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

  // Changes some fields of one page, e.g. its translation and summary
  const updateEntry = useCallback((id: string, changes: Partial<LibraryEntry>) => {
    setLibraryEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry)),
    );
  }, []);

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

  // Saves a new name, document type and classes, then shows them everywhere in the app.
  // Throws when the backend refuses, so the edit form can show an error.
  const editManuscript = useCallback(async (id: string, details: UploadDetails) => {
    const saved = await updateManuscript(id, details);
    setLibraryEntries((prev) =>
      prev.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              fileName: saved.title,
              documentType: saved.document_type,
              century: saved.century,
              script: saved.script,
              language: saved.language,
              region: saved.region,
            }
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

  // process = true: after the upload, also transcribe, translate and summarize the page
  const confirmUpload = useCallback(
    (details: UploadDetails, process = false) => {
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
        century: details.century || null,
        script: details.script || null,
        language: details.language || null,
        region: details.region || null,
        fileType: file.type,
        previewUrl,
        status: "uploading",
      };

      setLibraryEntries((prev) => [newEntry, ...prev]);

      uploadImage(file, details)
        .then((response) => {
          // The backend stores only the first page of a PDF, and images browsers cannot show
          // (e.g. TIFF), as PNG. Show the stored image instead, and drop the local preview link.
          const converted = response.content_type !== file.type;
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
          // If asked: transcribe, translate and summarize the page, one step after another
          if (process) runPipeline(response.id);
        })
        .catch(() => updateEntryStatus(id, "upload-failed"));
    },
    [pendingFile, updateEntryStatus, runPipeline],
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
    updateEntry,
    runPipeline,
  };
}
