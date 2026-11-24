import type { UploadError } from "../types/upload";

// Any image (JPG, PNG, TIFF, WebP, BMP, JPEG 2000...) or a PDF. Images that browsers cannot
// show, such as TIFF, are converted to PNG by the backend; of a PDF only the first page is kept.
export const ACCEPTED_FILE_TYPES = ["image/*", "application/pdf", ".tif", ".tiff", ".jp2"];
export const ACCEPTED_FILE_HINT = "Images (JPG, PNG, TIFF…) or PDF · up to 20 MB per file";
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
// Some browsers send no type for these, so they are recognised by their extension
const IMAGE_EXTENSIONS = ["tif", "tiff", "jp2", "j2k", "jpf", "jpx", "bmp", "webp", "avif"];

export function isAcceptedFile(file: File): boolean {
  if (file.type.startsWith("image/") || file.type === "application/pdf") return true;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return file.type === "" && IMAGE_EXTENSIONS.includes(ext);
}

export function validateFile(file: File): UploadError | null {
  if (!isAcceptedFile(file)) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "unknown";
    return {
      fileName: file.name,
      reason: "invalid-type",
      message: `${ext} files are not supported. Please upload an image (JPG, PNG, TIFF…) or a PDF.`,
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
