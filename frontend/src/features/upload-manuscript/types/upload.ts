export type UploadErrorReason = "invalid-type" | "file-too-large";
export type UploadStatus = "uploading" | "uploaded" | "upload-failed";

export interface UploadError {
  fileName: string;
  reason: UploadErrorReason;
  message: string;
}

export interface LibraryEntry {
  id: string;
  fileName: string;
  previewUrl: string;
  status: UploadStatus;
}
