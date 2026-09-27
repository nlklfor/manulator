import { useCallback, useEffect, useRef, useState } from "react";
import { validateFile } from "./validateFile";
import type { SelectedFile, UploadError } from "../types/upload";

const ERROR_DISPLAY_DURATION = 10000;

export function useFileSelection() {
    const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
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
    
    const selectFile = useCallback((file: File) => {
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
    }, []);

    return { selectedFile, uploadError, selectFile };
}