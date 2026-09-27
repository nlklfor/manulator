import { useCallback, useEffect, useRef, useState } from "react";
import { validateFile } from "./validateFile";
import type { SelectedFile, UploadError, UploadStatus } from "../types/upload";
import { uploadImage } from "../api/uploadImage";

const ERROR_DISPLAY_DURATION = 5000;

export function useFileSelection() {
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadError, setUploadError] = useState<UploadError | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Clean up the object URL when the component unmounts or when a new file is selected
  useEffect(() => {
    return () => {
      if (selectedFile) URL.revokeObjectURL(selectedFile.previewUrl);
    };
  }, [selectedFile]);

  const startUpload = useCallback(async (file: File) => {
    setUploadStatus("uploading");
    try {
      await uploadImage(file);
      setUploadStatus("uploaded");
    } catch {
      setUploadStatus("upload-failed");
    }
  }, []);

  const selectFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);

      if (validationError) {
        setUploadError(validationError);
        return;
      }

      setUploadError(null);
      setSelectedFile((prev) => {
        if (prev) URL.revokeObjectURL(prev.previewUrl);
        return { file, previewUrl: URL.createObjectURL(file) };
      });

      void startUpload(file);
    },
    [startUpload],
  );

  return { selectedFile, uploadError, uploadStatus, selectFile };
}
