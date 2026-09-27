export type UploadErrorReason = "invalid-type" | "file-too-large";
export type UploadStatus = "idle" | "uploading" | "uploaded" | "upload-failed";

export interface UploadError {
  fileName: string;
  reason: UploadErrorReason;
  message: string;
}

export interface SelectedFile {
  file: File;
  previewUrl: string;
}
