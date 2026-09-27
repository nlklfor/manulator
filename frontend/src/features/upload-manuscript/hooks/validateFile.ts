import type { UploadError} from "../types/upload";

const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png"];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export function validateFile(file: File): UploadError | null {
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        const ext = file.name.split('.').pop()?.toLowerCase() ?? "unkown";
        return {
            fileName: file.name,
            reason: "invalid-type",
            message: `${ext} files are not supported. Please upload a JPEG or PNG image.`,
        };
    }

    if (file.size > MAX_FILE_SIZE) {
        const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
        return {
            fileName: file.name,
            reason: "file-too-large",
            message: `The file size is ${sizeInMB} MB, which exceeds the 20 MB limit. Please upload a smaller file.`,
        };
    }

    return null;
}